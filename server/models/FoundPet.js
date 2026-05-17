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
  created_at: {
    type: Date,
    default: Date.now,
  },
});

FoundPetSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('FoundPet', FoundPetSchema);
