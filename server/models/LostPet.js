const mongoose = require('mongoose');

const LostPetSchema = new mongoose.Schema({
  pet_name: {
    type: String,
    required: true,
    trim: true,
  },
  animal_type: {
    type: String,
    required: true,
    enum: ['dog', 'cat', 'other'],
  },
  breed: {
    type: String,
    trim: true,
  },
  color: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  last_seen_at: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  contact_phone: {
    type: String,
    required: true,
  },
  image_url: {
    type: String,
  },
  status: {
    type: String,
    enum: ['searching', 'found', 'reunited'],
    default: 'searching',
  },
  area_name: {
    type: String, // E.g., 'Near Suncity' for privacy
  },
  reunited_image_url: {
    type: String,
  },
  is_archived: {
    type: Boolean,
    default: false,
  },
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
  created_at: {
    type: Date,
    default: Date.now,
  },
});

LostPetSchema.index({ location: '2dsphere' });
LostPetSchema.index({ status: 1, is_archived: 1 });

module.exports = mongoose.model('LostPet', LostPetSchema);
