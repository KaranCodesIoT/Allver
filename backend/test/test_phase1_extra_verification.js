// backend/test/test_phase1_extra_verification.js
// Verification of the 5 specific requirements:
// A. Double-entry transaction and verify every posting set has: SUM(DEBIT) = SUM(CREDIT)
// B. Send the same idempotency key concurrently multiple times -> exactly one financial posting set exists
// C. Attempt to update/delete an existing Ledger entry -> operation is rejected
// D. Disconnect MongoDB and attempt a financial operation -> explicit database connection failure; NO in-memory persistence
// E. Verify legacy indexes are gone and the compound idempotency index remains

const assert = require('assert');
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

const FinancialService = require('../services/FinancialService');
const Ledger = require('../models/Ledger');

function toTestObjectId(str) {
  const hash = crypto.createHash('md5').update('extra_test_' + str).digest('hex').slice(0, 24);
  return new mongoose.Types.ObjectId(hash);
}

async function verifyAll() {
  console.log('================================================================');
  console.log('🔍 RUNNING PHASE 1 SPECIFIC VERIFICATION CHECKS (A, B, C, D, E)');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas replica set\n');
  await Ledger.ensureLedgerIndexes();

  const fs = new FinancialService();
  const runId = Date.now();

  // --- CHECK A: Double-entry transaction and verify SUM(DEBIT) = SUM(CREDIT) ---
  console.log('--- Check A: Zero-Sum Debit/Credit Invariant ---');
  const workerA = toTestObjectId(`worker_check_a_${runId}`);
  const jobA = `extra_job_a_${runId}`;

  const resA = await fs.settleOnlinePayment({
    jobId: jobA,
    jobAmount: 2500,
    commissionAmount: 250,
    workerNetEarning: 2250,
    workerId: workerA
  }, 'gateway_ref_a');

  assert.strictEqual(resA.success, true);
  const postingsA = await Ledger.find({ jobId: jobA }).lean();
  let debitsA = 0;
  let creditsA = 0;
  for (const leg of postingsA) {
    if (leg.entryType === 'DEBIT') debitsA += leg.amountInPaise;
    if (leg.entryType === 'CREDIT') creditsA += leg.amountInPaise;
  }
  console.log(`  Debits: ${debitsA} paise (₹${debitsA / 100}), Credits: ${creditsA} paise (₹${creditsA / 100})`);
  assert.strictEqual(debitsA, creditsA, 'Check A: Debits must equal Credits');
  assert.strictEqual(debitsA, 250000);
  console.log('✅ Check A PASSED: SUM(DEBIT) = SUM(CREDIT)\n');

  // --- CHECK B: Send same idempotency key concurrently multiple times ---
  console.log('--- Check B: Concurrent Duplicate Posting Idempotency ---');
  const workerB = toTestObjectId(`worker_check_b_${runId}`);
  const jobB = `extra_job_b_${runId}`;

  // Fire 10 simultaneous settleOnlinePayment requests with the exact same job data & idempotency key
  const concurrentPromises = Array.from({ length: 10 }, () => {
    return fs.settleOnlinePayment({
      jobId: jobB,
      jobAmount: 1000,
      commissionAmount: 100,
      workerNetEarning: 900,
      workerId: workerB
    }, 'shared_gateway_ref');
  });

  const concurrentResults = await Promise.all(concurrentPromises);
  assert(concurrentResults.every(r => r.success === true), 'All 10 concurrent requests must succeed idempotently');

  // Verify only 1 set of postings exists in MongoDB
  const postingsB = await Ledger.find({ jobId: jobB }).lean();
  const distinctPostingIds = [...new Set(postingsB.map(p => p.postingId))];
  console.log(`  Total ledger documents created: ${postingsB.length} (expected 3: Gateway, WorkerPayable, Commission)`);
  console.log(`  Distinct posting IDs: ${distinctPostingIds.length} (expected exactly 1)`);
  assert.strictEqual(distinctPostingIds.length, 1, 'Exactly one financial posting set must exist');
  assert.strictEqual(postingsB.length, 3, 'Exactly one 3-legged posting set must exist');

  // Verify wallet balance is credited exactly once (₹900, not 10 x ₹900 = ₹9,000)
  const balB = await fs.getWorkerBalance(workerB);
  console.log(`  Worker balance after 10 concurrent calls: ₹${balB.balance} (expected exactly ₹900)`);
  assert.strictEqual(balB.balance, 900, 'Balance must be credited exactly once');
  console.log('✅ Check B PASSED: Exactly 1 posting set created under concurrent load\n');

  // --- CHECK C: Attempt to update/delete an existing Ledger entry ---
  console.log('--- Check C: Append-Only Ledger Immutability ---');
  const sampleEntry = postingsA[0];

  let updateRejected = false;
  try {
    await Ledger.updateOne({ _id: sampleEntry._id }, { description: 'Malicious modification' });
  } catch (err) {
    updateRejected = true;
    console.log(`  Update rejected as expected: "${err.message}"`);
  }
  assert.strictEqual(updateRejected, true, 'updateOne must be rejected by immutability hook');

  let deleteRejected = false;
  try {
    await Ledger.deleteOne({ _id: sampleEntry._id });
  } catch (err) {
    deleteRejected = true;
    console.log(`  Delete rejected as expected: "${err.message}"`);
  }
  assert.strictEqual(deleteRejected, true, 'deleteOne must be rejected by immutability hook');

  let findOneAndUpdateRejected = false;
  try {
    await Ledger.findOneAndUpdate({ _id: sampleEntry._id }, { amountInPaise: 999999 });
  } catch (err) {
    findOneAndUpdateRejected = true;
    console.log(`  findOneAndUpdate rejected as expected: "${err.message}"`);
  }
  assert.strictEqual(findOneAndUpdateRejected, true, 'findOneAndUpdate must be rejected by immutability hook');
  console.log('✅ Check C PASSED: In-place mutations and deletions strictly rejected\n');

  // --- CHECK E: Verify legacy indexes are gone and compound idempotency index remains ---
  console.log('--- Check E: Database Indexes Verification ---');
  const collection = mongoose.connection.db.collection('ledgers');
  const indexes = await collection.indexes();
  const indexNames = indexes.map(i => i.name);
  console.log('  Active indexes in MongoDB Atlas:');
  for (const idx of indexes) {
    console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)} (unique: ${!!idx.unique})`);
  }

  assert(!indexNames.includes('transactionId_1'), 'Legacy transactionId_1 unique index must be gone');
  assert(!indexNames.includes('idempotencyKey_1'), 'Legacy idempotencyKey_1 index must be gone');
  assert(indexNames.includes('idempotencyKey_1_legIndex_1'), 'Compound idempotencyKey_1_legIndex_1 must exist');

  const compoundIdx = indexes.find(i => i.name === 'idempotencyKey_1_legIndex_1');
  assert.strictEqual(compoundIdx.unique, true, 'idempotencyKey_1_legIndex_1 must be unique');
  console.log('✅ Check E PASSED: Obsolete unique indexes dropped; compound idempotency index active\n');

  // Cleanup test documents safely via raw collection bypass
  console.log('Cleaning up extra verification records...');
  await mongoose.connection.db.collection('ledgers').deleteMany({ workerId: { $in: [workerA, workerB] } });
  console.log('Cleanup completed.\n');

  // --- CHECK D: Disconnect MongoDB and attempt a financial operation ---
  console.log('--- Check D: Database Disconnect Safety (No In-Memory Persistence) ---');
  await mongoose.disconnect();
  console.log('  MongoDB disconnected.');

  let dbDisconnectCaught = false;
  try {
    await fs.settleOnlinePayment({
      jobId: 'offline_job_fail',
      jobAmount: 500,
      commissionAmount: 50,
      workerNetEarning: 450,
      workerId: workerA
    });
  } catch (err) {
    dbDisconnectCaught = true;
    console.log(`  Operation rejected as expected: "${err.message}"`);
    assert(err.message.includes('DatabaseConnectionError'), 'Must throw DatabaseConnectionError');
  }
  assert.strictEqual(dbDisconnectCaught, true, 'Financial operations must fail immediately without DB');
  console.log('✅ Check D PASSED: Database disconnect strictly fails fast with zero in-memory fallback\n');

  console.log('================================================================');
  console.log('🎉 ALL 5 SPECIFIC PHASE 1 VERIFICATION CHECKS PASSED (A, B, C, D, E)');
  console.log('================================================================\n');
}

verifyAll().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
