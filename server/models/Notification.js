const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['escalation', 'assigned', 'update', 'system', 'match'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  is_read: {
    type: Boolean,
    default: false,
  },
  reference_id: {
    type: mongoose.Schema.Types.ObjectId,
  },
  reference_model: {
    type: String,
    enum: ['Report', 'LostPet', 'FoundPet'],
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

notificationSchema.index({ user_id: 1, is_read: 1 });
notificationSchema.index({ created_at: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
