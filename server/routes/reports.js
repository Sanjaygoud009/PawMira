const express = require('express');
const router = express.Router();
const {
  createReport,
  getReports,
  getDeletedReports,
  updateReport,
  deleteReport,
  respondToReport,
  addReportUpdate,
  toggleMonitor,
  addCommunityFlag
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { reportLimiter } = require('../middleware/rateLimiter');

// Public — create report (with image upload)
router.post('/', reportLimiter, upload.single('image'), createReport);

// Public — view reports (for the feed)
router.get('/', getReports);

// Admin only — view soft-deleted reports
router.get('/deleted', protect, authorize('admin'), getDeletedReports);

// Protected — responder actions
router.post('/:id/respond', protect, respondToReport);
router.post('/:id/update', protect, upload.single('image'), addReportUpdate);
router.post('/:id/monitor', protect, toggleMonitor);
router.post('/:id/flag', protect, addCommunityFlag);

// Protected — legacy update report status
router.patch('/:id', protect, updateReport);

// Admin only — soft delete
router.delete('/:id', protect, authorize('admin'), deleteReport);

module.exports = router;
