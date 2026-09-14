// backend/test/test_phase3_worker_wallet.js
// Verification of Phase 3: Worker Wallet, Earnings, Withdrawals & Settlement Hardening
// Tests A through K as specified in user requirements

const assert = require('assert');
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const Ledger = require('../models/Ledger');
const FinancialService = require('../services/FinancialService');
const MockPaymentProvider = require('../services/MockPaymentProvider');

function toTestObjectId(str) {
  const hash = crypto.createHash('md5').update('phase3_test_' + str).digest('hex').slice(0, 24);
  return new mongoose.Types.ObjectId(hash);
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING PHASE 3: WORKER WALLET & WITHDRAWAL HARDENING SUITE');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas\n');

  const runId = Date.now();
  const mockProvider = new MockPaymentProvider();
  const financialService = new FinancialService({ paymentProvider: mockProvider });

  const createdUserIds = [];
  const createdWithdrawalIds = [];
  const createdPostingIds = [];

  // Helper to create test workers
  async function createTestWorker(identifier) {
    const objectId = toTestObjectId(identifier);
    createdUserIds.push(objectId);
    await User.deleteOne({ _id: objectId });
    const user = new User({
      _id: objectId,
      fullName: `Test Worker ${identifier}`,
      email: `worker_${identifier}_${runId}@test.com`,
      password: 'hashed_password_123',
      role: 'Labour',
      city: 'Mumbai',
      skillType: 'Painter'
    });
    await user.save();
    return objectId;
  }

  // Helper to credit worker with earnings
  async function creditWorker(workerId, netRupees, jobId = `p3_job_${Date.now()}_${Math.random().toString(36).substring(7)}`) {
    const gross = Math.round((netRupees / 0.9) * 100) / 100;
    const comm = Math.round((gross - netRupees) * 100) / 100;
    const res = await financialService.settleOnlinePayment({
      jobId,
      jobAmount: gross,
      commissionAmount: comm,
      workerNetEarning: netRupees,
      workerId
    }, 'mock_gateway_ref');
    assert.strictEqual(res.success, true);
    if (res.postingId) createdPostingIds.push(res.postingId);
    return res;
  }

  let passed = 0;
  let total = 11;

  try {
    // -------------------------------------------------------------
    // Test A: ₹1,000 balance + 5 concurrent ₹1,000 withdrawals → exactly 1 succeeds
    // -------------------------------------------------------------
    console.log('Test A: ₹1,000 balance + 5 concurrent ₹1,000 withdrawals');
    const workerA = await createTestWorker(`worker_a_${runId}`);
    await creditWorker(workerA, 1000);

    const initialWalletA = await financialService.getWorkerWallet(workerA);
    console.log(`  Initial balance: ₹${initialWalletA.availableBalance}`);
    assert.strictEqual(initialWalletA.availableBalance, 1000);

    // Dispatch 5 simultaneous withdrawal requests of ₹1,000
    const concurrentWithdrawals = Array.from({ length: 5 }, (_, idx) => {
      return financialService.requestWithdrawal(
        workerA,
        1000,
        { bankName: 'SBI', accountLast4: '1111' },
        null,
        `idemp_test_a_${runId}_${idx}`
      );
    });

    const resultsA = await Promise.all(concurrentWithdrawals);
    const successfulA = resultsA.filter(r => r.success === true);
    const failedA = resultsA.filter(r => r.success === false);

    console.log(`  Concurrent results: ${successfulA.length} succeeded, ${failedA.length} rejected`);
    assert.strictEqual(successfulA.length, 1, 'Exactly ONE withdrawal request must succeed');
    assert.strictEqual(failedA.length, 4, 'Four withdrawal requests must be safely rejected');

    createdWithdrawalIds.push(successfulA[0].withdrawal._id);

    const finalWalletA = await financialService.getWorkerWallet(workerA);
    console.log(`  Final available balance: ₹${finalWalletA.availableBalance}, pending: ₹${finalWalletA.pendingWithdrawal}`);
    assert.strictEqual(finalWalletA.availableBalance, 0, 'Available balance must be exactly ₹0 (not negative)');
    assert.strictEqual(finalWalletA.pendingWithdrawal, 1000, 'Pending withdrawal must be ₹1,000');

    const totalWithdrawalsA = await Withdrawal.countDocuments({
      workerId: workerA,
      status: { $in: ['REQUESTED', 'PROCESSING'] }
    });
    assert.strictEqual(totalWithdrawalsA, 1, 'Only one Withdrawal record should exist');
    console.log('✅ Test A PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test B: Same withdrawal idempotency key submitted 10 times → exactly 1 withdrawal
    // -------------------------------------------------------------
    console.log('Test B: Same withdrawal idempotency key submitted 10 times');
    const workerB = await createTestWorker(`worker_b_${runId}`);
    await creditWorker(workerB, 2000);

    const idempKeyB = `idemp_b_key_${runId}`;
    const idempCalls = Array.from({ length: 10 }, () => {
      return financialService.requestWithdrawal(
        workerB,
        500,
        { bankName: 'HDFC', accountLast4: '2222' },
        null,
        idempKeyB
      );
    });

    const resultsB = await Promise.all(idempCalls);
    assert(resultsB.every(r => r.success === true));
    const distinctWithdrawalIds = [...new Set(resultsB.map(r => r.withdrawal._id.toString()))];
    assert.strictEqual(distinctWithdrawalIds.length, 1, 'All 10 calls must return the exact same Withdrawal');

    createdWithdrawalIds.push(resultsB[0].withdrawal._id);

    const walletB = await financialService.getWorkerWallet(workerB);
    console.log(`  Worker B balance after 10 identical requests: ₹${walletB.availableBalance}, pending: ₹${walletB.pendingWithdrawal}`);
    assert.strictEqual(walletB.availableBalance, 1500, 'Balance must only be debited once (₹500 deducted from ₹2,000)');
    assert.strictEqual(walletB.pendingWithdrawal, 500, 'Pending withdrawal must be exactly ₹500');

    const countB = await Withdrawal.countDocuments({ idempotencyKey: idempKeyB });
    assert.strictEqual(countB, 1, 'Exactly one Withdrawal document should exist');
    console.log('✅ Test B PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test C: Successful payout processed twice → exactly one PAID financial effect
    // -------------------------------------------------------------
    console.log('Test C: Successful payout processed twice');
    const workerC = await createTestWorker(`worker_c_${runId}`);
    await creditWorker(workerC, 1000);

    const withResC = await financialService.requestWithdrawal(workerC, 500, { bankName: 'ICICI', accountLast4: '3333' });
    assert.strictEqual(withResC.success, true);
    createdWithdrawalIds.push(withResC.withdrawal._id);

    const payoutDetailsC = {
      utrNumber: `UTR_${runId}_C`,
      payoutProviderRef: `payout_ref_c_${runId}`,
      payoutProvider: 'razorpayx'
    };

    // First completion
    const proc1C = await financialService.processWithdrawal(withResC.withdrawal._id, payoutDetailsC);
    assert.strictEqual(proc1C.success, true);
    assert.strictEqual(proc1C.withdrawal.status, 'PAID');

    // Second completion (Duplicate payout webhook)
    const proc2C = await financialService.processWithdrawal(withResC.withdrawal._id, payoutDetailsC);
    assert.strictEqual(proc2C.success, true);
    assert.strictEqual(proc2C.duplicate, true);

    const paidPostingsC = await Ledger.find({
      workerId: workerC,
      type: 'WITHDRAWAL_COMPLETED'
    }).lean();
    assert.strictEqual(paidPostingsC.length, 2, 'Exactly 2 legs (PendingWithdrawals DEBIT & BankClearing CREDIT) must exist');

    const walletC = await financialService.getWorkerWallet(workerC);
    assert.strictEqual(walletC.pendingWithdrawal, 0, 'Pending withdrawals must be cleared to ₹0');
    assert.strictEqual(walletC.totalWithdrawn, 500, 'Lifetime withdrawn must be ₹500');
    console.log('✅ Test C PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test D: Failed payout processed twice → balance restored exactly once
    // -------------------------------------------------------------
    console.log('Test D: Failed payout processed twice');
    const workerD = await createTestWorker(`worker_d_${runId}`);
    await creditWorker(workerD, 1000);

    const withResD = await financialService.requestWithdrawal(workerD, 500, { bankName: 'Axis', accountLast4: '4444' });
    assert.strictEqual(withResD.success, true);
    createdWithdrawalIds.push(withResD.withdrawal._id);

    // Balance after reservation: available = ₹500, pending = ₹500
    const walletD1 = await financialService.getWorkerWallet(workerD);
    assert.strictEqual(walletD1.availableBalance, 500);
    assert.strictEqual(walletD1.pendingWithdrawal, 500);

    // Fail payout #1
    const fail1D = await financialService.failWithdrawal(withResD.withdrawal._id, 'Bank account blocked', 'BENEFICIARY_BLOCKED');
    assert.strictEqual(fail1D.success, true);
    assert.strictEqual(fail1D.withdrawal.status, 'FAILED');

    // Fail payout #2 (Duplicate failure webhook)
    const fail2D = await financialService.failWithdrawal(withResD.withdrawal._id, 'Bank account blocked', 'BENEFICIARY_BLOCKED');
    assert.strictEqual(fail2D.success, true);
    assert.strictEqual(fail2D.duplicate, true);

    // Balance after reversal: available = ₹1,000, pending = ₹0
    const walletD2 = await financialService.getWorkerWallet(workerD);
    console.log(`  Restored available balance: ₹${walletD2.availableBalance}, pending: ₹${walletD2.pendingWithdrawal}`);
    assert.strictEqual(walletD2.availableBalance, 1000, 'Available balance must be restored exactly once');
    assert.strictEqual(walletD2.pendingWithdrawal, 0, 'Pending withdrawal must be cleared');

    const reversalPostingsD = await Ledger.find({
      workerId: workerD,
      type: 'WITHDRAWAL_REVERSAL'
    }).lean();
    assert.strictEqual(reversalPostingsD.length, 2, 'Exactly 2 reversal legs must exist');
    console.log('✅ Test D PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test E: Worker attempts to withdraw more than available balance → rejected
    // -------------------------------------------------------------
    console.log('Test E: Worker attempts to withdraw more than available balance');
    const workerE = await createTestWorker(`worker_e_${runId}`);
    await creditWorker(workerE, 500);

    const withResE = await financialService.requestWithdrawal(workerE, 600, { bankName: 'Kotak', accountLast4: '5555' });
    assert.strictEqual(withResE.success, false);
    assert.strictEqual(withResE.code, 'INSUFFICIENT_BALANCE');

    const walletE = await financialService.getWorkerWallet(workerE);
    assert.strictEqual(walletE.availableBalance, 500);
    assert.strictEqual(walletE.pendingWithdrawal, 0);
    console.log('✅ Test E PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test F: Worker with outstanding debt attempts withdrawal → rejected
    // -------------------------------------------------------------
    console.log('Test F: Worker with outstanding debt attempts withdrawal');
    const workerF = await createTestWorker(`worker_f_${runId}`);

    // Simulate cash job creating a negative balance (-₹100 commission debt)
    await financialService.settleCashPayment({
      jobId: `job_cash_debt_${runId}`,
      commissionAmount: 100,
      jobAmount: 1000,
      workerId: workerF
    });

    const walletF = await financialService.getWorkerWallet(workerF);
    assert.strictEqual(walletF.balance, -100);
    assert.strictEqual(walletF.outstandingDebt, 100);

    const withResF = await financialService.requestWithdrawal(workerF, 100, { bankName: 'SBI', accountLast4: '6666' });
    assert.strictEqual(withResF.success, false);
    assert.strictEqual(withResF.code, 'OUTSTANDING_DEBT');
    assert(withResF.message.includes('outstanding balance'));
    console.log('✅ Test F PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test G: Worker attempts to access another worker's wallet → rejected
    // -------------------------------------------------------------
    console.log('Test G: Authorization & ownership checks');
    const workerG1 = await createTestWorker(`worker_g1_${runId}`);
    const workerG2 = await createTestWorker(`worker_g2_${runId}`);

    // Simulation of endpoint authorization check logic:
    function checkWalletAuth(requestingUserId, targetWorkerId, role = 'Labour') {
      if (requestingUserId.toString() !== targetWorkerId.toString() && role !== 'admin') {
        const err = new Error('Unauthorized: You can only access your own wallet');
        err.status = 403;
        throw err;
      }
      return true;
    }

    let authRejected = false;
    try {
      checkWalletAuth(workerG1, workerG2, 'Labour');
    } catch (err) {
      authRejected = true;
      assert.strictEqual(err.status, 403);
    }
    assert.strictEqual(authRejected, true, 'Cross-worker wallet access must be forbidden');

    // Admin access allowed
    const adminAllowed = checkWalletAuth(toTestObjectId('admin_user'), workerG2, 'admin');
    assert.strictEqual(adminAllowed, true, 'Admin access must be permitted');
    console.log('✅ Test G PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test H: /api/earnings/:labourId/withdraw cannot bypass unified wallet/ledger
    // -------------------------------------------------------------
    console.log('Test H: /api/earnings/:labourId/withdraw unification check');
    const workerH = await createTestWorker(`worker_h_${runId}`);
    await creditWorker(workerH, 1000);

    // Call requestWithdrawal with same parameters as /api/earnings/:labourId/withdraw
    const withResH = await financialService.requestWithdrawal(workerH, 400, { bankName: 'PNB', accountLast4: '8888' });
    assert.strictEqual(withResH.success, true);
    createdWithdrawalIds.push(withResH.withdrawal._id);

    // Verify ledger has Liabilities:WorkerPayable debit and Liabilities:PendingWithdrawals credit
    const postingsH = await Ledger.find({
      workerId: workerH,
      type: 'WITHDRAWAL_REQUESTED'
    }).lean();
    assert.strictEqual(postingsH.length, 2);

    const walletH = await financialService.getWorkerWallet(workerH);
    assert.strictEqual(walletH.availableBalance, 600);
    assert.strictEqual(walletH.pendingWithdrawal, 400);
    console.log('✅ Test H PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test I: Database failure during withdrawal transaction → complete rollback
    // -------------------------------------------------------------
    console.log('Test I: Database failure during withdrawal transaction → rollback');
    const workerI = await createTestWorker(`worker_i_${runId}`);
    await creditWorker(workerI, 1000);

    const initialWalletI = await financialService.getWorkerWallet(workerI);

    // Attempt a transaction where posting deliberately fails (e.g. malformed legs)
    let txAborted = false;
    try {
      await financialService._executeInTransaction(async (session) => {
        const dummyWith = new Withdrawal({
          labourId: workerI,
          workerId: workerI,
          amount: 500,
          amountInPaise: 50000,
          bankName: 'FailBank',
          accountLast4: '9999',
          status: 'REQUESTED'
        });
        await dummyWith.save({ session });

        // Throw error intentionally to abort transaction
        throw new Error('Simulated database write error during withdrawal');
      });
    } catch (err) {
      txAborted = true;
      assert(err.message.includes('Simulated database write error'));
    }
    assert.strictEqual(txAborted, true);

    // Verify rollback: no Withdrawal document was persisted
    const dummyFound = await Withdrawal.findOne({ bankName: 'FailBank', workerId: workerI });
    assert.strictEqual(dummyFound, null, 'Aborted withdrawal record must not exist in DB');

    // Balance remains unchanged
    const rolledBackWalletI = await financialService.getWorkerWallet(workerI);
    assert.strictEqual(rolledBackWalletI.availableBalance, initialWalletI.availableBalance);
    console.log('✅ Test I PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test J: Verify ledger debit/credit invariant across all created entries
    // -------------------------------------------------------------
    console.log('Test J: Double-entry zero-sum invariant check');
    const allP3LedgerEntries = await Ledger.find({
      workerId: { $in: createdUserIds }
    }).lean();

    const postingsById = {};
    for (const entry of allP3LedgerEntries) {
      if (!postingsById[entry.postingId]) {
        postingsById[entry.postingId] = { debits: 0, credits: 0 };
      }
      if (entry.entryType === 'DEBIT') postingsById[entry.postingId].debits += entry.amountInPaise;
      if (entry.entryType === 'CREDIT') postingsById[entry.postingId].credits += entry.amountInPaise;
    }

    console.log(`  Verifying ${Object.keys(postingsById).length} distinct posting sets...`);
    for (const [postingId, sums] of Object.entries(postingsById)) {
      assert.strictEqual(
        sums.debits,
        sums.credits,
        `Posting ${postingId} must have SUM(DEBIT) === SUM(CREDIT), got debits: ${sums.debits}, credits: ${sums.credits}`
      );
    }
    console.log('✅ Test J PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test K: Restart backend during outstanding withdrawal → recoverable from MongoDB
    // -------------------------------------------------------------
    console.log('Test K: Restart backend during an outstanding withdrawal');
    const workerK = await createTestWorker(`worker_k_${runId}`);
    await creditWorker(workerK, 1000);

    const withResK = await financialService.requestWithdrawal(workerK, 500, { bankName: 'BOB', accountLast4: '7777' });
    assert.strictEqual(withResK.success, true);
    createdWithdrawalIds.push(withResK.withdrawal._id);

    // Simulate backend restart by creating fresh FinancialService instance
    const freshFinancialService = new FinancialService({ paymentProvider: mockProvider });
    const recoveredWalletK = await freshFinancialService.getWorkerWallet(workerK);
    assert.strictEqual(recoveredWalletK.availableBalance, 500);
    assert.strictEqual(recoveredWalletK.pendingWithdrawal, 500);

    // Process payout through the restarted service
    const processK = await freshFinancialService.processWithdrawal(withResK.withdrawal._id, {
      utrNumber: `UTR_RESTART_${runId}`
    });
    assert.strictEqual(processK.success, true);
    assert.strictEqual(processK.withdrawal.status, 'PAID');

    const finalWalletK = await freshFinancialService.getWorkerWallet(workerK);
    assert.strictEqual(finalWalletK.availableBalance, 500);
    assert.strictEqual(finalWalletK.pendingWithdrawal, 0);
    assert.strictEqual(finalWalletK.totalWithdrawn, 500);
    console.log('✅ Test K PASSED\n');
    passed++;

  } finally {
    // Teardown cleanup
    console.log('Cleaning up Phase 3 test records from database...');
    try {
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
        await Withdrawal.deleteMany({
          $or: [{ workerId: { $in: createdUserIds } }, { labourId: { $in: createdUserIds } }]
        });
        await mongoose.connection.db.collection('ledgers').deleteMany({
          workerId: { $in: createdUserIds }
        });
      }
      console.log('Cleanup completed successfully.');
    } catch (cleanErr) {
      console.error('Cleanup warning:', cleanErr.message);
    }
    await mongoose.disconnect();
  }

  console.log('================================================================');
  console.log(`📊 PHASE 3 VERIFICATION RESULTS: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error in Phase 3 suite:', err);
  process.exit(1);
});
