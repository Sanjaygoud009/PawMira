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
  reporter_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
        enum: ['still_needs_help', 'completed', 'fake', 'spam']
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
  confidence_level: {
    type: String,
    enum: ['unverified', 'community_verified', 'ngo_verified'],
    default: 'unverified',
  },
  resolved_by_name: {
    type: String,
  },
  resolved_by_role: {
    type: String, // e.g., 'Volunteer', 'NGO', 'Community Member'
  },
  resolution_image_url: {
    type: String,
  },
  is_archived: {
    type: Boolean,
    default: false,
  },
  // Soft delete
  is_deleted: {
    type: Boolean,
    default: false,
  },
  deleted_at: {
    type: Date,
  },
  moderated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  moderation_reason: {
    type: String,
    enum: ['spam', 'fake rescue', 'abuse', 'dangerous content', 'duplicate'],
  },
  escalation_level: {
    type: Number,
    default: 0,
  },
  escalated_at: {
    type: Date,
  },
  last_notification_at: {
    type: Date,
  },
  response_deadline: {
    type: Date,
  },
  timeline: [
    {
      event_type: String, // e.g., 'created', 'accepted', 'treated', 'safe', 'escalated'
      description: String,
      user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      created_at: {
        type: Date,
        default: Date.now,
      },
    }
  ],
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
reportSchema.index({ location: '2dsphere' });
reportSchema.index({ status: 1, is_deleted: 1, is_archived: 1 });
reportSchema.index({ priority: 1 });
reportSchema.index({ created_at: -1 });

module.exports = mongoose.model('Report', reportSchema);
