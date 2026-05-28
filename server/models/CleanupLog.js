const mongoose = require('mongoose');

const CleanupLogSchema = new mongoose.Schema({
  deleted_at: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    required: true, // e.g., '15_day_unresolved', '90_day_lost'
  },
  asset_id: {
    type: String, // Cloudinary ID deleted, if any
  },
  report_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  collection_name: {
    type: String,
    required: true, // e.g., 'Report', 'LostPet', 'FoundPet'
  }
});

module.exports = mongoose.model('CleanupLog', CleanupLogSchema);
