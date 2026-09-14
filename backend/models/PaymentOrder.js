// backend/models/PaymentOrder.js
// Persistent payment order / transaction model for authoritative payment gateway tracking

const mongoose = require('mongoose');

const paymentOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  jobId: {
    type: String,
    required: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amountInPaise: {
    type: Number,
    required: true,
    min: 1
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true
  },
  gateway: {
    type: String,
    enum: ['razorpay', 'mock'],
    default: 'mock'
  },
  gatewayOrderId: {
    type: String,
    index: true
  },
  gatewayPaymentId: {
    type: String,
    index: true,
    sparse: true
  },
  status: {
    type: String,
    enum: [
      'CREATED',
      'PENDING',
      'PAID',
      'FAILED',
      'CANCELLED',
      'REFUNDED',
      'PARTIALLY_REFUNDED'
    ],
    default: 'CREATED',
    index: true
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  webhookEventId: {
    type: String,
    index: true,
    sparse: true
  },
  ledgerPostingId: {
    type: String,
    index: true,
    sparse: true
  },
  refundedAmountInPaise: {
    type: Number,
    default: 0,
    min: 0
  },
  // Gateway fee/tax tracking (populated from Razorpay payment.captured entity)
  gatewayFeeInPaise: {
    type: Number,
    default: 0,
    min: 0
  },
  gatewayTaxInPaise: {
    type: Number,
    default: 0,
    min: 0
  },
  gatewaySettlementAmountInPaise: {
    type: Number,
    default: 0,
    min: 0
  },
  // Gateway-to-bank settlement reconciliation
  settlementStatus: {
    type: String,
    enum: ['UNSETTLED', 'SETTLED'],
    default: 'UNSETTLED',
    index: true
  },
  settlementId: {
    type: String,
    sparse: true,
    index: true
  },
  settlementPostingId: {
    type: String,
    sparse: true
  },
  settledAt: {
    type: Date,
    default: null
  },
  failureReason: {
    type: String,
    default: null
  },
  paidAt: {
    type: Date,
    default: null
  },
  failedAt: {
    type: Date,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  }
}, {
  timestamps: true
});

// Composite index for fast lookups
paymentOrderSchema.index({ jobId: 1, status: 1 });
paymentOrderSchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentOrder', paymentOrderSchema);
