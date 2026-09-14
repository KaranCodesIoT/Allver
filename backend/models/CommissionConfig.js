const mongoose = require('mongoose');

const commissionConfigSchema = new mongoose.Schema({
  serviceType: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: 'default'
  },
  commissionRate: {
    type: Number,
    required: true,
    default: 0.10, // 10%
    min: 0,
    max: 1
  },
  negativeBalanceThreshold: {
    type: Number,
    default: -500 // Worker balance below this → restrict CASH jobs
  },
  cashJobRestrictionThreshold: {
    type: Number,
    default: -500
  },
  minimumWithdrawalAmount: {
    type: Number,
    default: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Seed default config on first access
commissionConfigSchema.statics.getConfigForService = async function(serviceType) {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return {
      serviceType: serviceType || 'default',
      commissionRate: 0.10,
      negativeBalanceThreshold: -500,
      cashJobRestrictionThreshold: -500,
      minimumWithdrawalAmount: 100,
      isActive: true
    };
  }
  let config = await this.findOne({ serviceType, isActive: true });
  if (!config) {
    config = await this.findOne({ serviceType: 'default', isActive: true });
  }
  if (!config) {
    // Seed default
    config = await this.create({
      serviceType: 'default',
      commissionRate: 0.10,
      negativeBalanceThreshold: -500,
      cashJobRestrictionThreshold: -500,
      minimumWithdrawalAmount: 100,
      isActive: true
    });
  }
  return config;
};

module.exports = mongoose.model('CommissionConfig', commissionConfigSchema);
