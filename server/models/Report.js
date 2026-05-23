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
    enum: ['severe_injury', 'injured', 'starving', 'abandoned', 'stuck', 'other'],
    required: [true, 'Issue type is required'],
  },
  // Auto-calculated priority (Severity)
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'under_treatment', 'safe', 'inactive'],
    default: 'open',
  },
  primary_responder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  backup_responders: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  ],
  monitors: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  ],
  updates: [
    {
      update_type: {
        type: String,
        enum: ['rescue', 'treatment', 'safe', 'general'],
        default: 'general'
      },
      image_url: String,
      text: String,
      user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      created_at: {
        type: Date,
        default: Date.now
      }
    }
  ],
  community_flags: [
    {
      flag_type: {
        type: String,
        enum: ['still_needs_help', 'completed']
      },
      user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      created_at: {
        type: Date,
        default: Date.now
      }
    }
  ],
  last_activity_at: {
    type: Date,
    default: Date.now
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
  severe_injury: 'critical',
  injured: 'high',
  stuck: 'high',
  starving: 'medium',
  abandoned: 'low',
  other: 'low',
};

reportSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('issue_type')) {
    this.priority = PRIORITY_MAP[this.issue_type] || 'medium';
  }
  next();
});

module.exports = mongoose.model('Report', reportSchema);
