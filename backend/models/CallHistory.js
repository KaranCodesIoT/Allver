const mongoose = require('mongoose');

const callHistorySchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  callType: {
    type: String,
    enum: ['video', 'voice'],
    default: 'video'
  },
  status: {
    type: String,
    enum: ['completed', 'missed', 'declined', 'busy', 'unavailable'],
    default: 'missed'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  answeredAt: {
    type: Date,
    default: null
  },
  endedAt: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // in seconds
    default: 0
  }
}, { timestamps: true });

// Compound index for fetching call history between two users
callHistorySchema.index({ caller: 1, receiver: 1 });
callHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('CallHistory', callHistorySchema);
