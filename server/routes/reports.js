const express = require('express');
const router = express.Router();
const {
  createReport,
  getReports,
  getDeletedReports,
  updateReport,
  deleteReport,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { reportLimiter } = require('../middleware/rateLimiter');

// Public — create report (with image upload)
router.post('/', reportLimiter, upload.single('image'), createReport);

// Protected — view reports
router.get('/', protect, getReports);

// Admin only — view soft-deleted reports
router.get('/deleted', protect, authorize('admin'), getDeletedReports);

// Protected — update report status/assignment
router.patch('/:id', protect, updateReport);

// Admin only — soft delete
router.delete('/:id', protect, authorize('admin'), deleteReport);

module.exports = router;
