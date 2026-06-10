const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .limit(50);
    
    res.status(200).json({
      success: true,
      data: notifications,
      unread_count: notifications.filter(n => !n.is_read).length
    });
  } catch (error) {
    console.error(`[NOTIFICATION_ERROR] get: ${error.message}`);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { is_read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error(`[NOTIFICATION_ERROR] markRead: ${error.message}`);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: req.user.id, is_read: false },
      { is_read: true }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(`[NOTIFICATION_ERROR] markAllRead: ${error.message}`);
    res.status(500).json({ message: 'Server Error' });
  }
};
