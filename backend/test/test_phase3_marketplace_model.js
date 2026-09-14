// backend/test/test_phase3_marketplace_model.js
// Dedicated test suite verifying Allver's Ola/Uber-style Marketplace Payment Model
// Tests Cases A through J as explicitly specified by user

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
  const hash = crypto.createHash('md5').update('market_model_' + str).digest('hex').slice(0, 24);
  return new mongoose.Types.ObjectId(hash);
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 ALLVER MARKETPLACE PAYMENT MODEL (OLA/UBER STYLE) SUITE');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas\n');

  const runId = Date.now();
  const mockProvider = new MockPaymentProvider();
  const financialService = new FinancialService({ paymentProvider: mockProvider });

  const createdUserIds = [];
  const createdWithdrawalIds = [];
  const createdPostingIds = [];

  async function createTestWorker(identifier) {
    const objectId = toTestObjectId(identifier);
    createdUserIds.push(objectId);
    await User.deleteOne({ _id: objectId });
    const user = new User({
      _id: objectId,
      fullName: `Market Worker ${identifier}`,
      email: `market_${identifier}_${runId}@test.com`,
      password: 'test_password_hash',
      role: 'Labour',
      city: 'Mumbai',
      skillType: 'Electrician'
    });
    await user.save();
    return objectId;
  }

  let passed = 0;
  let total = 10;

  try {
    // -------------------------------------------------------------
    // Test A: Online ₹2,000 → commission ₹200 → worker earning ₹1,800
    // -------------------------------------------------------------
    console.log('Test A: Online ₹2,000 → commission ₹200 → worker earning ₹1,800');
    const workerA = await createTestWorker(`worker_a_${runId}`);
    const resA = await financialService.settleOnlinePayment({
      jobId: `job_online_a_${runId}`,
      jobAmount: 2000,
      commissionAmount: 200,
      workerNetEarning: 1800,
      workerId: workerA
    }, 'gateway_ref_a');
    assert.strictEqual(resA.success, true);
    if (resA.postingId) createdPostingIds.push(resA.postingId);

    const walletA = await financialService.getWorkerWallet(workerA);
    console.log(`  Worker A Wallet: balance=₹${walletA.balance}, available=₹${walletA.availableBalance}, debt=₹${walletA.outstandingDebt}`);
    assert.strictEqual(walletA.balance, 1800, 'Wallet balance must be ₹1,800');
    assert.strictEqual(walletA.availableBalance, 1800, 'Available balance must be ₹1,800');
    assert.strictEqual(walletA.outstandingDebt, 0, 'Debt must be ₹0');
    assert.strictEqual(walletA.grossEarnings, 2000, 'Worker gross earnings must be ₹2,000');
    console.log('✅ Test A PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test B: Cash ₹2,000 → commission ₹200 → worker wallet decreases by ₹200
    // -------------------------------------------------------------
    console.log('Test B: Cash ₹2,000 → commission ₹200 → worker wallet decreases by ₹200');
    const workerB = await createTestWorker(`worker_b_${runId}`);
    const resB = await financialService.settleCashPayment({
      jobId: `job_cash_b_${runId}`,
      jobAmount: 2000,
      commissionAmount: 200,
      commissionRate: 0.10,
      workerId: workerB
    });
    assert.strictEqual(resB.success, true);
    createdPostingIds.push(`post_cash_job_cash_b_${runId}`);

    const walletB = await financialService.getWorkerWallet(workerB);
    console.log(`  Worker B Wallet: balance=₹${walletB.balance}, debt=₹${walletB.outstandingDebt}, available=₹${walletB.availableBalance}`);
    assert.strictEqual(walletB.balance, -200, 'Worker wallet must decrease by ₹200 to -₹200');
    assert.strictEqual(walletB.outstandingDebt, 200, 'Worker debt to Allver must be ₹200');
    assert.strictEqual(walletB.availableBalance, 0, 'Available balance must be ₹0');
    console.log('✅ Test B PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test C: Cash commission greater than current balance → wallet becomes negative
    // -------------------------------------------------------------
    console.log('Test C: Cash commission greater than current balance → wallet becomes negative');
    const workerC = await createTestWorker(`worker_c_${runId}`);
    // Start with +₹100 balance via online job
    await financialService.settleOnlinePayment({
      jobId: `job_seed_c_${runId}`,
      jobAmount: 111.11,
      commissionAmount: 11.11,
      workerNetEarning: 100,
      workerId: workerC
    }, 'gateway_ref_seed_c');
    createdPostingIds.push(`post_online_job_seed_c_${runId}`);

    const preWalletC = await financialService.getWorkerWallet(workerC);
    console.log(`  Worker C pre-cash balance: ₹${preWalletC.balance}`);
    assert.strictEqual(preWalletC.balance, 100);

    // Cash job with ₹200 commission (greater than ₹100 balance)
    const resC = await financialService.settleCashPayment({
      jobId: `job_cash_c_${runId}`,
      jobAmount: 2000,
      commissionAmount: 200,
      commissionRate: 0.10,
      workerId: workerC
    });
    assert.strictEqual(resC.success, true);
    createdPostingIds.push(`post_cash_job_cash_c_${runId}`);

    const postWalletC = await financialService.getWorkerWallet(workerC);
    console.log(`  Worker C post-cash balance: ₹${postWalletC.balance}, debt: ₹${postWalletC.outstandingDebt}`);
    assert.strictEqual(postWalletC.balance, -100, 'Wallet must become -₹100');
    assert.strictEqual(postWalletC.outstandingDebt, 100, 'Outstanding debt must be ₹100');
    assert.strictEqual(postWalletC.availableBalance, 0, 'Available balance must be ₹0');
    console.log('✅ Test C PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test D: Negative wallet -₹100 + online earning ₹500 → ₹400 withdrawable
    // -------------------------------------------------------------
    console.log('Test D: Negative wallet -₹100 + online earning ₹500 → ₹400 withdrawable');
    // Using Worker C who currently has -₹100 balance
    const resD = await financialService.settleOnlinePayment({
      jobId: `job_online_d_${runId}`,
      jobAmount: 555.56,
      commissionAmount: 55.56,
      workerNetEarning: 500,
      workerId: workerC
    }, 'gateway_ref_d');
    assert.strictEqual(resD.success, true);
    createdPostingIds.push(`post_online_job_online_d_${runId}`);

    const walletD = await financialService.getWorkerWallet(workerC);
    console.log(`  Worker C updated: balance=₹${walletD.balance}, debt=₹${walletD.outstandingDebt}, available=₹${walletD.availableBalance}`);
    assert.strictEqual(walletD.balance, 400, 'Net balance must be ₹400 (-100 + 500)');
    assert.strictEqual(walletD.outstandingDebt, 0, 'Debt must be completely cleared to ₹0');
    assert.strictEqual(walletD.availableBalance, 400, 'Available withdrawable balance must be exactly ₹400');
    assert.strictEqual(walletD.availableForWithdrawal, 400);
    console.log('✅ Test D PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test E: Negative wallet -₹100 → ₹100 withdrawal must fail
    // -------------------------------------------------------------
    console.log('Test E: Negative wallet -₹100 → ₹100 withdrawal must fail');
    const workerE = await createTestWorker(`worker_e_${runId}`);
    // Create cash debt of ₹100
    await financialService.settleCashPayment({
      jobId: `job_cash_e_${runId}`,
      jobAmount: 1000,
      commissionAmount: 100,
      commissionRate: 0.10,
      workerId: workerE
    });
    createdPostingIds.push(`post_cash_job_cash_e_${runId}`);

    const walletE = await financialService.getWorkerWallet(workerE);
    assert.strictEqual(walletE.balance, -100);

    // Attempt withdrawal of ₹100
    const resE = await financialService.requestWithdrawal(workerE, 100, {
      bankName: 'ICICI Bank',
      accountLast4: '5555'
    });
    console.log(`  Withdrawal response: success=${resE.success}, message="${resE.message}", code=${resE.code}`);
    assert.strictEqual(resE.success, false, 'Withdrawal must be rejected');
    assert.strictEqual(resE.code, 'OUTSTANDING_DEBT', 'Must indicate outstanding debt');

    const walletEAfter = await financialService.getWorkerWallet(workerE);
    assert.strictEqual(walletEAfter.balance, -100, 'Balance must remain -₹100');
    console.log('✅ Test E PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test F: Positive wallet ₹500 → ₹500 withdrawal succeeds
    // -------------------------------------------------------------
    console.log('Test F: Positive wallet ₹500 → ₹500 withdrawal succeeds');
    const workerF = await createTestWorker(`worker_f_${runId}`);
    await financialService.settleOnlinePayment({
      jobId: `job_online_f_${runId}`,
      jobAmount: 555.56,
      commissionAmount: 55.56,
      workerNetEarning: 500,
      workerId: workerF
    }, 'gateway_ref_f');
    createdPostingIds.push(`post_online_job_online_f_${runId}`);

    const resF = await financialService.requestWithdrawal(workerF, 500, {
      bankName: 'HDFC Bank',
      accountLast4: '9999'
    });
    assert.strictEqual(resF.success, true, 'Withdrawal of ₹500 must succeed');
    assert.strictEqual(resF.withdrawal.status, 'REQUESTED');
    createdWithdrawalIds.push(resF.withdrawal._id);

    const walletF = await financialService.getWorkerWallet(workerF);
    console.log(`  Worker F after withdrawal: balance=₹${walletF.balance}, pending=₹${walletF.pendingWithdrawal}`);
    assert.strictEqual(walletF.availableBalance, 0, 'Available balance must now be ₹0');
    assert.strictEqual(walletF.pendingWithdrawal, 500, 'Pending withdrawal must be ₹500');
    console.log('✅ Test F PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test G: Multiple simultaneous withdrawals cannot spend the same balance twice
    // -------------------------------------------------------------
    console.log('Test G: Multiple simultaneous withdrawals cannot spend the same balance twice');
    const workerG = await createTestWorker(`worker_g_${runId}`);
    await financialService.settleOnlinePayment({
      jobId: `job_online_g_${runId}`,
      jobAmount: 555.56,
      commissionAmount: 55.56,
      workerNetEarning: 500,
      workerId: workerG
    }, 'gateway_ref_g');
    createdPostingIds.push(`post_online_job_online_g_${runId}`);

    // Fire 5 concurrent withdrawal requests of ₹500
    const concurrentWithdrawals = Array.from({ length: 5 }, (_, i) => {
      return financialService.requestWithdrawal(workerG, 500, {
        bankName: 'Axis Bank',
        accountLast4: '7777'
      }, null, `idemp_conc_g_${runId}_${i}`);
    });

    const resultsG = await Promise.all(concurrentWithdrawals);
    const successfulG = resultsG.filter(r => r.success === true);
    const failedG = resultsG.filter(r => r.success === false);

    console.log(`  Concurrent results: ${successfulG.length} succeeded, ${failedG.length} rejected`);
    assert.strictEqual(successfulG.length, 1, 'Exactly 1 concurrent withdrawal must succeed');
    assert.strictEqual(failedG.length, 4, '4 concurrent withdrawals must be rejected');

    createdWithdrawalIds.push(successfulG[0].withdrawal._id);

    const walletG = await financialService.getWorkerWallet(workerG);
    assert.strictEqual(walletG.availableBalance, 0, 'Available balance must never drop below ₹0');
    assert.strictEqual(walletG.pendingWithdrawal, 500, 'Only ₹500 should be in pending withdrawal');
    console.log('✅ Test G PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test H: Multiple cash jobs correctly accumulate the worker's commission debt
    // -------------------------------------------------------------
    console.log('Test H: Multiple cash jobs correctly accumulate the worker\'s commission debt');
    const workerH = await createTestWorker(`worker_h_${runId}`);
    // Cash job 1: ₹1,000 → commission ₹100
    await financialService.settleCashPayment({
      jobId: `job_cash_h1_${runId}`,
      jobAmount: 1000,
      commissionAmount: 100,
      commissionRate: 0.10,
      workerId: workerH
    });
    createdPostingIds.push(`post_cash_job_cash_h1_${runId}`);

    // Cash job 2: ₹2,000 → commission ₹200
    await financialService.settleCashPayment({
      jobId: `job_cash_h2_${runId}`,
      jobAmount: 2000,
      commissionAmount: 200,
      commissionRate: 0.10,
      workerId: workerH
    });
    createdPostingIds.push(`post_cash_job_cash_h2_${runId}`);

    // Cash job 3: ₹1,500 → commission ₹150
    await financialService.settleCashPayment({
      jobId: `job_cash_h3_${runId}`,
      jobAmount: 1500,
      commissionAmount: 150,
      commissionRate: 0.10,
      workerId: workerH
    });
    createdPostingIds.push(`post_cash_job_cash_h3_${runId}`);

    const walletH = await financialService.getWorkerWallet(workerH);
    console.log(`  Worker H accumulated: balance=₹${walletH.balance}, debt=₹${walletH.outstandingDebt}`);
    assert.strictEqual(walletH.balance, -450, 'Accumulated balance must be -₹450 (-100 + -200 + -150)');
    assert.strictEqual(walletH.outstandingDebt, 450, 'Accumulated debt must be ₹450');
    assert.strictEqual(walletH.availableBalance, 0, 'Available balance must be ₹0');
    console.log('✅ Test H PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test I: Future online earnings correctly offset accumulated negative balance
    // -------------------------------------------------------------
    console.log('Test I: Future online earnings correctly offset accumulated negative balance');
    // Worker H currently has -₹450 balance. Now completes online job of ₹1,000 (commission ₹100, earning ₹900)
    const resI = await financialService.settleOnlinePayment({
      jobId: `job_online_i_${runId}`,
      jobAmount: 1000,
      commissionAmount: 100,
      workerNetEarning: 900,
      workerId: workerH
    }, 'gateway_ref_i');
    assert.strictEqual(resI.success, true);
    createdPostingIds.push(`post_online_job_online_i_${runId}`);

    const walletI = await financialService.getWorkerWallet(workerH);
    console.log(`  Worker H post-online: balance=₹${walletI.balance}, debt=₹${walletI.outstandingDebt}, available=₹${walletI.availableBalance}`);
    assert.strictEqual(walletI.balance, 450, 'Balance must be +₹450 (-450 debt + 900 earning)');
    assert.strictEqual(walletI.outstandingDebt, 0, 'Debt must be fully cleared (₹0)');
    assert.strictEqual(walletI.availableBalance, 450, 'Available balance must be exactly ₹450');

    // Worker H can now withdraw the remaining ₹450
    const withdrawResI = await financialService.requestWithdrawal(workerH, 450, {
      bankName: 'Kotak Bank',
      accountLast4: '3333'
    });
    assert.strictEqual(withdrawResI.success, true, 'Withdrawal of offset balance ₹450 must succeed');
    createdWithdrawalIds.push(withdrawResI.withdrawal._id);
    console.log('✅ Test I PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test J: Every financial event has balanced ledger postings
    // -------------------------------------------------------------
    console.log('Test J: Every financial event has balanced ledger postings');
    // Fetch all postings created during this test run
    const postings = await Ledger.aggregate([
      {
        $match: {
          postingId: { $in: createdPostingIds }
        }
      },
      {
        $group: {
          _id: '$postingId',
          debitSum: {
            $sum: { $cond: [{ $eq: ['$entryType', 'DEBIT'] }, '$amountInPaise', 0] }
          },
          creditSum: {
            $sum: { $cond: [{ $eq: ['$entryType', 'CREDIT'] }, '$amountInPaise', 0] }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    console.log(`  Verifying ${postings.length} distinct posting batches across all events...`);
    assert(postings.length > 0, 'Should have verified postings');

    for (const post of postings) {
      assert.strictEqual(
        post.debitSum,
        post.creditSum,
        `Posting ${post._id} is unbalanced: DEBITS (${post.debitSum}) !== CREDITS (${post.creditSum})`
      );
      assert(post.debitSum > 0, `Posting ${post._id} has zero debit amount`);
    }
    console.log('  All tested postings have strictly balanced DEBIT === CREDIT zero-sum postings.');
    console.log('✅ Test J PASSED\n');
    passed++;

  } finally {
    console.log('Cleaning up test records from database...');
    try {
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
      }
      if (createdWithdrawalIds.length > 0) {
        await Withdrawal.deleteMany({ _id: { $in: createdWithdrawalIds } });
      }
      if (createdPostingIds.length > 0) {
        await mongoose.connection.db.collection('ledgers').deleteMany({
          postingId: { $in: createdPostingIds }
        });
      }
      console.log('Cleanup completed successfully.');
    } catch (cleanErr) {
      console.error('Warning during cleanup:', cleanErr.message);
    }
    await mongoose.disconnect();
  }

  console.log('================================================================');
  console.log(`📊 MARKETPLACE MODEL RESULTS: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
