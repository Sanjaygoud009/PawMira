const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter_name: {
    type: String,
    trim: true,
  },
  reporter_phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  image_url: {
    type: String,
  },
  description: {
    type: String,
    trim: true,
  },
  // GeoJSON location (2dsphere-ready)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Location coordinates are required'],
    },
  },
  address: {
    type: String,
    trim: true,
  },
  issue_type: {
    type: String,
    enum: ['injured', 'starving', 'abandoned', 'stuck', 'other'],
    required: [true, 'Issue type is required'],
  },
  // Auto-calculated priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'rescued'],
    default: 'pending',
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  source: {
    type: String,
    enum: ['web', 'whatsapp'],
    default: 'web',
  },
  // Status history tracking
  history: [
    {
      status: String,
      updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      updated_at: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  // Soft delete
  is_deleted: {
    type: Boolean,
    default: false,
  },
  deleted_at: {
    type: Date,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
reportSchema.index({ location: '2dsphere' });
reportSchema.index({ status: 1, is_deleted: 1 });
reportSchema.index({ priority: 1 });
reportSchema.index({ created_at: -1 });

// Priority auto-assignment based on issue type
const PRIORITY_MAP = {
  injured: 'high',
  stuck: 'high',
  starving: 'medium',
  abandoned: 'medium',
  other: 'low',
};

reportSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('issue_type')) {
    this.priority = PRIORITY_MAP[this.issue_type] || 'medium';
  }
  next();
});

module.exports = mongoose.model('Report', reportSchema);
