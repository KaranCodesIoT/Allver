const mongoose = require('mongoose');

const projectBidSchema = new mongoose.Schema({
  contractRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ContractRequest', required: true },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cost: { type: String, required: true },        // e.g. "₹11.8L"
  costValue: { type: Number, default: 0 },        // numeric value for comparison e.g. 1180000
  duration: { type: String, required: true },      // e.g. "75 Days"
  durationDays: { type: Number, default: 0 },      // numeric days for comparison
  proposal: { type: String, default: '' },
  siteVisitRequired: { type: Boolean, default: false },
  portfolioAttachments: { type: [String], default: [] },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected'],
    default: 'Pending'
  },
  createdAt: { type: Date, default: Date.now }
});

// One professional can only bid once per contract request
projectBidSchema.index({ contractRequest: 1, professional: 1 }, { unique: true });

module.exports = mongoose.model('ProjectBid', projectBidSchema);
