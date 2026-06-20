const express = require('express');
const router = express.Router();
const { register, verifyOtp, login, getMe, forgotPassword, resetPassword, updateProfile, testEmail } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.get('/test-email', testEmail);
router.post('/register', authLimiter, register);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.post('/forgot-password', authLimiter, forgotPassword);
router.put('/reset-password/:token', authLimiter, resetPassword);
router.put('/profile', protect, updateProfile);

module.exports = router;
