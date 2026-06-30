const mongoose = require('mongoose');

const DesignSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  overview: { type: String, default: '' },
  mainImage: { type: String, default: '' },
  images: [{ type: String }],
  designType: {
    type: String,
    enum: ['Apartment', 'Bedroom', 'Kitchen', 'Living Room', 'Villa', 'Office', 'Other'],
    default: 'Other'
  },
  priceRange: {
    type: String,
    enum: ['budget', 'mid', 'premium'],
    default: 'mid'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  likes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Design', DesignSchema);
