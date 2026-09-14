// backend/models/Rating.js
// Two-sided rating model (Customer <-> Worker) enforcing participant constraints and single-submission rules

const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    index: true
  },
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['CUSTOMER_TO_WORKER', 'WORKER_TO_CUSTOMER'],
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Guarantee that each user can rate a job only once per direction
ratingSchema.index({ jobId: 1, fromUserId: 1 }, { unique: true });
ratingSchema.index({ toUserId: 1, createdAt: -1 });

module.exports = mongoose.model('Rating', ratingSchema);
