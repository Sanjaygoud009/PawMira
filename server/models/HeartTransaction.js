const mongoose = require('mongoose');

const heartTransactionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action_type: {
    type: String,
    enum: [
      'report_created',
      'report_active',
      'rescue_accepted',
      'proof_uploaded',
      'safe_marked',
      'pet_reunited',
      'admin_adjustment'
    ],
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },
  report_id: {
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

heartTransactionSchema.index({ user_id: 1, action_type: 1, report_id: 1 });

module.exports = mongoose.model('HeartTransaction', heartTransactionSchema);
