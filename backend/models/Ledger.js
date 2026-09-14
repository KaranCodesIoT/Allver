const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Allver Chart of Accounts (Double-Entry Ledger)
 * 
 * Assets:
 *  - Assets:GatewayClearing: Net funds receivable from payment provider (Razorpay) awaiting bank settlement
 *  - Assets:BankClearing: Allver bank account funds used for processing worker withdrawals
 * 
 * Liabilities:
 *  - Liabilities:WorkerPayable: Funds owed to workers. CREDITS increase worker balance, DEBITS decrease.
 *  - Liabilities:PendingWithdrawals: Funds reserved in escrow while a withdrawal is in flight
 * 
 * Revenue:
 *  - Revenue:PlatformCommission: Allver's earned commission on completed jobs
 * 
 * Expenses:
 *  - Expenses:PaymentGatewayFees: Payment gateway processing fees (TDR) charged by Razorpay
 *  - Expenses:GatewayGST: 18% GST charged by Razorpay on gateway processing fees
 */
const CHART_OF_ACCOUNTS = [
  'Assets:GatewayClearing',
  'Assets:BankClearing',
  'Liabilities:WorkerPayable',
  'Liabilities:PendingWithdrawals',
  'Revenue:PlatformCommission',
  'Expenses:PaymentGatewayFees',
  'Expenses:GatewayGST'
];

const ledgerSchema = new mongoose.Schema({
  postingId: {
    type: String,
    required: true,
    index: true,
    default: () => `post_${crypto.randomUUID()}`
  },
  legIndex: {
    type: Number,
    required: true,
    default: 0
  },
  idempotencyKey: {
    type: String,
    required: true
  },
  account: {
    type: String,
    required: true,
    enum: CHART_OF_ACCOUNTS,
    index: true
  },
  entryType: {
    type: String,
    required: true,
    enum: ['DEBIT', 'CREDIT'],
    index: true
  },
  amountInPaise: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer paise value'
    }
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  jobId: {
    type: String,
    default: null,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'JOB_EARNING',
      'CASH_COMMISSION',
      'ONLINE_EARNING',
      'WITHDRAWAL_REQUESTED',
      'WITHDRAWAL_COMPLETED',
      'WITHDRAWAL_REVERSAL',
      'REFUND',
      'COMMISSION_REFUND',
      'BALANCE_SETTLEMENT',
      'ADJUSTMENT',
      'GATEWAY_SETTLEMENT'
    ],
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
    index: true
  }
}, {
  timestamps: false // Strictly append-only, no updatedAt!
});

// Idempotency: Unique compound index on idempotencyKey + legIndex
ledgerSchema.index({ idempotencyKey: 1, legIndex: 1 }, { unique: true });

// Compound indexes for fast worker balance calculations and audit history
ledgerSchema.index({ workerId: 1, account: 1, createdAt: -1 });
ledgerSchema.index({ jobId: 1, type: 1 });

// Virtuals for backwards compatibility with existing UI & API consumers
ledgerSchema.virtual('transactionId').get(function() {
  return this.postingId;
});

// Virtual for rupee amount (signed from worker's perspective for worker transactions)
ledgerSchema.virtual('amount').get(function() {
  const rupees = this.amountInPaise / 100;
  if (this.account === 'Liabilities:WorkerPayable') {
    return this.entryType === 'CREDIT' ? rupees : -rupees;
  }
  return this.entryType === 'DEBIT' ? rupees : -rupees;
});

// Enable virtuals in serialization
ledgerSchema.set('toJSON', { virtuals: true });
ledgerSchema.set('toObject', { virtuals: true });

// Strict Immutability Protection: Throw error on any update or delete operation
const blockMutation = function() {
  throw new Error('Ledger entries are strictly immutable. Updates and deletions are forbidden. Use reversal postings instead.');
};

ledgerSchema.pre('updateOne', blockMutation);
ledgerSchema.pre('findOneAndUpdate', blockMutation);
ledgerSchema.pre('updateMany', blockMutation);
ledgerSchema.pre('deleteOne', blockMutation);
ledgerSchema.pre('findOneAndDelete', blockMutation);
ledgerSchema.pre('deleteMany', blockMutation);

ledgerSchema.statics.CHART_OF_ACCOUNTS = CHART_OF_ACCOUNTS;

// Self-healing startup index synchronization to ensure legacy single-entry unique indexes are cleanly removed
ledgerSchema.statics.ensureLedgerIndexes = async function() {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) return;
  try {
    const collection = mongoose.connection.db.collection('ledgers');
    const existing = await collection.indexes();
    const obsoleteIndexes = ['transactionId_1', 'idempotencyKey_1', 'status_1', 'workerId_1_status_1'];
    for (const name of obsoleteIndexes) {
      if (existing.some(idx => idx.name === name)) {
        await collection.dropIndex(name);
        console.log(`[Ledger] Dropped obsolete index: ${name}`);
      }
    }
    await this.syncIndexes();
  } catch (err) {
    console.error('[Ledger] Index synchronization warning:', err.message);
  }
};

module.exports = mongoose.model('Ledger', ledgerSchema);
