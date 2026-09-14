// backend/services/FinancialService.js
// Production-Grade Financial Orchestration Engine for Allver
// Guarantees:
// 1. Strict append-only Double-Entry Ledger (Zero-Sum Invariant: Debits === Credits)
// 2. Integer Paise precision for all monetary values
// 3. Multi-Document ACID Transactions (MongoDB Sessions)
// 4. Zero in-memory fallbacks: Fail-fast if database is not connected
// 5. Authoritative balance derivation from Liabilities:WorkerPayable
// 6. Idempotency protection with graceful concurrent race handling

const mongoose = require('mongoose');
const crypto = require('crypto');
const Ledger = require('../models/Ledger');
const CommissionConfig = require('../models/CommissionConfig');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const MockPaymentProvider = require('./MockPaymentProvider');

class FinancialService {
  constructor(options = {}) {
    this.paymentProvider = options.paymentProvider || new MockPaymentProvider({
      failRate: parseFloat(process.env.MOCK_PAYMENT_FAIL_RATE || '0')
    });
    console.log(`[FinancialService] Initialized with payment provider: ${this.paymentProvider.getProviderName()}`);
  }

  _isDbConnected() {
    return mongoose.connection && mongoose.connection.readyState === 1;
  }

  _ensureDbConnection() {
    if (!this._isDbConnected()) {
      throw new Error('DatabaseConnectionError: Financial operations require an active MongoDB connection.');
    }
  }

