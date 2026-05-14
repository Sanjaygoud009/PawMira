const mongoose = require('mongoose');

const whatsAppSessionSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  current_step: {
    type: String,
    enum: ['awaiting_image', 'awaiting_location', 'awaiting_description', 'confirming'],
    default: 'awaiting_image',
  },
  image_url: String,
  latitude: Number,
  longitude: Number,
  description: String,
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// TTL index — auto-expire sessions after 1 hour of inactivity
whatsAppSessionSchema.index({ updated_at: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('WhatsAppSession', whatsAppSessionSchema);
