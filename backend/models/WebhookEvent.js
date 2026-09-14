// backend/models/WebhookEvent.js
// Idempotent audit record for payment gateway webhooks

const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  gateway: {
    type: String,
    enum: ['razorpay', 'mock'],
    required: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED'],
    default: 'RECEIVED',
    index: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  processedAt: {
    type: Date,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