  /**
   * Execute financial operations inside a MongoDB ACID transaction.
   * If an outer session is provided, reuses it; otherwise creates a new session.
   * @param {Function} fn - async (session) => result
   * @param {Object} [existingSession=null]
   * @returns {Promise<any>}
   */
  async _executeInTransaction(fn, existingSession = null) {
    this._ensureDbConnection();
    if (existingSession) {
      return fn(existingSession);
    }

    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Execute with idempotency pre-check and concurrency race protection.
   * If an idempotency conflict occurs concurrently, catches it outside the transaction
   * and returns the existing committed postings without unhandled errors or retry loops.
   */
  async _executeWithIdempotency(idempotencyKey, workerId, fn, outerSession = null) {
    this._ensureDbConnection();

    // 1. Fast pre-transaction check
    if (idempotencyKey) {
      const existing = await Ledger.find({ idempotencyKey }).lean();
      if (existing.length > 0) {
        console.log(`[FinancialService] Idempotent duplicate detected for key: ${idempotencyKey}`);
        const walletInfo = workerId ? await this.getWorkerBalance(workerId) : { balance: 0, outstanding: 0 };
        return {
          success: true,
          alreadyProcessed: true,
          balance: walletInfo.balance,
          outstanding: walletInfo.outstanding,
          entries: existing
        };
      }
    }

    // 2. Execute in atomic transaction
    try {
      return await this._executeInTransaction(fn, outerSession);
    } catch (err) {
      // 3. Gracefully handle concurrent duplicate key race
      if ((err.code === 11000 || err.message?.includes('E11000')) && idempotencyKey) {
        console.log(`[FinancialService] Concurrency race caught on idempotencyKey ${idempotencyKey}, retrieving committed postings`);
        const existing = await Ledger.find({ idempotencyKey }).lean();
        if (existing.length > 0) {
          const walletInfo = workerId ? await this.getWorkerBalance(workerId) : { balance: 0, outstanding: 0 };
          return {
            success: true,
            alreadyProcessed: true,
            balance: walletInfo.balance,
            outstanding: walletInfo.outstanding,
            entries: existing
          };
        }
      }
      throw err;
    }
  }

  /**
   * Post a balanced double-entry transaction.
   * Mathematically enforces sum(Debits) === sum(Credits) in integer paise.
   */
  async _postDoubleEntry({ postingId, idempotencyKey, type, description, jobId = null, workerId = null, legs = [], metadata = {} }, session) {
    this._ensureDbConnection();

    if (!postingId) postingId = `post_${crypto.randomUUID()}`;
    if (!idempotencyKey) idempotencyKey = `idemp_${crypto.randomUUID()}`;

    // 1. Idempotency Check inside session
    const existing = await Ledger.find({ idempotencyKey }).session(session).lean();
    if (existing && existing.length > 0) {
      return existing;
    }

    // 2. Filter out zero-amount legs (e.g. 0% commission jobs)
    const activeLegs = legs.filter(l => l.amountInPaise !== 0);
    if (activeLegs.length === 0) {
      return [];
    }

    // Double-Entry Balance & Validation Invariant
    let totalDebitsPaise = 0;
    let totalCreditsPaise = 0;

    for (let i = 0; i < activeLegs.length; i++) {
      const leg = activeLegs[i];
      if (!Number.isInteger(leg.amountInPaise) || leg.amountInPaise <= 0) {
        throw new Error(`FinancialValidationError: Invalid non-integer or non-positive amountInPaise: ${leg.amountInPaise}`);
      }
      if (leg.entryType === 'DEBIT') {
        totalDebitsPaise += leg.amountInPaise;
      } else if (leg.entryType === 'CREDIT') {
        totalCreditsPaise += leg.amountInPaise;
      } else {
        throw new Error(`FinancialValidationError: Invalid entryType: ${leg.entryType}`);
      }
    }

    if (totalDebitsPaise !== totalCreditsPaise) {
      throw new Error(
        `DoubleEntryInvariantViolation: Transaction unbalanced! Total Debits (${totalDebitsPaise} paise / ₹${totalDebitsPaise / 100}) !== Total Credits (${totalCreditsPaise} paise / ₹${totalCreditsPaise / 100})`
      );
    }

    // 3. Prepare Ledger Documents
    const docs = activeLegs.map((leg, index) => {
      const wId = leg.workerId || workerId;
      return {
        postingId,
        legIndex: index,
        idempotencyKey,
        account: leg.account,
        entryType: leg.entryType,
        amountInPaise: leg.amountInPaise,
        workerId: wId && mongoose.Types.ObjectId.isValid(wId) ? new mongoose.Types.ObjectId(wId) : null,
        jobId: leg.jobId || jobId || null,
        type: leg.type || type,
        description: leg.description || description,
        metadata: { ...metadata, ...(leg.metadata || {}) },
        createdAt: new Date()
      };
    });

    const entries = await Ledger.insertMany(docs, { session });
    console.log(`[FinancialService] Double-entry posted: ${type} [Posting: ${postingId}, Total: ₹${totalDebitsPaise / 100}]`);
    return entries;
  }

  // ─── 1. Commission Calculation (Integer Paise Precision) ───

  async calculateCommission(jobAmount, serviceType = 'default') {
    const config = await CommissionConfig.getConfigForService(serviceType);
    const rate = config.commissionRate !== undefined ? config.commissionRate : 0.10;

    const jobAmountPaise = Math.round(Number(jobAmount || 0) * 100);
    const commissionAmountPaise = Math.round(jobAmountPaise * rate);
    const workerNetEarningPaise = jobAmountPaise - commissionAmountPaise;

    return {
      commissionRate: rate,
      commissionAmount: commissionAmountPaise / 100,
      workerNetEarning: workerNetEarningPaise / 100,
      jobAmountPaise,
      commissionAmountPaise,
      workerNetEarningPaise
    };
  }

  // ─── 2. Worker Balance (Authoritative Double-Entry Derivation) ───

  async getWorkerBalance(workerId, session = null) {
    if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
      return { balance: 0, availableForWithdrawal: 0, outstanding: 0, totalEarnings: 0, totalWithdrawn: 0, pendingWithdrawals: 0, balancePaise: 0 };
    }

    this._ensureDbConnection();
    const objectId = new mongoose.Types.ObjectId(workerId);

    // 1. Calculate Net Balance on Liabilities:WorkerPayable
    const payableAgg = await Ledger.aggregate([
      {
        $match: {
          workerId: objectId,
          account: 'Liabilities:WorkerPayable'
        }
      },
      {
        $group: {
          _id: null,
          totalCreditsPaise: {
            $sum: { $cond: [{ $eq: ['$entryType', 'CREDIT'] }, '$amountInPaise', 0] }
          },
          totalDebitsPaise: {
            $sum: { $cond: [{ $eq: ['$entryType', 'DEBIT'] }, '$amountInPaise', 0] }
          }
        }
      }
    ]).session(session || null);

    const creditsPaise = payableAgg[0]?.totalCreditsPaise || 0;
    const debitsPaise = payableAgg[0]?.totalDebitsPaise || 0;
    const balancePaise = creditsPaise - debitsPaise;
    const balance = balancePaise / 100;

    // 2. Calculate Pending Withdrawals from Liabilities:PendingWithdrawals
    const pendingAgg = await Ledger.aggregate([
      {
        $match: {
          workerId: objectId,
          account: 'Liabilities:PendingWithdrawals'
        }
      },
      {
        $group: {
          _id: null,
          totalPendingCreditsPaise: {
            $sum: { $cond: [{ $eq: ['$entryType', 'CREDIT'] }, '$amountInPaise', 0] }
          },
          totalPendingDebitsPaise: {
            $sum: { $cond: [{ $eq: ['$entryType', 'DEBIT'] }, '$amountInPaise', 0] }
          }
        }
      }
    ]).session(session || null);

    const pendingCreditsPaise = pendingAgg[0]?.totalPendingCreditsPaise || 0;
    const pendingDebitsPaise = pendingAgg[0]?.totalPendingDebitsPaise || 0;
    const pendingWithdrawalsPaise = Math.max(0, pendingCreditsPaise - pendingDebitsPaise);
    const pendingWithdrawals = pendingWithdrawalsPaise / 100;

    // 3. Lifetime Earnings and Commission Aggregation
    // Concept 1 (Worker Gross & Net Earnings) & Concept 2 (Allver Commission)
    const earningsDetailAgg = await Ledger.aggregate([
      {
        $match: {
          workerId: objectId,
          type: { $in: ['ONLINE_EARNING', 'JOB_EARNING', 'CASH_COMMISSION'] }
        }
      },
      {
        $group: {
          _id: null,
          onlineNetPaise: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$account', 'Liabilities:WorkerPayable'] }, { $eq: ['$entryType', 'CREDIT'] }] },
                '$amountInPaise',
                0
              ]
            }
          },
          onlineGrossPaise: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$account', 'Liabilities:WorkerPayable'] }, { $eq: ['$entryType', 'CREDIT'] }] },
                {
                  $cond: [
                    { $gt: ['$metadata.jobAmount', 0] },
                    { $round: [{ $multiply: ['$metadata.jobAmount', 100] }] },
                    '$amountInPaise'
                  ]
                },
                0
              ]
            }
          },
          onlineCommissionPaise: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$account', 'Liabilities:WorkerPayable'] }, { $eq: ['$entryType', 'CREDIT'] }] },
                {
                  $cond: [
                    { $gt: ['$metadata.commissionAmount', 0] },
                    { $round: [{ $multiply: ['$metadata.commissionAmount', 100] }] },
                    0
                  ]
                },
                0
              ]
            }
          },
          cashCommissionPaise: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$type', 'CASH_COMMISSION'] }, { $eq: ['$account', 'Liabilities:WorkerPayable'] }, { $eq: ['$entryType', 'DEBIT'] }] },
                '$amountInPaise',
                0
              ]
            }
          },
          cashGrossPaise: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$type', 'CASH_COMMISSION'] }, { $eq: ['$account', 'Liabilities:WorkerPayable'] }, { $eq: ['$entryType', 'DEBIT'] }] },
                {
                  $cond: [
                    { $gt: ['$metadata.jobAmount', 0] },
                    { $round: [{ $multiply: ['$metadata.jobAmount', 100] }] },
                    { $multiply: ['$amountInPaise', 10] }
                  ]
                },
                0
              ]
            }
          }
        }
      }
    ]).session(session || null);

    const stats = earningsDetailAgg[0] || {};
    const onlineNetPaise = stats.onlineNetPaise || 0;
    const onlineGrossPaise = stats.onlineGrossPaise || 0;
    const onlineCommissionPaise = stats.onlineCommissionPaise || 0;
    const cashCommissionPaise = stats.cashCommissionPaise || 0;
    const cashGrossPaise = stats.cashGrossPaise || 0;
    const cashNetPaise = Math.max(0, cashGrossPaise - cashCommissionPaise);

    // Concept 1: Worker Gross Earnings & Net Earnings
    const grossEarningsPaise = onlineGrossPaise + cashGrossPaise;
    const grossEarnings = grossEarningsPaise / 100;
    const workerGrossEarnings = grossEarnings;
    const netEarningsPaise = onlineNetPaise + cashNetPaise;
    const netEarnings = netEarningsPaise / 100;
    const workerNetEarnings = netEarnings;
    const totalEarningsPaise = netEarningsPaise; // Total net earnings from BOTH online & cash jobs
    const totalEarnings = totalEarningsPaise / 100;
    const totalEarned = totalEarnings;

    // Concept 2: Allver Commission & Debt
    const totalCommissionPaise = onlineCommissionPaise + cashCommissionPaise;
    const totalCommission = totalCommissionPaise / 100;
    const outstandingDebtPaise = balancePaise < 0 ? Math.abs(balancePaise) : 0;
    const outstandingDebt = outstandingDebtPaise / 100;
    const outstanding = outstandingDebt;

    // Concept 3: Worker Available / Withdrawable Balance
    const availableBalancePaise = Math.max(0, balancePaise);
    const availableBalance = availableBalancePaise / 100;
    const availableForWithdrawal = availableBalance;
    const withdrawableBalance = availableBalance;

    // 4. Lifetime Withdrawn (Completed payouts released from BankClearing)
    const withdrawnAgg = await Ledger.aggregate([
      {
        $match: {
          workerId: objectId,
          account: 'Assets:BankClearing',
          type: 'WITHDRAWAL_COMPLETED',
          entryType: 'CREDIT'
        }
      },
      {
        $group: {
          _id: null,
          totalWithdrawnPaise: { $sum: '$amountInPaise' }
        }
      }
    ]).session(session || null);
    const totalWithdrawnPaise = withdrawnAgg[0]?.totalWithdrawnPaise || 0;
    const totalWithdrawn = totalWithdrawnPaise / 100;

    return {
      workerId: objectId.toString(),
      // Net Wallet Balance (can be negative or positive)
      balance,
      balancePaise,
      // Concept 1: Worker Gross & Net Earnings
      grossEarnings,
      grossEarningsPaise,
      workerGrossEarnings,
      netEarnings,
      netEarningsPaise,
      workerNetEarnings,
      totalEarnings,
      totalEarningsPaise,
      totalEarned,
      // Concept 2: Allver Commission & Debt
      totalCommission,
      totalCommissionPaise,
      outstandingDebt,
      outstandingDebtPaise,
      outstanding,
      // Concept 3: Worker Available / Withdrawable Balance
      availableBalance,
      availableBalancePaise,
      availableForWithdrawal,
      withdrawableBalance,
      // Pending Escrow & Withdrawals
      pendingWithdrawal: pendingWithdrawals,
      pendingWithdrawalPaise: pendingWithdrawalsPaise,
      pendingWithdrawals,
      totalWithdrawn,
      totalWithdrawnPaise,
      canWithdraw: balancePaise >= 10000 && outstandingDebtPaise === 0,
      currency: 'INR'
    };
  }

  async getWorkerWallet(workerId, session = null) {
    return this.getWorkerBalance(workerId, session);
  }

  // ─── 3. Cash Payment Settlement (Double-Entry) ───

  async settleCashPayment(job, outerSession = null) {
    const { jobId, commissionAmount, jobAmount } = job;
    const workerId = (job.workerId || job.workerUserId || '').toString();

    if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
      return { success: false, reason: 'INVALID_WORKER_ID' };
    }

    const idempotencyKey = `cash_commission_${jobId}`;

    return this._executeWithIdempotency(idempotencyKey, workerId, async (session) => {
      const rawComm = Number(commissionAmount) !== undefined && !isNaN(Number(commissionAmount))
        ? Number(commissionAmount)
        : Math.round((Number(jobAmount) || 0) * (job.commissionRate || 0.10));

      const commPaise = Math.round(rawComm * 100);
      const postingId = `post_cash_${jobId}`;

      const entries = await this._postDoubleEntry({
        postingId,
        idempotencyKey,
        type: 'CASH_COMMISSION',
        jobId,
        workerId,
        description: `Allver platform commission (${Math.round((job.commissionRate || 0.10) * 100)}%) for Cash Job #${jobId}`,
        legs: [
          {
            account: 'Liabilities:WorkerPayable',
            entryType: 'DEBIT',
            amountInPaise: commPaise,
            workerId,
            description: `Commission debit for Cash Job #${jobId}`
          },
          {
            account: 'Revenue:PlatformCommission',
            entryType: 'CREDIT',
            amountInPaise: commPaise,
            description: `Commission earned from Cash Job #${jobId}`
          }
        ],
        metadata: {
          jobAmount: Number(jobAmount),
          commissionAmount: rawComm,
          commissionRate: job.commissionRate || 0.10
        }
      }, session);

      const walletInfo = await this.getWorkerBalance(workerId, session);
      return {
        success: true,
        balance: walletInfo.balance,
        outstanding: walletInfo.outstanding,
        entries
      };
    }, outerSession);
  }

  // ─── 4. Online Payment Settlement (Double-Entry) ───

  async settleOnlinePayment(job, paymentProviderRef, outerSession = null, gatewayFees = null) {
    const { jobId, workerNetEarning, jobAmount, commissionAmount } = job;
    const workerId = (job.workerId || job.workerUserId || '').toString();

    if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
      return { success: false, reason: 'INVALID_WORKER_ID' };
    }

    const idempotencyKey = `online_earning_${jobId}`;

    return this._executeWithIdempotency(idempotencyKey, workerId, async (session) => {
      const totalJobPaise = Math.round(Number(jobAmount || 0) * 100);
      const commPaise = Math.round(
        (Number(commissionAmount) !== undefined && !isNaN(Number(commissionAmount))
          ? Number(commissionAmount)
          : Number(jobAmount) * (job.commissionRate || 0.10)) * 100
      );
      const netPaise = Number(workerNetEarning) !== undefined && !isNaN(Number(workerNetEarning))
        ? Math.round(Number(workerNetEarning) * 100)
        : (totalJobPaise - commPaise);

      if (totalJobPaise !== netPaise + commPaise) {
        throw new Error(`FinancialCalculationError: Job amount (${totalJobPaise}) !== net (${netPaise}) + commission (${commPaise})`);
      }

      // Extract gateway fee/tax (from Razorpay entity or explicit parameter)
      const feePaise = (gatewayFees && gatewayFees.gatewayFeeInPaise > 0) ? Math.round(Number(gatewayFees.gatewayFeeInPaise)) : 0;
      const taxPaise = (gatewayFees && gatewayFees.gatewayTaxInPaise > 0) ? Math.round(Number(gatewayFees.gatewayTaxInPaise)) : 0;
      const gatewayNetPaise = totalJobPaise - feePaise - taxPaise;

      const postingId = `post_online_${jobId}`;

      // Build legs: GatewayClearing gets the NET receivable, fee/GST are separate expense debits
      const legs = [
        {
          account: 'Assets:GatewayClearing',
          entryType: 'DEBIT',
          amountInPaise: gatewayNetPaise,
          description: `Net payment receivable from gateway for Job #${jobId}`
        },
        {
          account: 'Liabilities:WorkerPayable',
          entryType: 'CREDIT',
          amountInPaise: netPaise,
          workerId,
          description: `Net earnings credited for Job #${jobId}`
        },
        {
          account: 'Revenue:PlatformCommission',
          entryType: 'CREDIT',
          amountInPaise: commPaise,
          description: `Platform commission for Job #${jobId}`
        }
      ];

      // Add gateway fee/GST expense legs only when fee data is available
      if (feePaise > 0) {
        legs.push({
          account: 'Expenses:PaymentGatewayFees',
          entryType: 'DEBIT',
          amountInPaise: feePaise,
          description: `Gateway processing fee (TDR) for Job #${jobId}`
        });
      }
      if (taxPaise > 0) {
        legs.push({
          account: 'Expenses:GatewayGST',
          entryType: 'DEBIT',
          amountInPaise: taxPaise,
          description: `GST on gateway fee for Job #${jobId}`
        });
      }

      const entries = await this._postDoubleEntry({
        postingId,
        idempotencyKey,
        type: 'ONLINE_EARNING',
        jobId,
        workerId,
        description: `Online payment earnings from ${job.service || 'job'} - Job #${jobId}`,
        legs,
        metadata: {
          paymentMethod: 'ONLINE',
          paymentProviderRef,
          jobAmount: totalJobPaise / 100,
          commissionAmount: commPaise / 100,
          workerNetEarning: netPaise / 100,
          gatewayFeeInPaise: feePaise,
          gatewayTaxInPaise: taxPaise,
          gatewayNetSettlement: gatewayNetPaise / 100
        }
      }, session);

      const walletInfo = await this.getWorkerBalance(workerId, session);
      return {
        success: true,
        postingId,
        balance: walletInfo.balance,
        outstanding: walletInfo.outstanding,
        entries
      };
    }, outerSession);
  }

  // ─── 4b. Online Payment Refund Reversal (Double-Entry) ───
  // On refund, Razorpay claws back the FULL gross amount from Allver's settlement.
  // Since we originally recorded GatewayClearing at NET (gross - fee - gst),
  // the refund must: (1) reverse GatewayClearing by its net amount,
  // (2) reverse the fee/GST expenses (since the payment no longer exists),
  // (3) reverse worker earning and commission.
  // This keeps the posting balanced: all original legs are proportionally reversed.

  async refundOnlinePayment({ jobId, orderId, refundAmountInPaise, reason, workerId }, outerSession = null) {
    if (!jobId) throw new Error('jobId is required for refund');

    const originalPostings = await Ledger.find({ jobId, type: 'ONLINE_EARNING' }).lean();
    if (!originalPostings || originalPostings.length === 0) {
      throw new Error(`Cannot refund job ${jobId}: no original online earning posting found`);
    }

    const workerLeg = originalPostings.find(p => p.account === 'Liabilities:WorkerPayable' && p.entryType === 'CREDIT');
    const commLeg = originalPostings.find(p => p.account === 'Revenue:PlatformCommission' && p.entryType === 'CREDIT');
    const gatewayLeg = originalPostings.find(p => p.account === 'Assets:GatewayClearing' && p.entryType === 'DEBIT');
    const feeLeg = originalPostings.find(p => p.account === 'Expenses:PaymentGatewayFees' && p.entryType === 'DEBIT');
    const gstLeg = originalPostings.find(p => p.account === 'Expenses:GatewayGST' && p.entryType === 'DEBIT');

    const workerOriginalPaise = workerLeg ? workerLeg.amountInPaise : 0;
    const commOriginalPaise = commLeg ? commLeg.amountInPaise : 0;
    const gatewayNetOriginalPaise = gatewayLeg ? gatewayLeg.amountInPaise : 0;
    const feeOriginalPaise = feeLeg ? feeLeg.amountInPaise : 0;
    const gstOriginalPaise = gstLeg ? gstLeg.amountInPaise : 0;

    // Customer gross = worker + commission
    const customerGrossPaise = workerOriginalPaise + commOriginalPaise;

    const actualWorkerId = (workerId || (workerLeg && workerLeg.workerId) || '').toString();

    const refundPaise = (refundAmountInPaise && refundAmountInPaise <= customerGrossPaise)
      ? refundAmountInPaise
      : customerGrossPaise;

    // Proportional refund ratio
    const refundRatio = customerGrossPaise > 0 ? refundPaise / customerGrossPaise : 1;

    // Proportional split of refund
    let refundCommPaise = customerGrossPaise > 0
      ? Math.round((refundPaise * commOriginalPaise) / customerGrossPaise)
      : 0;
    let refundWorkerPaise = refundPaise - refundCommPaise;

    // Proportional fee/GST reversal
    const refundFeePaise = Math.round(feeOriginalPaise * refundRatio);
    const refundGstPaise = Math.round(gstOriginalPaise * refundRatio);

    // GatewayClearing credit = proportional reversal of what was originally recorded as net
    const gatewayClearingCredit = Math.round(gatewayNetOriginalPaise * refundRatio);

    const refundSeq = Date.now();
    const idempotencyKey = `refund_${orderId || jobId}_${refundPaise}_${refundSeq}`;
    const postingId = `post_rfnd_${orderId || jobId}_${refundSeq}`;

    return this._executeWithIdempotency(idempotencyKey, actualWorkerId, async (session) => {
      const legs = [
        {
          account: 'Liabilities:WorkerPayable',
          entryType: 'DEBIT',
          amountInPaise: refundWorkerPaise,
          workerId: actualWorkerId,
          description: `Reversal of earnings due to refund - Job #${jobId}`
        },
        {
          account: 'Revenue:PlatformCommission',
          entryType: 'DEBIT',
          amountInPaise: refundCommPaise,
          description: `Reversal of platform commission due to refund - Job #${jobId}`
        },
        {
          account: 'Assets:GatewayClearing',
          entryType: 'CREDIT',
          amountInPaise: gatewayClearingCredit,
          description: `Net gateway receivable reversed for refund - Job #${jobId}`
        }
      ];

      // Reverse fee/GST expenses proportionally (CREDIT reverses the original DEBIT)
      if (refundFeePaise > 0) {
        legs.push({
          account: 'Expenses:PaymentGatewayFees',
          entryType: 'CREDIT',
          amountInPaise: refundFeePaise,
          description: `Reversal of gateway fee expense due to refund - Job #${jobId}`
        });
      }
      if (refundGstPaise > 0) {
        legs.push({
          account: 'Expenses:GatewayGST',
          entryType: 'CREDIT',
          amountInPaise: refundGstPaise,
          description: `Reversal of gateway GST expense due to refund - Job #${jobId}`
        });
      }

      const entries = await this._postDoubleEntry({
        postingId,
        idempotencyKey,
        type: 'REFUND',
        jobId,
        workerId: actualWorkerId,
        description: `Refund processed for Job #${jobId}: ${reason || 'Customer refund'}`,
        legs,
        metadata: {
          jobId,
          orderId,
          refundAmountInPaise: refundPaise,
          customerGrossRefund: refundPaise,
          gatewayClearingCredit,
          reversedFee: refundFeePaise,
          reversedGst: refundGstPaise,
          reason
        }
      }, session);

      const walletInfo = await this.getWorkerBalance(actualWorkerId, session);
      return {
        success: true,
        postingId,
        balance: walletInfo.balance,
        refundAmountInPaise: refundPaise,
        gatewayClearingCredit,
        reversedFee: refundFeePaise,
        reversedGst: refundGstPaise,
        entries
      };
    }, outerSession);
  }

  // ─── 4c. Gateway-to-Bank Settlement Reconciliation ───
  // Called when Razorpay settles funds to Allver's bank account.
  // Clears GatewayClearing → BankClearing for the settled amount.
  // Marks associated PaymentOrders as SETTLED.

  async recordGatewaySettlement({ settlementId, settlementAmountInPaise, paymentOrderIds = [], metadata = {} }, outerSession = null) {
    if (!settlementId) throw new Error('settlementId is required for gateway settlement');
    if (!Number.isInteger(settlementAmountInPaise) || settlementAmountInPaise <= 0) {
      throw new Error(`Invalid settlement amount: ${settlementAmountInPaise} paise`);
    }

    const idempotencyKey = `gateway_settlement_${settlementId}`;
    const postingId = `post_gsettle_${settlementId}`;

    return this._executeWithIdempotency(idempotencyKey, null, async (session) => {
      const entries = await this._postDoubleEntry({
        postingId,
        idempotencyKey,
        type: 'GATEWAY_SETTLEMENT',
        description: `Gateway settlement ${settlementId}: ₹${settlementAmountInPaise / 100} cleared to bank`,
        legs: [
          {
            account: 'Assets:BankClearing',
            entryType: 'DEBIT',
            amountInPaise: settlementAmountInPaise,
            description: `Bank deposit from gateway settlement ${settlementId}`
          },
          {
            account: 'Assets:GatewayClearing',
            entryType: 'CREDIT',
            amountInPaise: settlementAmountInPaise,
            description: `Gateway clearing discharged by settlement ${settlementId}`
          }
        ],
        metadata: {
          settlementId,
          settlementAmountInPaise,
          paymentOrderIds,
          ...metadata
        }
      }, session);

      // Mark associated PaymentOrders as settled
      const PaymentOrder = require('../models/PaymentOrder');
      if (paymentOrderIds.length > 0) {
        await PaymentOrder.updateMany(
          { orderId: { $in: paymentOrderIds }, settlementStatus: 'UNSETTLED' },
          {
            $set: {
              settlementStatus: 'SETTLED',
              settlementId,
              settlementPostingId: postingId,
              settledAt: new Date()
            }
          },
          { session }
        );
      }

      return {
        success: true,
        postingId,
        settlementId,
        settlementAmountInPaise,
        settledOrderCount: paymentOrderIds.length,
        entries
      };
    }, outerSession);
  }

  // ─── 5. Cash Job Eligibility Check ───

  async canAcceptCashJob(workerId) {
    if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
      return { allowed: true, balance: 0, threshold: -500, message: '' };
    }

    const config = await CommissionConfig.getConfigForService('default');
    const threshold = config.cashJobRestrictionThreshold !== undefined ? config.cashJobRestrictionThreshold : -500;

    const walletInfo = await this.getWorkerBalance(workerId);

    if (walletInfo.balance < threshold) {
      return {
        allowed: false,
        balance: walletInfo.balance,
        threshold,
        message: `Your outstanding balance of ₹${walletInfo.outstanding} exceeds the limit of ₹${Math.abs(threshold)}. Please settle your balance before accepting cash jobs.`
      };
    }

    return {
      allowed: true,
      balance: walletInfo.balance,
      threshold,
      message: ''
    };
  }

  // ─── 6. Withdrawal Request (Atomic Balance Reservation & Concurrency Mutex) ───

  async requestWithdrawal(workerId, amount, bankDetails = {}, outerSession = null, idempotencyKey = null) {
    return this._executeInTransaction(async (session) => {
      if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
        return { success: false, message: 'Invalid worker ID', code: 'INVALID_WORKER_ID' };
      }

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return { success: false, message: 'Invalid withdrawal amount', code: 'INVALID_AMOUNT' };
      }

      const objectId = new mongoose.Types.ObjectId(workerId);

      // Check idempotencyKey first
      if (idempotencyKey) {
        const existingIdemp = await Withdrawal.findOne({ idempotencyKey }).session(session);
        if (existingIdemp) {
          return {
            success: true,
            duplicate: true,
            message: 'Withdrawal already requested with this idempotency key',
            withdrawal: existingIdemp
          };
        }
      }

      // Concurrency serialization: Acquire exclusive write lock on User record
      await User.findOneAndUpdate(
        { _id: objectId },
        { $set: { lastWalletActivityAt: new Date() } },
        { session }
      );

      const amountPaise = Math.round(numAmount * 100);
      const config = await CommissionConfig.getConfigForService('default');
      const minAmount = config.minimumWithdrawalAmount !== undefined ? config.minimumWithdrawalAmount : 100;
      const minAmountPaise = minAmount * 100;

      if (amountPaise < minAmountPaise) {
        return { success: false, message: `Minimum withdrawal amount is ₹${minAmount}`, code: 'BELOW_MINIMUM' };
      }

      // Check if user already has an active withdrawal in progress
      const existingPending = await Withdrawal.findOne({
        $or: [{ workerId: objectId }, { labourId: objectId }],
        status: { $in: ['REQUESTED', 'PROCESSING', 'Processing'] }
      }).session(session);

      if (existingPending) {
        return { success: false, message: 'You already have a pending withdrawal request', code: 'PENDING_EXISTS' };
      }

      const walletInfo = await this.getWorkerBalance(workerId, session);

      if (walletInfo.outstanding > 0 || walletInfo.balance < 0) {
        return {
          success: false,
          message: `Cannot withdraw while having an outstanding balance of ₹${walletInfo.outstanding}`,
          outstanding: walletInfo.outstanding,
          code: 'OUTSTANDING_DEBT'
        };
      }

      if (amountPaise > walletInfo.availableBalancePaise) {
        return {
          success: false,
          message: `Insufficient balance. Available: ₹${walletInfo.availableBalance}`,
          availableForWithdrawal: walletInfo.availableBalance,
          code: 'INSUFFICIENT_BALANCE'
        };
      }

      const postingId = `post_with_${workerId}_${Date.now()}`;
      const actualIdempotencyKey = idempotencyKey || `with_${workerId}_${Date.now()}`;

      const withdrawal = new Withdrawal({
        labourId: objectId,
        workerId: objectId,
        amount: numAmount,
        amountInPaise: amountPaise,
        bankName: bankDetails.bankName || 'Bank',
        accountLast4: bankDetails.accountLast4 || '0000',
        status: 'REQUESTED',
        idempotencyKey: actualIdempotencyKey,
        ledgerTransactionId: postingId,
        payoutProvider: bankDetails.payoutProvider || 'mock',
        requestedAt: new Date()
      });
      await withdrawal.save({ session });

      const entries = await this._postDoubleEntry({
        postingId,
        idempotencyKey: actualIdempotencyKey,
        type: 'WITHDRAWAL_REQUESTED',
        workerId,
        description: `Withdrawal request to ${bankDetails.bankName || 'Bank'} ****${bankDetails.accountLast4 || '0000'}`,
        legs: [
          {
            account: 'Liabilities:WorkerPayable',
            entryType: 'DEBIT',
            amountInPaise: amountPaise,
            workerId,
            description: `Funds reserved for withdrawal #${withdrawal._id}`
          },
          {
            account: 'Liabilities:PendingWithdrawals',
            entryType: 'CREDIT',
            amountInPaise: amountPaise,
            workerId,
            description: `Escrow held for withdrawal #${withdrawal._id}`
          }
        ],
        metadata: {
          withdrawalId: withdrawal._id.toString(),
          bankName: bankDetails.bankName,
          accountLast4: bankDetails.accountLast4
        }
      }, session);

      const workerEntry = entries.find(e => e.account === 'Liabilities:WorkerPayable') || entries[0];
      const updatedWallet = await this.getWorkerBalance(workerId, session);

      return {
        success: true,
        withdrawal,
        wallet: updatedWallet,
        ledgerEntry: workerEntry,
        entries
      };
    }, outerSession);
  }

  // ─── 7. Process Withdrawal (Bank Payout Complete) ───

  async processWithdrawal(withdrawalId, payoutDetails = {}, outerSession = null) {
    return this._executeInTransaction(async (session) => {
      const withdrawal = await Withdrawal.findById(withdrawalId).session(session);
      if (!withdrawal) {
        return { success: false, message: 'Withdrawal not found' };
      }

      if (withdrawal.status === 'PAID') {
        return { success: true, duplicate: true, message: 'Withdrawal already processed', withdrawal };
      }

      if (!['REQUESTED', 'PROCESSING'].includes(withdrawal.status)) {
        throw new Error(`Invalid status transition: cannot mark ${withdrawal.status} withdrawal as PAID`);
      }

      const amountPaise = withdrawal.amountInPaise || Math.round(withdrawal.amount * 100);
      const postingId = `post_with_paid_${withdrawalId}`;
      const idempotencyKey = `withdrawal_paid_${withdrawalId}`;
      const workerId = (withdrawal.workerId || withdrawal.labourId).toString();

      await this._postDoubleEntry({
        postingId,
        idempotencyKey,
        type: 'WITHDRAWAL_COMPLETED',
        workerId,
        description: `Payout processed for Withdrawal #${withdrawalId}`,
        legs: [
          {
            account: 'Liabilities:PendingWithdrawals',
            entryType: 'DEBIT',
            amountInPaise: amountPaise,
            workerId,
            description: `Escrow cleared for paid withdrawal #${withdrawalId}`
          },
          {
            account: 'Assets:BankClearing',
            entryType: 'CREDIT',
            amountInPaise: amountPaise,
            description: `Bank funds disbursed for withdrawal #${withdrawalId}`
          }
        ],
        metadata: {
          withdrawalId: withdrawal._id.toString(),
          utrNumber: payoutDetails.utrNumber,
          payoutProviderRef: payoutDetails.payoutProviderRef,
          payoutProvider: payoutDetails.payoutProvider
        }
      }, session);

      withdrawal.status = 'PAID';
      withdrawal.completedAt = new Date();
      withdrawal.processedAt = new Date();
      if (payoutDetails.utrNumber) withdrawal.utrNumber = payoutDetails.utrNumber;
      if (payoutDetails.payoutProviderRef) withdrawal.payoutProviderRef = payoutDetails.payoutProviderRef;
      if (payoutDetails.payoutProvider) withdrawal.payoutProvider = payoutDetails.payoutProvider;
      await withdrawal.save({ session });

      console.log(`[FinancialService] Withdrawal ${withdrawalId} marked PAID`);
      return { success: true, withdrawal };
    }, outerSession);
  }

  // ─── 8. Fail Withdrawal (Atomic Balance Restoration) ───

  async failWithdrawal(withdrawalId, reason = 'Processing failed', failureCode = null, outerSession = null) {
    return this._executeInTransaction(async (session) => {
      const withdrawal = await Withdrawal.findById(withdrawalId).session(session);
      if (!withdrawal) {
        return { success: false, message: 'Withdrawal not found' };
      }

      if (withdrawal.status === 'FAILED') {
        return { success: true, duplicate: true, message: 'Withdrawal already marked failed', withdrawal };
      }

      if (!['REQUESTED', 'PROCESSING'].includes(withdrawal.status)) {
        throw new Error(`Invalid status transition: cannot fail ${withdrawal.status} withdrawal`);
      }

      const amountPaise = withdrawal.amountInPaise || Math.round(withdrawal.amount * 100);
      const postingId = `post_with_fail_${withdrawalId}`;
      const idempotencyKey = `withdrawal_fail_${withdrawalId}`;
      const workerId = (withdrawal.workerId || withdrawal.labourId).toString();

      await this._postDoubleEntry({
        postingId,
        idempotencyKey,
        type: 'WITHDRAWAL_REVERSAL',
        workerId,
        description: `Withdrawal reversal: ${reason}`,
        legs: [
          {
            account: 'Liabilities:PendingWithdrawals',
            entryType: 'DEBIT',
            amountInPaise: amountPaise,
            workerId,
            description: `Releasing escrow for failed withdrawal #${withdrawalId}`
          },
          {
            account: 'Liabilities:WorkerPayable',
            entryType: 'CREDIT',
            amountInPaise: amountPaise,
            workerId,
            description: `Restoring funds from failed withdrawal #${withdrawalId}`
          }
        ],
        metadata: {
          withdrawalId: withdrawal._id.toString(),
          reason,
          failureCode
        }
      }, session);

      withdrawal.status = 'FAILED';
      withdrawal.failedAt = new Date();
      withdrawal.failureReason = reason;
      withdrawal.failureCode = failureCode || 'PAYOUT_REJECTED';
      await withdrawal.save({ session });

      console.log(`[FinancialService] Withdrawal ${withdrawalId} FAILED and reversed: ${reason}`);
      return { success: true, withdrawal };
    }, outerSession);
  }

  // ─── 8b. Cancel Withdrawal (Atomic User Cancellation & Balance Restoration) ───

  async cancelWithdrawal(withdrawalId, reason = 'Cancelled by user', outerSession = null) {
    return this._executeInTransaction(async (session) => {
      const withdrawal = await Withdrawal.findById(withdrawalId).session(session);
      if (!withdrawal) {
        return { success: false, message: 'Withdrawal not found' };
      }

      if (withdrawal.status === 'CANCELLED') {
        return { success: true, duplicate: true, message: 'Withdrawal already cancelled', withdrawal };
      }

      if (withdrawal.status !== 'REQUESTED') {
        throw new Error(`Cannot cancel withdrawal in status ${withdrawal.status}`);
      }

      const amountPaise = withdrawal.amountInPaise || Math.round(withdrawal.amount * 100);
      const postingId = `post_with_cancel_${withdrawalId}`;
      const idempotencyKey = `withdrawal_cancel_${withdrawalId}`;
      const workerId = (withdrawal.workerId || withdrawal.labourId).toString();

      await this._postDoubleEntry({
        postingId,
        idempotencyKey,
        type: 'WITHDRAWAL_REVERSAL',
        workerId,
        description: `Withdrawal cancellation: ${reason}`,
        legs: [
          {
            account: 'Liabilities:PendingWithdrawals',
            entryType: 'DEBIT',
            amountInPaise: amountPaise,
            workerId,
            description: `Releasing escrow for cancelled withdrawal #${withdrawalId}`
          },
          {
            account: 'Liabilities:WorkerPayable',
            entryType: 'CREDIT',
            amountInPaise: amountPaise,
            workerId,
            description: `Restoring funds from cancelled withdrawal #${withdrawalId}`
          }
        ],
        metadata: {
          withdrawalId: withdrawal._id.toString(),
          reason
        }
      }, session);

      withdrawal.status = 'CANCELLED';
      withdrawal.cancelledAt = new Date();
      withdrawal.cancelledReason = reason;
      await withdrawal.save({ session });

      console.log(`[FinancialService] Withdrawal ${withdrawalId} CANCELLED and reversed`);
      return { success: true, withdrawal };
    }, outerSession);
  }

  // ─── 9. Settle Outstanding Balance (Double-Entry) ───

  async settleOutstandingBalance(workerId, amount, paymentRef, outerSession = null) {
    if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
      return { success: false, message: 'Invalid worker ID' };
    }

    const idempotencyKey = `balance_settlement_${workerId}_${Date.now()}`;

    return this._executeWithIdempotency(idempotencyKey, workerId, async (session) => {
      const walletInfo = await this.getWorkerBalance(workerId, session);
      if (walletInfo.outstanding <= 0) {
        return { success: false, message: 'No outstanding balance to settle' };
      }

      const numAmount = Number(amount);
      const settlePaise = Math.min(Math.round(numAmount * 100), Math.round(walletInfo.outstanding * 100));
      const postingId = `post_settle_${workerId}_${Date.now()}`;

      await this._postDoubleEntry({
        postingId,
        idempotencyKey,
        type: 'BALANCE_SETTLEMENT',
        workerId,
        description: `Manual balance settlement via ${paymentRef || 'payment'}`,
        legs: [
          {
            account: 'Assets:GatewayClearing',
            entryType: 'DEBIT',
            amountInPaise: settlePaise,
            description: `Received settlement payment via ${paymentRef || 'gateway'}`
          },
          {
            account: 'Liabilities:WorkerPayable',
            entryType: 'CREDIT',
            amountInPaise: settlePaise,
            workerId,
            description: `Credit settlement against negative balance`
          }
        ],
        metadata: { paymentRef, settledAmount: settlePaise / 100 }
      }, session);

      const updatedWallet = await this.getWorkerBalance(workerId, session);
      return { success: true, balance: updatedWallet.balance, outstanding: updatedWallet.outstanding };
    }, outerSession);
  }

  // ─── 10. Proportional Refund (Double-Entry) ───

  async refundJob(job, refundAmount, reason = 'Customer refund', outerSession = null) {
    const { jobId } = job;
    const workerId = (job.workerId || job.workerUserId || '').toString();

    if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
      return { success: false, reason: 'INVALID_WORKER_ID' };
    }

    const idempotencyKey = `refund_${jobId}_${Date.now()}`;

    return this._executeWithIdempotency(idempotencyKey, workerId, async (session) => {
      const refundPaise = Math.round(Number(refundAmount) * 100);
      const totalJobPaise = Math.round(Number(job.jobAmount || 0) * 100);
      const totalCommPaise = Math.round((Number(job.commissionAmount) || (totalJobPaise / 100 * 0.10)) * 100);

      const ratio = totalJobPaise > 0 ? (refundPaise / totalJobPaise) : 1;
      const commRefundPaise = Math.min(totalCommPaise, Math.round(totalCommPaise * ratio));
      const workerClawbackPaise = refundPaise - commRefundPaise;

      const postingId = `post_rfnd_${jobId}_${Date.now()}`;
      let entries = [];

      if (job.paymentMethod === 'ONLINE') {
        entries = await this._postDoubleEntry({
          postingId,
          idempotencyKey,
          type: 'REFUND',
          jobId,
          workerId,
          description: `Online refund for Job #${jobId}: ${reason}`,
          legs: [
            {
              account: 'Liabilities:WorkerPayable',
              entryType: 'DEBIT',
              amountInPaise: workerClawbackPaise,
              workerId,
              description: `Earnings clawback for refunded Job #${jobId}`
            },
            {
              account: 'Revenue:PlatformCommission',
              entryType: 'DEBIT',
              amountInPaise: commRefundPaise,
              description: `Commission reversal for refunded Job #${jobId}`
            },
            {
              account: 'Assets:GatewayClearing',
              entryType: 'CREDIT',
              amountInPaise: refundPaise,
              description: `Funds returned to customer via Gateway for Job #${jobId}`
            }
          ],
          metadata: { reason, refundAmount: refundPaise / 100 }
        }, session);

        if (job.paymentProviderRef) {
          try {
            await this.paymentProvider.refundPayment({
              paymentId: job.paymentProviderRef,
              amount: refundPaise / 100,
              reason
            });
          } catch (err) {
            console.error(`[FinancialService] Gateway refund failed:`, err);
          }
        }
      } else {
        entries = await this._postDoubleEntry({
          postingId,
          idempotencyKey,
          type: 'COMMISSION_REFUND',
          jobId,
          workerId,
          description: `Cash job commission reversal for Job #${jobId}: ${reason}`,
          legs: [
            {
              account: 'Revenue:PlatformCommission',
              entryType: 'DEBIT',
              amountInPaise: commRefundPaise,
              description: `Commission revenue reversed for refunded Cash Job #${jobId}`
            },
            {
              account: 'Liabilities:WorkerPayable',
              entryType: 'CREDIT',
              amountInPaise: commRefundPaise,
              workerId,
              description: `Commission credited back for refunded Cash Job #${jobId}`
            }
          ],
          metadata: { reason, commissionReversed: commRefundPaise / 100 }
        }, session);
      }

      console.log(`[FinancialService] Refund processed for Job ${jobId}: ₹${refundPaise / 100} (Commission reversed: ₹${commRefundPaise / 100})`);
      return { success: true, entries };
    }, outerSession);
  }

  // ─── 11. Transaction History (Worker Payable Ledger) ───

  async getWorkerTransactionHistory(workerId, page = 1, limit = 20) {
    if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
      return { transactions: [], total: 0, page, totalPages: 0 };
    }

    this._ensureDbConnection();
    const objectId = new mongoose.Types.ObjectId(workerId);
    const filter = { workerId: objectId, account: 'Liabilities:WorkerPayable' };

    const total = await Ledger.countDocuments(filter);
    const rawTransactions = await Ledger.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const transactions = rawTransactions.map(t => {
      const rupees = t.amountInPaise / 100;
      const signedAmount = t.entryType === 'CREDIT' ? rupees : -rupees;
      return {
        ...t,
        transactionId: t.postingId,
        amount: signedAmount
      };
    });

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // ─── 12. Payment Provider Access ───

  async createOnlinePayment(jobId, amount, description) {
    return this.paymentProvider.createPayment({ amount, jobId, description });
  }

  async verifyOnlinePayment(paymentId) {
    return this.paymentProvider.verifyPayment({ paymentId });
  }
}

module.exports = FinancialService;
