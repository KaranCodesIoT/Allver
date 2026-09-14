const mongoose = require('mongoose');

const clientLocationSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  address: { type: String, default: '' },
  placeId: { type: String, default: '' }
}, { _id: false });

const workerLocationSchema = new mongoose.Schema({
  latitude: { type: Number },
  longitude: { type: Number },
  heading: { type: Number, default: 0 },
  speed: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

const routeSchema = new mongoose.Schema({
  distance: { type: Number, default: 0 }, // Road distance in km
  duration: { type: Number, default: 0 }, // Road duration in minutes
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const completionDataSchema = new mongoose.Schema({
  finalAmount: { type: Number },
  notes: { type: String, default: '' },
  photos: [{ type: String }],
  submittedAt: { type: Date }
}, { _id: false });

const paymentBreakdownSchema = new mongoose.Schema({
  amount: { type: Number },
  platformFee: { type: Number, default: 0 },
  workerEarning: { type: Number, default: 0 },
  total: { type: Number },
  method: { type: String, default: 'Online UPI' },
  paidAt: { type: Date }
}, { _id: false });

const ratingsSchema = new mongoose.Schema({
  workerRating: { type: Number },
  workerReview: { type: String, default: '' },
  clientRating: { type: Number },
  clientReview: { type: String, default: '' },
  customerRated: { type: Boolean, default: false },
  workerRated: { type: Boolean, default: false }
}, { _id: false });

const jobSchema = new mongoose.Schema({
  jobId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  clientId: { 
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
  service: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: [
      'SEARCHING',
      'WORKER_ASSIGNED',
      'WORKER_ACCEPTED',
      'WORKER_EN_ROUTE',
      'WORKER_ARRIVED',
      'WORK_STARTED',
      'WORK_IN_PROGRESS',
      'WORK_COMPLETION_REQUESTED',
      'CLIENT_CONFIRMED',
      'PAYMENT_PENDING',
      'PAYMENT_CONFIRMED',
      'PAYMENT_COMPLETED',
      'SETTLED',
      'COMPLETED',
      'CANCELLED_BY_CLIENT',
      'CANCELLED_BY_WORKER',
      'NO_WORKER_AVAILABLE',
      'PAYMENT_FAILED',
      'DISPUTED',
      'ARCHIVED'
    ],
    default: 'SEARCHING',
    index: true
  },
  clientLocation: { 
    type: clientLocationSchema, 
    required: true 
  },
  workerLocation: { 
    type: workerLocationSchema, 
    default: () => ({}) 
  },
  route: { 
    type: routeSchema, 
    default: () => ({}) 
  },
  price: { 
    type: String, 
    default: 'Standard Rate' 
  },
  pricingEstimate: {
    zone: { type: String },
    zoneName: { type: String },
    minDailyRate: { type: Number },
    maxDailyRate: { type: Number },
    minDailyRateInPaise: { type: Number },
    maxDailyRateInPaise: { type: Number },
    demandMultiplier: { type: Number, default: 1.0 },
    pricingVersion: { type: String, default: 'v1.0' },
    locationNote: { type: String }
  },

  // ─── Financial Fields ───
  paymentMethod: {
    type: String,
    enum: ['CASH', 'ONLINE'],
    default: 'ONLINE'
  },
  jobAmount: { type: Number, default: 0 },           // Agreed service price in ₹
  commissionRate: { type: Number, default: 0.10 },    // Snapshot of commission rate at job creation
  commissionAmount: { type: Number, default: 0 },     // Allver commission = jobAmount * commissionRate
  workerNetEarning: { type: Number, default: 0 },     // jobAmount - commissionAmount
  settlementStatus: {
    type: String,
    enum: ['UNSETTLED', 'CASH_CONFIRMED', 'ONLINE_VERIFIED', 'SETTLED', 'REFUNDED'],
    default: 'UNSETTLED'
  },
  paymentProviderRef: { type: String, default: null }, // Mock or Razorpay payment ID
  paymentOrderId: { type: String, default: null, index: true },
  settledAt: { type: Date },

  paymentStatus: { 
    type: String, 
    enum: ['PENDING', 'PAID', 'FAILED'], 
    default: 'PENDING' 
  },
  chatId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Conversation' 
  },
  completionData: { 
    type: completionDataSchema, 
    default: null 
  },
  payment: { 
    type: paymentBreakdownSchema, 
    default: null 
  },
  ratings: { 
    type: ratingsSchema, 
    default: () => ({}) 
  },
  receiptNumber: { 
    type: String, 
    index: true, 
    sparse: true 
  },
  receiptId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Receipt' 
  },
  customerRated: { 
    type: Boolean, 
    default: false 
  },
  workerRated: { 
    type: Boolean, 
    default: false 
  },
  clientInfo: {
    name: { type: String },
    phone: { type: String },
    avatar: { type: String }
  },
  workerInfo: {
    name: { type: String },
    phone: { type: String },
    avatar: { type: String },
    rating: { type: Number },
    role: { type: String }
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  acceptedAt: { type: Date },
  enRouteAt: { type: Date },
  arrivedAt: { type: Date },
  startedAt: { type: Date },
  completionRequestedAt: { type: Date },
  clientConfirmedAt: { type: Date },
  completedAt: { type: Date },
  settledAt: { type: Date },
  cancelledAt: { type: Date },
  cancellationReason: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Job', jobSchema);
