const Report = require('../models/Report');
const User = require('../models/User');
const mongoose = require('mongoose');
const { awardHearts } = require('../utils/gamification');
const { validateAnimalImage } = require('../utils/imageValidator');
const cloudinary = require('../config/cloudinary');
const { parseReportsQuery } = require('../utils/reportQuery');
const { canManageReport } = require('../utils/reportAuthorization');

// @desc    Create a new report
// @route   POST /api/reports
exports.createReport = async (req, res) => {
  try {
    const { reporter_name, reporter_phone, description, latitude, longitude, address, issue_type, priority } = req.body;

    if (!reporter_phone || !latitude || !longitude || !issue_type) {
      return res.status(400).json({ message: 'Phone, location, and issue type are required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'An image of the animal is required' });
    }

    // AI Image Validation
    const validation = await validateAnimalImage(req.file.path);
    if (validation.serviceError) {
      if (req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
      }
      return res.status(503).json({
        message: 'AI image verification is temporarily unavailable. Please try again shortly.',
        code: 'AI_VALIDATION_UNAVAILABLE'
      });
    }

    if (!validation.isAnimal) {
      // Delete the non-animal image from Cloudinary
      if (req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
      }
      return res.status(400).json({ 
        message: 'Our AI could not detect an animal in this image.',
        code: 'AI_ANIMAL_NOT_DETECTED',
        reason: validation.reason 
      });
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
      response_deadline: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes deadline
      history: [{ status: 'open', updated_at: new Date() }],
      timeline: [{ event_type: 'created', description: 'Emergency reported by community.', created_at: new Date() }]
    };

    if (req.user) {
      reportData.reporter_id = req.user._id;
    }
    reportData.image_url = req.file.path;

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
    let query;
    try {
      query = parseReportsQuery(req.query);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const { status, priority, lat, lng, radius, page, limit, includeSafe } = query;
    const skip = (page - 1) * limit;
    const hasGeo = lat !== undefined && lng !== undefined;

    // 1. Build Base Query
    let baseQuery = { is_deleted: false };
    if (status) {
      baseQuery.status = status;
    } else if (!includeSafe) {
      baseQuery.status = { $ne: 'safe' }; // Hide safe reports from live feed by default
    }
    if (priority) {
      baseQuery.priority = priority;
    }

    let pipeline = [];

    // 2. Initial Stage (GeoNear or Match)
    if (hasGeo) {
      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          // Two 2dsphere indexes include location; specify the geo field so
          // MongoDB can select the intended index rather than rejecting $geoNear.
          key: 'location',
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
    const sortStage = hasGeo
      ? { priority_weight: -1, distance: 1 }
      : { priority_weight: -1, created_at: -1 };

    pipeline.push({ $sort: sortStage });

    // 5. Project only fields required by the feed. Timeline stays complete because
    // RescueCard uses it for progress and the active user's cancellation window.
    // History is only a legacy fallback in the UI, so retain its most recent entries.
    pipeline.push({
      $project: {
        _id: 1,
        reporter_id: 1,
        image_url: 1,
        description: 1,
        location: 1,
        address: 1,
        issue_type: 1,
        priority: 1,
        status: 1,
        primary_responder: 1,
        backup_responders: 1,
        monitors: 1,
        last_activity_at: 1,
        created_at: 1,
        history: { $slice: ['$history', -10] },
        timeline: 1,
        distance: 1 // populated by $geoNear when geo is used
      }
    });

    // 6. Pagination — skip then limit
    pipeline.push({ $skip: skip }, { $limit: limit });

    // 7. Populate responders (after pagination so lookup is over fewer docs)
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'primary_responder',
          foreignField: '_id',
          as: 'primary_responder_info',
          pipeline: [{ $project: { _id: 1, name: 1 } }] // only fetch needed fields
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
          as: 'backup_responders_info',
          pipeline: [{ $project: { _id: 1, name: 1 } }] // only fetch needed fields
        }
      }
    );

    const reports = await Report.aggregate(pipeline);

    // Format for frontend — attach flat lat/lng and resolved responder objects
    const transformed = reports.map((r) => ({
      _id: r._id,
      reporter_id: r.reporter_id,
      image_url: r.image_url,
      description: r.description,
      address: r.address,
      issue_type: r.issue_type,
      priority: r.priority,
      status: r.status,
      monitors: r.monitors || [],
      last_activity_at: r.last_activity_at,
      created_at: r.created_at,
      history: r.history || [],
      timeline: r.timeline || [],
      distance: r.distance,
      latitude: r.location?.coordinates?.[1],
      longitude: r.location?.coordinates?.[0],
      primary_responder: r.primary_responder_info
        ? { _id: r.primary_responder_info._id, name: r.primary_responder_info.name }
        : (r.primary_responder ? { _id: r.primary_responder } : null),
      backup_responders: r.backup_responders_info
        ? r.backup_responders_info.map(u => ({ _id: u._id, name: u.name }))
        : (r.backup_responders || [])
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

// @desc    Cancel response to a report
// @route   POST /api/reports/:id/cancel-response
exports.cancelResponse = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report || report.is_deleted) return res.status(404).json({ message: 'Report not found' });

    const userId = req.user._id.toString();
    const isPrimary = report.primary_responder && report.primary_responder.toString() === userId;
    const isBackup = report.backup_responders && report.backup_responders.some(id => id.toString() === userId);

    if (!isPrimary && !isBackup) {
      return res.status(400).json({ message: 'You are not responding to this rescue.' });
    }

    // Find latest accepted event by this user
    const userEvents = report.timeline.filter(e => 
      e.event_type === 'accepted' && 
      e.user_id && e.user_id.toString() === userId
    ).sort((a, b) => b.created_at - a.created_at);

    if (userEvents.length === 0) {
      return res.status(400).json({ message: 'Could not find your response record.' });
    }

    const lastAcceptedEvent = userEvents[0];
    const fiveMinutesInMs = 5 * 60 * 1000;
    
    if (Date.now() - new Date(lastAcceptedEvent.created_at).getTime() > fiveMinutesInMs) {
      return res.status(400).json({ message: 'You can only cancel your response within 5 minutes of accepting.' });
    }

    if (isPrimary) {
      // If primary is removed, promote first backup if available
      if (report.backup_responders && report.backup_responders.length > 0) {
        report.primary_responder = report.backup_responders.shift();
      } else {
        report.primary_responder = undefined;
        report.status = 'open'; // Revert to open if no responders
      }
    } else if (isBackup) {
      report.backup_responders = report.backup_responders.filter(id => id.toString() !== userId);
    }

    report.timeline.push({
      event_type: 'cancelled',
      description: 'A responder cancelled their response.',
      user_id: req.user._id,
      created_at: new Date()
    });

    report.history.push({ status: report.status, updated_by: req.user._id, updated_at: new Date() });
    report.last_activity_at = new Date();

    await report.save();

    const populatedReport = await Report.findById(report._id)
      .populate('primary_responder', 'name')
      .populate('backup_responders', 'name')
      .lean();

    res.json(populatedReport);
  } catch (error) {
    console.error(`[REPORT_ERROR] cancelResponse: ${error.message}`);
    res.status(500).json({ message: 'Failed to cancel response' });
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

// @desc    Update legacy report status directly (authorized users/admin)
// @route   PATCH /api/reports/:id
exports.updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid report ID format' });
    }

    const { status } = req.body;
    // 'safe' is intentionally excluded: it must only be reached through the
    // protected /resolve endpoint (POST /:id/resolve) which requires photo proof.
    const ALLOWED_STATUSES = new Set(['open', 'in_progress', 'under_treatment', 'inactive']);
    if (status && (typeof status !== 'string' || !ALLOWED_STATUSES.has(status))) {
      return res.status(400).json({ message: 'Invalid status value provided' });
    }

    const report = await Report.findById(id);
    if (!report || report.is_deleted) return res.status(404).json({ message: 'Report not found' });

    if (!canManageReport(report, req.user)) {
      return res.status(403).json({ message: 'Not authorized to update this report status' });
    }

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
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid report ID format' });
    }

    const { resolved_by_name, resolved_by_role } = req.body;
    const report = await Report.findById(id);
    if (!report || report.is_deleted) return res.status(404).json({ message: 'Report not found' });

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!canManageReport(report, req.user)) {
      return res.status(403).json({ message: 'Not authorized to resolve this report' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Resolution photo is required.' });
    }

    report.status = 'safe';
    report.is_archived = true;
    report.resolution_image_url = req.file.path;
    report.resolved_by_name = resolved_by_name || req.user.name || 'Community Hero';
    report.resolved_by_role = resolved_by_role || 'Community Member';
    
    // Add to timeline
    report.history.push({ 
      status: 'safe', 
      updated_by: req.user._id,
      updated_at: new Date() 
    });
    
    report.timeline.push({
      event_type: 'safe',
      description: 'Animal marked as safe and rescued!',
      user_id: req.user._id,
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

// @desc    Get public stats for homepage
// @route   GET /api/reports/stats
exports.getPublicStats = async (req, res) => {
  try {
    const dogsRescued = await Report.countDocuments({ status: 'safe', is_deleted: false });
    const activeCases = await Report.countDocuments({ status: { $ne: 'safe' }, is_deleted: false });
    const volunteers = await User.countDocuments({}); 

    res.json({
      dogsRescued: dogsRescued || 2, // Default fallback if 0
      volunteers: volunteers || 2,
      activeCases: activeCases || 0,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};
