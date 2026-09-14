// backend/models/Receipt.js
// Authoritative payment receipt model generated upon server payment verification

const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderId: {
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
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  customerName: {
    type: String,
    default: 'Customer'
  },
  customerPhone: {
    type: String,
    default: ''
  },
  customerEmail: {
    type: String,
    default: ''
  },
  workerName: {
    type: String,
    default: 'Service Professional'
  },
  workerPhone: {
    type: String,
    default: ''
  },
  serviceName: {
    type: String,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  baseAmount: {
    type: Number,
    required: true
  },
  platformFee: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  totalAmountInPaise: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    default: 'Online UPI'
  },
  gateway: {
    type: String,
    enum: ['razorpay', 'mock'],
    default: 'razorpay'
  },
  gatewayPaymentId: {
    type: String,
    default: ''
  },
  gatewayOrderId: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['PAID', 'REFUNDED'],
    default: 'PAID',
    index: true
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  businessDetails: {
    companyName: { type: String, default: 'Allver Technologies Pvt. Ltd.' },
    gstin: { type: String, default: null }, // Never hardcode a fake GSTIN. Set only when verified via secure config / env
    isGstRegistered: { type: Boolean, default: false },
    documentType: { type: String, enum: ['PAYMENT_RECEIPT', 'TAX_INVOICE'], default: 'PAYMENT_RECEIPT' },
    documentTitle: { type: String, default: 'Official Payment Receipt' },
    supportEmail: { type: String, default: 'support@allver.app' },
    supportPhone: { type: String, default: '+91 1800 123 4567' },
    address: { type: String, default: 'Allver Headquarters, Hiranandani Estate, Thane, Maharashtra 400607' },
    website: { type: String, default: 'https://allver.app' }
  }
}, {
  timestamps: true
});

receiptSchema.index({ customerId: 1, createdAt: -1 });
receiptSchema.index({ workerId: 1, createdAt: -1 });

module.exports = mongoose.model('Receipt', receiptSchema);
