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
  created_at: {
    type: Date,
    default: Date.now,
  },
});

LostPetSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('LostPet', LostPetSchema);
