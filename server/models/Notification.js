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
  // Stable idempotency key for durable report-notification delivery. Legacy
  // notifications intentionally leave this unset.
  notification_event: {
    type: String,
    enum: ['initial_volunteer', 'escalation_ngo', 'escalation_admin'],
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

notificationSchema.index({ user_id: 1, is_read: 1 });
notificationSchema.index({ created_at: -1 });
// This partial index excludes legacy notifications, whose missing event key
// could otherwise make a new uniqueness constraint unsafe to build.
notificationSchema.index(
  { user_id: 1, reference_id: 1, reference_model: 1, notification_event: 1 },
  {
    unique: true,
    partialFilterExpression: {
      notification_event: { $exists: true },
      reference_id: { $exists: true },
    },
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
