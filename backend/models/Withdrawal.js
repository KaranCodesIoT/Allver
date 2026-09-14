// backend/models/Withdrawal.js
// Authoritative Worker Withdrawal & Payout Model

const mongoose = require('mongoose');

const VALID_WITHDRAWAL_STATUSES = [
  'REQUESTED',
  'PROCESSING',
  'PAID',
  'FAILED',
  'CANCELLED'
];

const withdrawalSchema = new mongoose.Schema({
  labourId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  amount: {
    type: Number,
    required: true
  }, // in Rupees
  amountInPaise: {
    type: Number,
    required: true,
    min: 1
  }, // in Integer Paise
  status: { 
    type: String, 
    enum: VALID_WITHDRAWAL_STATUSES, 
    default: 'REQUESTED',
    index: true 
  },
  bankName: {
    type: String,
    required: true
  },
  accountLast4: {
    type: String,
    required: true
  },
  ledgerTransactionId: {
    type: String,
    default: null,
    index: true
  }, // Links to Ledger postingId
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  payoutProvider: {
    type: String,
    default: 'mock'
  },
  payoutProviderRef: {
    type: String,
    default: null,
    index: true
  }, // e.g. RazorpayX Payout ID
  utrNumber: {
    type: String,
    default: null,
    index: true
  }, // Bank UTR reference
  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  failedAt: {
    type: Date,
    default: null
  },
  failureCode: {
    type: String,
    default: null
  },
  failureReason: {
    type: String,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelledReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Pre-save hook: ensure workerId/labourId sync, amountInPaise sync, and status normalization
withdrawalSchema.pre('save', function() {
  if (this.labourId && !this.workerId) {
    this.workerId = this.labourId;
  }
  if (this.workerId && !this.labourId) {
    this.labourId = this.workerId;
  }

  // Normalize legacy status casing
  if (this.status === 'Processing') this.status = 'PROCESSING';
  if (this.status === 'Completed') this.status = 'PAID';
  if (this.status === 'Failed') this.status = 'FAILED';

  if (this.amount && !this.amountInPaise) {
    this.amountInPaise = Math.round(this.amount * 100);
  } else if (this.amountInPaise && !this.amount) {
    this.amount = this.amountInPaise / 100;
  }
});

// Compound indexes
withdrawalSchema.index({ workerId: 1, status: 1 });
withdrawalSchema.index({ labourId: 1, status: 1 });
withdrawalSchema.index({ workerId: 1, createdAt: -1 });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
