const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { validateEmail } = require('../utils/emailValidator');

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

    // Validate email format and block disposable emails
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ message: emailCheck.reason });
    }

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

// @desc    Forgot Password (generate token & send email)
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Please provide your email address' });

    const user = await User.findOne({ email });
    if (!user) {
      // Return 200 even if user not found to prevent email enumeration
      return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token to save in DB for security
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"PawMira" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `🐾 Password Reset Request`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #FF6B35; text-align: center;">PawMira Password Reset</h2>
          <p>Hi ${user.name},</p>
          <p>You requested a password reset for your PawMira account. Please click the button below to choose a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #555;"><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          <p>Best,<br/>The PawMira Team</p>
        </div>
      `,
    });

    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error(`[AUTH_ERROR] forgotPassword: ${error.message}`);
    // If saving fails, clear fields
    if (req.body.email) {
      try {
        const user = await User.findOne({ email: req.body.email });
        if (user) {
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;
          await user.save({ validateBeforeSave: false });
        }
      } catch (err) {}
    }
    res.status(500).json({ message: 'Error sending email. Please try again later.' });
  }
};

// @desc    Reset Password (verify token & set new password)
// @route   PUT /api/auth/reset-password/:token
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    
    // Hash token from URL to compare with DB
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }

    // Update password and clear token fields
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password has been reset successfully. You can now login.' });
  } catch (error) {
    console.error(`[AUTH_ERROR] resetPassword: ${error.message}`);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

// @desc    Update user profile settings (Location)
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { service_area, city, state } = req.body;
    
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (service_area !== undefined) user.service_area = service_area;
    if (city !== undefined) user.city = city;
    if (state !== undefined) user.state = state;

    await user.save();
    res.status(200).json(user);
  } catch (error) {
    console.error(`[AUTH_ERROR] updateProfile: ${error.message}`);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};
