const Report = require('../models/Report');

// @desc    Create a new report
// @route   POST /api/reports
exports.createReport = async (req, res) => {
  try {
    const { reporter_name, reporter_phone, description, latitude, longitude, address, issue_type } = req.body;

    if (!reporter_phone || !latitude || !longitude || !issue_type) {
      return res.status(400).json({ message: 'Phone, location, and issue type are required' });
    }

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
      source: 'web',
      history: [{ status: 'pending', updated_at: new Date() }],
    };

    // Attach image URL if uploaded
    if (req.file) {
      reportData.image_url = req.file.path;
    }

    const report = await Report.create(reportData);

    console.log(`[REPORT_CREATED] id=${report._id} phone=${reporter_phone} issue=${issue_type} priority=${report.priority} source=web`);

    res.status(201).json(report);
  } catch (error) {
    console.error(`[REPORT_ERROR] create: ${error.message}`);
    res.status(500).json({ message: 'Failed to create report' });
  }
};

// @desc    Get all reports (non-deleted)
// @route   GET /api/reports
exports.getReports = async (req, res) => {
  try {
    const { status, priority, sort } = req.query;

    const filter = { is_deleted: false };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    let sortOption = { created_at: -1 }; // Default: newest first
    if (sort === 'priority') {
      sortOption = { priority: -1, created_at: -1 };
    } else if (sort === 'oldest') {
      sortOption = { created_at: 1 };
    }

    const reports = await Report.find(filter)
      .sort(sortOption)
      .populate('assigned_to', 'name email')
      .lean();

    // Transform GeoJSON coordinates to flat lat/lng for frontend
    const transformed = reports.map((r) => ({
      ...r,
      latitude: r.location?.coordinates?.[1],
      longitude: r.location?.coordinates?.[0],
    }));

    res.json(transformed);
  } catch (error) {
    console.error(`[REPORT_ERROR] getReports: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
};

// @desc    Get soft-deleted reports (admin only)
// @route   GET /api/reports/deleted
exports.getDeletedReports = async (req, res) => {
  try {
    const reports = await Report.find({ is_deleted: true })
      .sort({ deleted_at: -1 })
      .lean();

    res.json(reports);
  } catch (error) {
    console.error(`[REPORT_ERROR] getDeleted: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch deleted reports' });
  }
};

// @desc    Update report (status, assignment)
// @route   PATCH /api/reports/:id
exports.updateReport = async (req, res) => {
  try {
    const { status, assigned_to } = req.body;
    const report = await Report.findOne({ _id: req.params.id, is_deleted: false });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const previousStatus = report.status;

    if (status) {
      report.status = status;
      report.history.push({
        status,
        updated_by: req.user._id,
        updated_at: new Date(),
      });
      console.log(`[STATUS_UPDATED] id=${report._id} from=${previousStatus} to=${status} by=${req.user._id}`);
    }

    if (assigned_to) {
      report.assigned_to = assigned_to;
      console.log(`[VOLUNTEER_ASSIGNED] id=${report._id} volunteer=${assigned_to}`);
    }

    await report.save();
    res.json(report);
  } catch (error) {
    console.error(`[REPORT_ERROR] update: ${error.message}`);
    res.status(500).json({ message: 'Failed to update report' });
  }
};

// @desc    Soft delete a report (admin only)
// @route   DELETE /api/reports/:id
exports.deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.is_deleted = true;
    report.deleted_at = new Date();
    await report.save();

    console.log(`[REPORT_SOFT_DELETED] id=${report._id} by=${req.user._id}`);

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error(`[REPORT_ERROR] delete: ${error.message}`);
    res.status(500).json({ message: 'Failed to delete report' });
  }
};
