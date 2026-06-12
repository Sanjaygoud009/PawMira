const Report = require('../models/Report');
const mongoose = require('mongoose');
const { awardHearts } = require('../utils/gamification');

// @desc    Create a new report
// @route   POST /api/reports
exports.createReport = async (req, res) => {
  try {
    const { reporter_name, reporter_phone, description, latitude, longitude, address, issue_type, priority } = req.body;

    if (!reporter_phone || !latitude || !longitude || !issue_type) {
      return res.status(400).json({ message: 'Phone, location, and issue type are required' });
    }

    const PRIORITY_MAP = {
      severe_injury: 'critical',
      injured: 'high',
      stuck: 'high',
      starving: 'medium',
      abandoned: 'low',
      other: 'low',
    };
    const allowedPriorities = new Set(['low', 'medium', 'high', 'critical']);

    const calculatedPriority = allowedPriorities.has(priority) ? priority : PRIORITY_MAP[issue_type] || 'medium';

    const reportData = {
      reporter_name: reporter_name || 'Anonymous',
      reporter_phone,
      description,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      address,
      issue_type,
      priority: calculatedPriority,
      source: 'web',
      response_deadline: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes deadline
      history: [{ status: 'open', updated_at: new Date() }],
      timeline: [{ event_type: 'created', description: 'Emergency reported by community.', created_at: new Date() }]
    };

    if (req.user) {
      reportData.reporter_id = req.user._id;
    }

    if (req.file) {
      reportData.image_url = req.file.path;
    }

    const report = await Report.create(reportData);

    if (req.user) {
      await awardHearts({ userId: req.user._id, actionType: 'report_created', points: 1, reportId: report._id });
    }

    console.log(`[REPORT_CREATED] id=${report._id} phone=${reporter_phone} issue=${issue_type} priority=${report.priority}`);
    res.status(201).json(report);
  } catch (error) {
    console.error(`[REPORT_ERROR] create: ${error.message}`);
    res.status(500).json({ message: 'Failed to create report' });
  }
};

