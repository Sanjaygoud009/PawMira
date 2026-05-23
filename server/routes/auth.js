const express = require('express');
const router = express.Router();
const { register, verifyOtp, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);

module.exports = router;
