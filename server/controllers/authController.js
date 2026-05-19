const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// Create transporter using Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Register a new user (sends OTP)
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    let user = await User.findOne({ email });

    if (user) {
      if (user.isVerified) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }
      // If user exists but unverified, we can just update their info and resend OTP
      user.name = name;
      user.password = password;
      user.role = ['volunteer', 'ngo'].includes(role) ? role : 'volunteer';
    } else {
      user = new User({
        name,
        email,
        password,
        role: ['volunteer', 'ngo'].includes(role) ? role : 'volunteer',
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send email
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"PawMira" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `🐾 Verify Your PawMira Account`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #FF6B35; text-align: center;">Welcome to PawMira!</h2>
          <p>Hi ${name},</p>
          <p>Thank you for signing up as a ${user.role}. To complete your registration, please use the following One-Time Password (OTP):</p>
          <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #333; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best,<br/>The PawMira Team</p>
        </div>
      `,
    });

    res.status(200).json({ message: 'OTP sent to email. Please verify.' });
  } catch (error) {
    console.error(`[AUTH_ERROR] register: ${error.message}`);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Verify OTP and finalize registration
// @route   POST /api/auth/verify-otp
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.isVerified) {
      return res.status(400).json({ message: 'User is already verified' });
    }

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken(user._id);

    console.log(`[USER_VERIFIED] id=${user._id} email=${email} role=${user.role}`);

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error(`[AUTH_ERROR] verifyOtp: ${error.message}`);
    res.status(500).json({ message: 'Server error during verification' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.isVerified === false) {
      return res.status(403).json({ message: 'Please verify your email before logging in. Try registering again to get a new OTP.' });
    }

    const token = generateToken(user._id);

    console.log(`[USER_LOGIN] id=${user._id} email=${email} role=${user.role}`);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error(`[AUTH_ERROR] login: ${error.message}`);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json(req.user);
};
