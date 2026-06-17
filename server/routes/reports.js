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
  addCommunityFlag,
  resolveReport,
  getPublicStats,
  cancelResponse
} = require('../controllers/reportController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { reportLimiter } = require('../middleware/rateLimiter');

// Public — create report (with image upload)
router.post('/', optionalAuth, reportLimiter, upload.single('image'), createReport);

// Public — view reports (for the feed)
router.get('/', getReports);

// Public — get stats for homepage
router.get('/stats', getPublicStats);

// Admin only — view soft-deleted reports
router.get('/deleted', protect, authorize('admin'), getDeletedReports);

// Public/Protected — resolve emergency
// Note: Keeping it public/optional auth based on project setup for public reports
router.post('/:id/resolve', upload.single('image'), resolveReport);

// Protected — responder actions
router.post('/:id/respond', protect, respondToReport);
router.post('/:id/cancel-response', protect, cancelResponse);
router.post('/:id/update', protect, upload.single('image'), addReportUpdate);
router.post('/:id/monitor', protect, toggleMonitor);
router.post('/:id/flag', protect, addCommunityFlag);

// Protected — legacy update report status
router.patch('/:id', protect, updateReport);

// Admin only — soft delete
router.delete('/:id', protect, authorize('admin'), deleteReport);

module.exports = router;
