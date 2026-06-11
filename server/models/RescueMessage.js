const mongoose = require('mongoose');

const rescueMessageSchema = new mongoose.Schema({
  report_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Index for fast retrieval of messages per report
rescueMessageSchema.index({ report_id: 1, created_at: 1 });

module.exports = mongoose.model('RescueMessage', rescueMessageSchema);
