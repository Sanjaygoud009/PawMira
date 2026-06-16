const User = require('../models/User');
const Report = require('../models/Report');
const LostPet = require('../models/LostPet');
const FoundPet = require('../models/FoundPet');
const Message = require('../models/Message');
const mongoose = require('mongoose');

// @desc    Get platform stats
// @route   GET /api/admin/stats
exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'volunteer', isVerified: true });
    const totalNGOs = await User.countDocuments({ role: 'ngo', isVerified: true });
    const activeRescues = await Report.countDocuments({ status: { $nin: ['safe', 'inactive'] }, is_deleted: false });
    const resolvedRescues = await Report.countDocuments({ status: 'safe', is_deleted: false });
    const totalLostFound = await LostPet.countDocuments({ is_deleted: false }) + await FoundPet.countDocuments({ is_deleted: false });

    res.json({
      totalUsers,
      totalNGOs,
      activeRescues,
      resolvedRescues,
      totalLostFound
    });
  } catch (error) {
    console.error(`[ADMIN_ERROR] getStats: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ isVerified: true }, '-password').sort({ created_at: -1 }).lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// @desc    Moderate (soft delete) a report
// @route   DELETE /api/admin/reports/:id
exports.moderateReport = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: 'Moderation reason is required' });

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.is_deleted = true;
    report.deleted_at = new Date();
    report.moderated_by = req.user._id;
    report.moderation_reason = reason;

    await report.save();
    
    // Also remove from Cloudinary if necessary, but cleanupService handles is_deleted = true after 15 days usually.
    // For moderation, keeping it soft deleted is safer for audit trail.

    res.json({ message: 'Report moderated successfully', report });
  } catch (error) {
    console.error(`[ADMIN_ERROR] moderateReport: ${error.message}`);
    res.status(500).json({ message: 'Failed to moderate report' });
  }
};

// @desc    Moderate (soft delete) a lost/found post
// @route   DELETE /api/admin/lost-found/:type/:id
exports.moderateLostFound = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: 'Moderation reason is required' });

    let Model;
    if (type === 'lost') Model = LostPet;
    else if (type === 'found') Model = FoundPet;
    else return res.status(400).json({ message: 'Invalid type' });

    const post = await Model.findById(id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.is_deleted = true;
    post.deleted_at = new Date();
    post.moderated_by = req.user._id;
    post.moderation_reason = reason;

    await post.save();
    res.json({ message: 'Post moderated successfully', post });
  } catch (error) {
    console.error(`[ADMIN_ERROR] moderateLostFound: ${error.message}`);
    res.status(500).json({ message: 'Failed to moderate post' });
  }
};

// @desc    Approve a found pet post
// @route   PUT /api/admin/found-pets/:id/approve
exports.approveFoundPet = async (req, res) => {
  try {
    const post = await FoundPet.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.verification_status = 'verified';
    await post.save();

    res.json({ message: 'Found Pet post approved successfully', post });
  } catch (error) {
    console.error(`[ADMIN_ERROR] approveFoundPet: ${error.message}`);
    res.status(500).json({ message: 'Failed to approve post' });
  }
};

// @desc    Get messages between Admin and specific user (NGO)
// @route   GET /api/admin/messages/:userId
exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: adminId, receiver: userId },
        { sender: userId, receiver: adminId }
      ]
    }).sort({ created_at: 1 });

    // Decrypt messages
    const decryptedMessages = messages.map(msg => {
      const doc = msg.toObject();
      doc.content = msg.getDecryptedContent();
      return doc;
    });

    res.json(decryptedMessages);
  } catch (error) {
    console.error(`[ADMIN_ERROR] getMessages: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

// @desc    Send a message
// @route   POST /api/admin/messages
exports.sendMessage = async (req, res) => {
  try {
    const { receiver_id, content } = req.body;
    if (!content) return res.status(400).json({ message: 'Content required' });

    let receiver = receiver_id;
    if (receiver_id === 'ALL') {
      receiver = null; // null signifies a broadcast message
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver,
      content
    });

    const doc = message.toObject();
    doc.content = content; 

    res.status(201).json(doc);
  } catch (error) {
    console.error(`[ADMIN_ERROR] sendMessage: ${error.message}`);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

// @desc    Edit a message sent by admin
// @route   PUT /api/admin/messages/:id
exports.editMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const messageId = req.params.id;

    if (!content) return res.status(400).json({ message: 'Content is required' });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this message' });
    }

    message.content = content; 
    message.is_edited = true;
    await message.save();

    const doc = message.toObject();
    doc.content = content;

    res.json(doc);
  } catch (error) {
    console.error(`[ADMIN_ERROR] editMessage: ${error.message}`);
    res.status(500).json({ message: 'Failed to edit message' });
  }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Prevent deleting admin
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin users' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(`[ADMIN_ERROR] deleteUser: ${error.message}`);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};
