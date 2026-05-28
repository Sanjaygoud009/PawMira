const mongoose = require('mongoose');

const FoundPetSchema = new mongoose.Schema({
  animal_type: {
    type: String,
    required: true,
    enum: ['dog', 'cat', 'other'],
  },
  breed: {
    type: String,
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
  found_at: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  finder_contact: {
    type: String,
    required: true,
  },
  image_url: {
    type: String,
    required: true, // Assuming finding a pet requires an image to identify
  },
  status: {
    type: String,
    enum: ['active', 'matched', 'resolved'],
    default: 'active',
  },
  verification_status: {
    type: String,
    enum: ['pending', 'verified'],
    default: 'pending',
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

FoundPetSchema.index({ location: '2dsphere' });
FoundPetSchema.index({ status: 1, is_archived: 1 });

module.exports = mongoose.model('FoundPet', FoundPetSchema);
