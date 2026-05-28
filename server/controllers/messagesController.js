const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Get messages for the logged-in user (including broadcasts)
// @route   GET /api/messages
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch messages where user is sender or receiver, OR receiver is null (Broadcast)
    const messages = await Message.find({
      $or: [
        { sender: userId },
        { receiver: userId },
        { receiver: null }
      ]
    }).sort({ created_at: 1 });

    const decryptedMessages = messages.map(msg => {
      const doc = msg.toObject();
      doc.content = msg.getDecryptedContent();
      return doc;
    });

    res.json(decryptedMessages);
  } catch (error) {
    console.error(`[MESSAGE_ERROR] getMessages: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

// @desc    Send a message to Admin
// @route   POST /api/messages
exports.sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Content is required' });

    // Find an admin user to set as receiver
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) return res.status(404).json({ message: 'No admin found to receive message' });

    const message = await Message.create({
      sender: req.user._id,
      receiver: admin._id,
      content
    });

    const doc = message.toObject();
    doc.content = content;

    res.status(201).json(doc);
  } catch (error) {
    console.error(`[MESSAGE_ERROR] sendMessage: ${error.message}`);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

// @desc    Edit a message
// @route   PUT /api/messages/:id
exports.editMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const messageId = req.params.id;

    if (!content) return res.status(400).json({ message: 'Content is required' });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    // Check ownership
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this message' });
    }

    message.content = content; // Will be re-encrypted by pre-save hook
    message.is_edited = true;
    await message.save();

    const doc = message.toObject();
    doc.content = content;

    res.json(doc);
  } catch (error) {
    console.error(`[MESSAGE_ERROR] editMessage: ${error.message}`);
    res.status(500).json({ message: 'Failed to edit message' });
  }
};
