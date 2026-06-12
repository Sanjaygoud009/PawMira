const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getStats,
  getUsers,
  moderateReport,
  moderateLostFound,
  approveFoundPet,
  getMessages,
  sendMessage,
  editMessage,
  deleteUser
} = require('../controllers/adminController');

// All routes require authentication and 'admin' role
router.use(protect);
router.use(authorize('admin'));

// Dashboard Stats
router.get('/stats', getStats);

// User Management
router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);

// Moderation
router.delete('/reports/:id', moderateReport);
router.delete('/lost-found/:type/:id', moderateLostFound);
router.put('/found-pets/:id/approve', approveFoundPet);

// Admin-NGO Messaging
router.get('/messages/:userId', getMessages);
router.post('/messages', sendMessage);
router.put('/messages/:id', editMessage);

module.exports = router;