// @desc    Get all reports (with Geo sorting & Severity sorting)
// @route   GET /api/reports
exports.getReports = async (req, res) => {
  try {
    const { status, priority, lat, lng, radius = 50000 } = req.query; // Default 50km
    
    let pipeline = [];

    // 1. Build Base Query
    let baseQuery = { is_deleted: false };
    if (status) {
      baseQuery.status = status;
    } else {
      baseQuery.status = { $ne: 'safe' }; // Hide safe reports from live feed
    }
    if (priority) baseQuery.priority = priority;

    // 2. Initial Stage (GeoNear or Match)
    if (lat && lng) {
      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: 'distance',
          maxDistance: parseInt(radius),
          spherical: true,
          query: baseQuery
        }
      });
    } else {
      pipeline.push({ $match: baseQuery });
    }

    // 3. Add priority weight for sorting
    pipeline.push({
      $addFields: {
        priority_weight: {
          $switch: {
            branches: [
              { case: { $eq: ['$priority', 'critical'] }, then: 4 },
              { case: { $eq: ['$priority', 'high'] }, then: 3 },
              { case: { $eq: ['$priority', 'medium'] }, then: 2 },
              { case: { $eq: ['$priority', 'low'] }, then: 1 }
            ],
            default: 0
          }
        }
      }
    });

    // 4. Sort: Severity first, then distance (if geo), else created_at
    const sortStage = lat && lng 
      ? { priority_weight: -1, distance: 1 }
      : { priority_weight: -1, created_at: -1 };
    
    pipeline.push({ $sort: sortStage });

    // 5. Populate users
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'primary_responder',
          foreignField: '_id',
          as: 'primary_responder_info'
        }
      },
      {
        $unwind: { path: '$primary_responder_info', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'backup_responders',
          foreignField: '_id',
          as: 'backup_responders_info'
        }
      }
    );

    const reports = await Report.aggregate(pipeline);

    // Format for frontend
    const transformed = reports.map((r) => ({
      ...r,
      latitude: r.location?.coordinates?.[1],
      longitude: r.location?.coordinates?.[0],
      primary_responder: r.primary_responder_info ? {
        _id: r.primary_responder_info._id,
        name: r.primary_responder_info.name
      } : (r.primary_responder ? { _id: r.primary_responder } : null),
      backup_responders: r.backup_responders_info ? r.backup_responders_info.map(u => ({
        _id: u._id,
        name: u.name
      })) : (r.backup_responders || [])
    }));

    res.json(transformed);
  } catch (error) {
    console.error(`[REPORT_ERROR] getReports: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
};

// @desc    Respond to a report (Become primary or backup)
// @route   POST /api/reports/:id/respond
exports.respondToReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report || report.is_deleted) return res.status(404).json({ message: 'Report not found' });

    const userId = req.user._id;

    // Calculate current responders count
    const hasPrimary = !!report.primary_responder;
    const backupCount = report.backup_responders ? report.backup_responders.length : 0;
    const totalResponders = (hasPrimary ? 1 : 0) + backupCount;

    // Check if current user is already responding
    const isAlreadyPrimary = hasPrimary && report.primary_responder.toString() === userId.toString();
    const isAlreadyBackup = report.backup_responders && report.backup_responders.some(id => id.toString() === userId.toString());

    if (isAlreadyPrimary || isAlreadyBackup) {
      return res.status(400).json({ message: 'You are already responding to this rescue.' });
    }

    if (!hasPrimary) {
      report.primary_responder = userId;
      report.status = 'in_progress';
      
      // Award points
      await awardHearts({ userId: userId, actionType: 'rescue_accepted', points: 3, reportId: report._id });
      if (report.reporter_id) {
        await awardHearts({ userId: report.reporter_id, actionType: 'report_active', points: 2, reportId: report._id });
      }
    } else {
      if (totalResponders >= 3) {
        return res.status(400).json({ message: 'This rescue already has the maximum of 3 responders.' });
      }
      report.backup_responders.push(userId);
    }

    report.last_activity_at = new Date();
    report.history.push({ status: report.status, updated_by: userId, updated_at: new Date() });
    
    report.timeline.push({
      event_type: 'accepted',
      description: 'A responder has accepted this rescue request.',
      user_id: userId,
      created_at: new Date()
    });
    
    await report.save();
    
    // Populate user info before returning to match getReports format
    const populatedReport = await Report.findById(report._id)
      .populate('primary_responder', 'name')
      .populate('backup_responders', 'name')
      .lean();
      
    res.json(populatedReport);
  } catch (error) {
    res.status(500).json({ message: 'Failed to respond to report' });
  }
};

// @desc    Upload proof / update report
// @route   POST /api/reports/:id/update
exports.addReportUpdate = async (req, res) => {
  try {
    const { update_type, text } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report || report.is_deleted) return res.status(404).json({ message: 'Report not found' });

    const newUpdate = {
      update_type: update_type || 'general',
      text,
      user_id: req.user._id,
      created_at: new Date()
    };

    if (req.file) {
      newUpdate.image_url = req.file.path;
    }

    report.updates.push(newUpdate);
    report.last_activity_at = new Date();

    if (update_type === 'treatment') report.status = 'under_treatment';
    if (update_type === 'safe') report.status = 'safe';

    report.timeline.push({
      event_type: update_type || 'update',
      description: text,
      user_id: req.user._id,
      created_at: new Date()
    });

    await report.save();
    
    // Award 5 hearts for providing a proof/update
    await awardHearts({ userId: req.user._id, actionType: 'proof_uploaded', points: 5, reportId: report._id });
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add update' });
  }
};

// @desc    Toggle monitoring a rescue
// @route   POST /api/reports/:id/monitor
exports.toggleMonitor = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report || report.is_deleted) return res.status(404).json({ message: 'Report not found' });

    const userId = req.user._id;
    const index = report.monitors.indexOf(userId);

    if (index === -1) {
      report.monitors.push(userId);
    } else {
      report.monitors.splice(index, 1);
    }

    await report.save();
    res.json({ monitors: report.monitors });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle monitor' });
  }
};

// @desc    Add community flag
// @route   POST /api/reports/:id/flag
exports.addCommunityFlag = async (req, res) => {
  try {
    const { flag_type } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report || report.is_deleted) return res.status(404).json({ message: 'Report not found' });

    report.community_flags.push({
      flag_type,
      user_id: req.user._id,
      created_at: new Date()
    });
    
    report.last_activity_at = new Date();
    await report.save();
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Failed to flag report' });
  }
};

// @desc    Update legacy report status directly (for admins or dashboard)
// @route   PATCH /api/reports/:id
exports.updateReport = async (req, res) => {
  try {
    const { status } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    if (status) {
      report.status = status;
      report.history.push({ status, updated_by: req.user._id, updated_at: new Date() });
    }
    
    await report.save();
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update report' });
  }
};

exports.getDeletedReports = async (req, res) => {
  res.json(await Report.find({ is_deleted: true }).sort({ deleted_at: -1 }).lean());
};

// @desc    Resolve an emergency (Mark as safe with photo confirmation)
// @route   POST /api/reports/:id/resolve
exports.resolveReport = async (req, res) => {
  try {
    const { resolved_by_name, resolved_by_role } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report || report.is_deleted) return res.status(404).json({ message: 'Report not found' });

    if (!req.file) {
      return res.status(400).json({ message: 'Resolution photo is required.' });
    }

    report.status = 'safe';
    report.is_archived = true;
    report.resolution_image_url = req.file.path;
    report.resolved_by_name = resolved_by_name || 'Community Hero';
    report.resolved_by_role = resolved_by_role || 'Community Member';
    
    // Add to timeline
    report.history.push({ 
      status: 'safe', 
      updated_by: req.user ? req.user._id : null, 
      updated_at: new Date() 
    });
    
    report.timeline.push({
      event_type: 'safe',
      description: 'Animal marked as safe and rescued!',
      user_id: req.user ? req.user._id : null,
      created_at: new Date()
    });
    
    report.last_activity_at = new Date();

    await report.save();

    if (req.user) {
      await awardHearts({ userId: req.user._id, actionType: 'safe_marked', points: 10, reportId: report._id });
    }

    res.json(report);
  } catch (error) {
    console.error(`[REPORT_ERROR] resolveReport: ${error.message}`);
    res.status(500).json({ message: 'Failed to resolve report' });
  }
};

exports.deleteReport = async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ message: 'Report not found' });
  report.is_deleted = true;
  report.deleted_at = new Date();
  await report.save();
  res.json({ message: 'Deleted' });
};
