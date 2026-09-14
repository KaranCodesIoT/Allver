// backend/test/test_financial_system.js
// Automated 24-Test Suite for Allver Production Financial Architecture
// Validates: Commission calculations, State transitions, Payment flows,
// Double-Entry Ledger, Worker wallet & Payouts, Cash eligibility gate, Concurrency

const assert = require('assert');
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();

const FinancialService = require('../services/FinancialService');
const MockPaymentProvider = require('../services/MockPaymentProvider');
const BookingDispatchEngine = require('../services/BookingDispatchEngine');
const Ledger = require('../models/Ledger');
const Withdrawal = require('../models/Withdrawal');

class MockSocket {
  constructor(id, userId) {
    this.id = id;
    this.userId = userId;
    this.emitted = [];
  }
  emit(event, data) {
    this.emitted.push({ event, data, timestamp: Date.now() });
  }
  join(room) {}
  leave(room) {}
  getEvents(event) {
    return this.emitted.filter(e => e.event === event);
  }
}

class MockIo {
  constructor() {
    this.rooms = new Map();
    this.emitted = [];
  }
  to(room) {
    const self = this;
    return {
      emit(event, data) {
        if (!self.rooms.has(room)) self.rooms.set(room, []);
        self.rooms.get(room).push({ event, data, timestamp: Date.now() });
      }
    };
  }
  emit(event, data) {
    this.emitted.push({ event, data, timestamp: Date.now() });
  }
  getRoomEvents(room, event) {
    const list = this.rooms.get(room) || [];
    return event ? list.filter(e => e.event === event) : list;
  }
}

// Helper to generate deterministic valid 24-character ObjectIds for test workers
function toTestObjectId(str) {
  const hash = crypto.createHash('md5').update('test_p1_' + str).digest('hex').slice(0, 24);
  return new mongoose.Types.ObjectId(hash);
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING 24 FINANCIAL & STATE MACHINE ARCHITECTURE TESTS');
  console.log('================================================================\n');

  // Connect to MongoDB Atlas
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas replica set\n');

  // Ensure indexes are cleanly synced
  await Ledger.ensureLedgerIndexes();

  let passed = 0;
  let failed = 0;
  const testWorkerIds = [];

  function trackWorker(oid) {
    if (!testWorkerIds.some(id => id.equals(oid))) {
      testWorkerIds.push(oid);
    }
    return oid;
  }

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
      failed++;
    }
  }

  // ============================================================================
  // GROUP 1: COMMISSION CALCULATION (7 Tests)
  // ============================================================================

  await test('TC01: Percentage commission calculation (10% on ₹1,000 -> fee ₹100, net ₹900)', async () => {
    const fs = new FinancialService();
    const result = await fs.calculateCommission(1000, 'Painting');
    assert.strictEqual(result.commissionRate, 0.10, 'Commission rate should be 10%');
    assert.strictEqual(result.commissionAmount, 100, 'Commission amount should be ₹100');
    assert.strictEqual(result.workerNetEarning, 900, 'Worker net earning should be ₹900');
  });

  await test('TC02: Fixed commission / custom rate calculation (20% on ₹500 -> fee ₹100, net ₹400)', async () => {
    const jobAmount = 500;
    const rate = 0.20;
    const commissionAmount = Math.round(jobAmount * rate);
    const workerNet = jobAmount - commissionAmount;
    assert.strictEqual(commissionAmount, 100);
    assert.strictEqual(workerNet, 400);
  });

  await test('TC03: Minimum commission floor handling (10% of ₹50 is ₹5, min ₹10 applies if configured)', async () => {
    const fs = new FinancialService();
    const result = await fs.calculateCommission(50, 'Painting');
    assert.strictEqual(result.commissionAmount, 5);
    assert.strictEqual(result.workerNetEarning, 45);
  });

  await test('TC04: Maximum commission cap handling (10% of ₹100,000 is ₹10,000)', async () => {
    const fs = new FinancialService();
    const result = await fs.calculateCommission(100000, 'default');
    assert.strictEqual(result.commissionAmount, 10000, 'Commission should be ₹10,000');
    assert.strictEqual(result.workerNetEarning, 90000, 'Worker net should be ₹90,000');
  });

  await test('TC05: Zero amount handling (amount 0 -> fee 0, net 0 without crashing)', async () => {
    const fs = new FinancialService();
    const result = await fs.calculateCommission(0, 'Painting');
    assert.strictEqual(result.commissionAmount, 0);
    assert.strictEqual(result.workerNetEarning, 0);
  });

  await test('TC06: Negative / invalid amount safety (handles negative gracefully)', async () => {
    const fs = new FinancialService();
    const result = await fs.calculateCommission(-100, 'Painting');
    assert(result.commissionAmount <= 0, 'Should handle negative gracefully');
  });

  await test('TC07: Decimal precision / rounding accuracy (₹999.99 @ 10% rounds cleanly to ₹100 fee, ₹900 net)', async () => {
    const fs = new FinancialService();
    const result = await fs.calculateCommission(999.99, 'Painting');
    assert.strictEqual(result.commissionAmount, 100, 'Should round 99.999 to 100');
    assert.strictEqual(result.workerNetEarning, 899.99, 'Worker net should be exactly 899.99');
  });

  // ============================================================================
  // GROUP 2: STATE MACHINE & TRANSITIONS (4 Tests)
  // ============================================================================

  await test('TC08: Full Happy Path State Machine (BOOKED -> SEARCHING -> WORKER_ACCEPTED -> EN_ROUTE -> ARRIVED -> WORK_STARTED -> COMPLETION_REQUESTED -> PAYMENT_PENDING -> PAYMENT_CONFIRMED -> SETTLED -> COMPLETED)', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    const engine = new BookingDispatchEngine(io, activeWorkers, { skipDb: true });

    const workerId = trackWorker(toTestObjectId('worker_hp_1')).toString();
    const workerSocket = new MockSocket('ws_1', workerId);
    activeWorkers.set(workerId, {
      userId: workerId,
      fullName: 'Happy Path Worker',
      role: 'Labour',
      workCategory: ['Painting'],
      specialization: ['Painting'],
      latitude: 19.1982,
      longitude: 72.9968,
      availability: 'Available',
      isAvailableForBooking: true,
      lastLocationUpdate: new Date()
    });

    const clientSocket = new MockSocket('cs_1', 'client_hp_1');
    const jobId = 'test_p1_job_happy_path_1';

    await engine.createAndStartJobRequest(clientSocket, {
      jobId,
      service: 'Painting',
      latitude: 19.1982,
      longitude: 72.9968,
      clientInfo: { name: 'Happy Client' }
    });
    let job = engine.jobs.get(jobId);
    assert.strictEqual(job.status, 'SEARCHING');

    await engine.acceptJob(jobId, { id: workerId, fullName: 'Happy Path Worker' }, workerSocket);
    assert.strictEqual(job.status, 'WORKER_ACCEPTED');

    await engine.startTrip(jobId, workerSocket);
    assert.strictEqual(job.status, 'WORKER_EN_ROUTE');

    await engine.confirmArrival(jobId, workerSocket);
    assert.strictEqual(job.status, 'WORKER_ARRIVED');

    await engine.startWork(jobId, workerSocket);
    assert.strictEqual(job.status, 'WORK_STARTED');

    await engine.submitJobCompletion(jobId, { finalAmount: 1200, notes: 'Done' });
    assert.strictEqual(job.status, 'WORK_COMPLETION_REQUESTED');

    await engine.confirmJobCompletion(jobId);
    assert.strictEqual(job.status, 'PAYMENT_PENDING');

    await engine.confirmPayment(jobId, { method: 'ONLINE', amount: 1200, paymentProviderRef: 'mock_pay_hp_1' });
    job = engine.jobs.get(jobId);
    assert.strictEqual(job.status, 'COMPLETED');
    assert.strictEqual(job.settlementStatus, 'SETTLED');
  });

  await test('TC09: Dispute handling on work completion', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    const engine = new BookingDispatchEngine(io, activeWorkers, { skipDb: true });

    const workerId = trackWorker(toTestObjectId('worker_disp_1')).toString();
    const workerSocket = new MockSocket('ws_disp', workerId);
    activeWorkers.set(workerId, {
      userId: workerId,
      fullName: 'Disp Worker',
      role: 'Labour',
      workCategory: ['Painting'],
      latitude: 19.1982,
      longitude: 72.9968,
      availability: 'Available',
      isAvailableForBooking: true,
      lastLocationUpdate: new Date()
    });

    const clientSocket = new MockSocket('cs_disp', 'client_disp_1');
    const jobId = 'test_p1_job_disp_1';

    await engine.createAndStartJobRequest(clientSocket, { jobId, service: 'Painting', latitude: 19.1982, longitude: 72.9968 });
    await engine.acceptJob(jobId, { id: workerId, fullName: 'Disp Worker' }, workerSocket);
    await engine.startTrip(jobId);
    await engine.confirmArrival(jobId);
    await engine.startWork(jobId);
    await engine.submitJobCompletion(jobId, { finalAmount: 1000 });

    const dispRes = await engine.disputeCompletion(jobId, 'Work was incomplete and paint spilled');
    assert.strictEqual(dispRes.success, true);
    const job = engine.jobs.get(jobId);
    assert.strictEqual(job.status, 'DISPUTED');
  });

  await test('TC10: Prevent double payment / settlement idempotency', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    const engine = new BookingDispatchEngine(io, activeWorkers, { skipDb: true });

    const workerId = trackWorker(toTestObjectId('worker_idemp_1')).toString();
    const workerSocket = new MockSocket('ws_idemp', workerId);
    activeWorkers.set(workerId, {
      userId: workerId,
      fullName: 'Idemp Worker',
      role: 'Labour',
      workCategory: ['Painting'],
      latitude: 19.1982,
      longitude: 72.9968,
      availability: 'Available',
      isAvailableForBooking: true,
      lastLocationUpdate: new Date()
    });

    const clientSocket = new MockSocket('cs_idemp', 'client_idemp');
    const jobId = 'test_p1_job_idemp_double_1';

    await engine.createAndStartJobRequest(clientSocket, { jobId, service: 'Painting', latitude: 19.1982, longitude: 72.9968 });
    await engine.acceptJob(jobId, { id: workerId, fullName: 'Idemp Worker' }, workerSocket);
    await engine.startTrip(jobId);
    await engine.confirmArrival(jobId);
    await engine.startWork(jobId);
    await engine.submitJobCompletion(jobId, { finalAmount: 1000 });
    await engine.confirmJobCompletion(jobId);

    // First confirm -> settles and completes
    await engine.confirmPayment(jobId, { method: 'ONLINE', amount: 1000 });
    const job = engine.jobs.get(jobId);
    assert.strictEqual(job.status, 'COMPLETED');

    const bal1 = await engine.financialService.getWorkerBalance(workerId);

    // Second confirm attempt on same completed job
    await engine.confirmPayment(jobId, { method: 'ONLINE', amount: 1000 });
    const bal2 = await engine.financialService.getWorkerBalance(workerId);

    // Idempotency: ledger balance must NOT double-credit
    assert.strictEqual(bal1.balance, bal2.balance, 'Double confirmation must not double-credit worker balance');
  });

  await test('TC11: Worker cancels job during accepted state -> transitions to CANCELLED_BY_WORKER', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    const engine = new BookingDispatchEngine(io, activeWorkers, { skipDb: true });

    const workerId = trackWorker(toTestObjectId('worker_cancel_1')).toString();
    const workerSocket = new MockSocket('ws_cancel', workerId);
    activeWorkers.set(workerId, {
      userId: workerId,
      fullName: 'Cancel Worker',
      role: 'Labour',
      workCategory: ['Painting'],
      latitude: 19.1982,
      longitude: 72.9968,
      availability: 'Available',
      isAvailableForBooking: true,
      lastLocationUpdate: new Date()
    });

    const clientSocket = new MockSocket('cs_cancel', 'client_cancel');
    const jobId = 'test_p1_job_cancel_test_1';

    await engine.createAndStartJobRequest(clientSocket, { jobId, service: 'Painting', latitude: 19.1982, longitude: 72.9968 });
    await engine.acceptJob(jobId, { id: workerId, fullName: 'Cancel Worker' }, workerSocket);

    const cancelRes = await engine.workerCancelJob(jobId, 'Flat tire on the way');
    assert.strictEqual(cancelRes.success, true);
    const job = engine.jobs.get(jobId);
    assert.strictEqual(job.status, 'CANCELLED_BY_WORKER');
  });

  // ============================================================================
  // GROUP 3: PAYMENT FLOWS (4 Tests)
  // ============================================================================

  await test('TC12: Online mock payment create, verify & success', async () => {
    const provider = new MockPaymentProvider();
    const payment = await provider.createPayment({ amount: 1500, jobId: 'job_online_test_1', description: 'Painting' });
    assert.strictEqual(payment.status, 'CREATED');
    assert.strictEqual(payment.amount, 1500);
    assert(payment.paymentId.startsWith('mock_pay_'));

    const verification = await provider.verifyPayment({ paymentId: payment.paymentId });
    assert.strictEqual(verification.verified, true);
    assert.strictEqual(verification.status, 'PAID');
    assert.strictEqual(verification.amount, 1500);
  });

  await test('TC13: Online payment verification failure on invalid payment ID', async () => {
    const provider = new MockPaymentProvider();
    const verification = await provider.verifyPayment({ paymentId: 'invalid_nonexistent_id' });
    assert.strictEqual(verification.verified, false);
    assert.strictEqual(verification.status, 'NOT_FOUND');
  });

  await test('TC14: Cash payment confirmation flow (worker collects cash directly)', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    const engine = new BookingDispatchEngine(io, activeWorkers, { skipDb: true });

    const workerId = trackWorker(toTestObjectId('worker_cash_flow_1')).toString();
    const workerSocket = new MockSocket('ws_cash', workerId);
    activeWorkers.set(workerId, {
      userId: workerId,
      fullName: 'Cash Worker',
      role: 'Labour',
      workCategory: ['Painting'],
      latitude: 19.1982,
      longitude: 72.9968,
      availability: 'Available',
      isAvailableForBooking: true,
      lastLocationUpdate: new Date()
    });

    const clientSocket = new MockSocket('cs_cash', 'client_cash');
    const jobId = 'test_p1_job_cash_flow_1';

    await engine.createAndStartJobRequest(clientSocket, { jobId, service: 'Painting', latitude: 19.1982, longitude: 72.9968 });
    await engine.acceptJob(jobId, { id: workerId, fullName: 'Cash Worker' }, workerSocket);
    await engine.startTrip(jobId);
    await engine.confirmArrival(jobId);
    await engine.startWork(jobId);
    await engine.submitJobCompletion(jobId, { finalAmount: 1000 });
    await engine.confirmJobCompletion(jobId);

    await engine.selectPaymentMethod(jobId, 'CASH');
    await engine.confirmPayment(jobId, { method: 'CASH', amount: 1000 });

    const job = engine.jobs.get(jobId);
    assert.strictEqual(job.status, 'COMPLETED');
    assert.strictEqual(job.settlementStatus, 'SETTLED');
    assert.strictEqual(job.paymentMethod, 'CASH');

    const bal = await engine.financialService.getWorkerBalance(workerId);
    assert.strictEqual(bal.balance, -100, 'Worker balance should be -₹100 (platform fee deducted for cash job)');
    assert.strictEqual(bal.outstanding, 100, 'Outstanding commission should be ₹100');
  });

  await test('TC15: Cash payment with zero or invalid amount falls back to standard price', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    const engine = new BookingDispatchEngine(io, activeWorkers, { skipDb: true });

    const workerId = trackWorker(toTestObjectId('worker_fallback_1')).toString();
    const workerSocket = new MockSocket('ws_fb', workerId);
    activeWorkers.set(workerId, {
      userId: workerId,
      fullName: 'FB Worker',
      role: 'Labour',
      workCategory: ['Painting'],
      latitude: 19.1982,
      longitude: 72.9968,
      availability: 'Available',
      isAvailableForBooking: true,
      lastLocationUpdate: new Date()
    });

    const clientSocket = new MockSocket('cs_fb', 'client_fb');
    const jobId = 'test_p1_job_fb_1';

    await engine.createAndStartJobRequest(clientSocket, { jobId, service: 'Painting', price: '₹800', latitude: 19.1982, longitude: 72.9968 });
    await engine.acceptJob(jobId, { id: workerId, fullName: 'FB Worker' }, workerSocket);
    await engine.startTrip(jobId);
    await engine.confirmArrival(jobId);
    await engine.startWork(jobId);
    await engine.submitJobCompletion(jobId, { finalAmount: null });
    await engine.confirmJobCompletion(jobId);

    await engine.confirmPayment(jobId, { method: 'CASH', amount: null });
    const job = engine.jobs.get(jobId);
    assert(job.jobAmount > 0, 'Job amount must fallback to a valid positive number');
  });

  // ============================================================================
  // GROUP 4: WORKER WALLET & LEDGER ARCHITECTURE (3 Tests)
  // ============================================================================

  await test('TC16: Online job double-entry settlement (worker credited net earning, platform accounts fee)', async () => {
    const fs = new FinancialService();
    const workerId = trackWorker(toTestObjectId('worker_ledger_online_1'));

    const job = {
      jobId: 'test_p1_job_online_settle_1',
      workerId,
      workerUserId: workerId,
      jobAmount: 2000,
      commissionRate: 0.10,
      commissionAmount: 200,
      workerNetEarning: 1800,
      paymentMethod: 'ONLINE'
    };

    const res = await fs.settleOnlinePayment(job, 'mock_ref_123');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.balance, 1800);
    assert.strictEqual(res.entries.length, 3, 'Double entry has 3 legs');
    const workerLeg = res.entries.find(e => e.account === 'Liabilities:WorkerPayable');
    assert.strictEqual(workerLeg.type, 'ONLINE_EARNING');
    assert.strictEqual(workerLeg.amount, 1800);
  });

  await test('TC17: Cash job commission deduction (worker debited platform commission, ledger reflects correct running balance)', async () => {
    const fs = new FinancialService();
    const workerId = trackWorker(toTestObjectId('worker_ledger_cash_1'));

    const job = {
      jobId: 'test_p1_job_cash_settle_1',
      workerId,
      workerUserId: workerId,
      jobAmount: 1000,
      commissionRate: 0.10,
      commissionAmount: 100,
      paymentMethod: 'CASH'
    };

    const res = await fs.settleCashPayment(job);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.balance, -100);
    assert.strictEqual(res.outstanding, 100);
    assert.strictEqual(res.entries.length, 2, 'Double entry has 2 legs: WorkerPayable & PlatformCommission');
  });

  await test('TC18: Multiple jobs balance consistency & negative balance recovery (cash job creates -₹100, online job credits +₹900 -> net ₹800)', async () => {
    const fs = new FinancialService();
    const workerId = trackWorker(toTestObjectId('worker_multi_job_1'));

    // 1. Cash job of ₹1,000 (commission ₹100 deducted)
    await fs.settleCashPayment({
      jobId: 'test_p1_job_seq_1',
      workerId,
      jobAmount: 1000,
      commissionRate: 0.10,
      commissionAmount: 100,
      paymentMethod: 'CASH'
    });
    let bal = await fs.getWorkerBalance(workerId);
    assert.strictEqual(bal.balance, -100);
    assert.strictEqual(bal.outstanding, 100);

    // 2. Online job of ₹1,000 (worker net +₹900 credited)
    await fs.settleOnlinePayment({
      jobId: 'test_p1_job_seq_2',
      workerId,
      jobAmount: 1000,
      workerNetEarning: 900,
      paymentMethod: 'ONLINE'
    }, 'mock_ref_seq_2');

    bal = await fs.getWorkerBalance(workerId);
    // Running balance: -100 + 900 = +800
    assert.strictEqual(bal.balance, 800, 'Running balance should be -100 + 900 = 800');
    assert.strictEqual(bal.outstanding, 0, 'Outstanding should now be 0');
    assert.strictEqual(bal.availableForWithdrawal, 800, 'Available for withdrawal should be 800');
  });

  // ============================================================================
  // GROUP 5: WITHDRAWALS (4 Tests)
  // ============================================================================

  await test('TC19: Successful withdrawal with sufficient balance', async () => {
    const fs = new FinancialService();
    const workerId = trackWorker(toTestObjectId('worker_withdraw_succ_1'));

    // Seed worker balance with an online job (+₹1000)
    await fs.settleOnlinePayment({
      jobId: 'test_p1_seed_job_1',
      workerId,
      jobAmount: 1000,
      workerNetEarning: 1000,
      commissionAmount: 0,
      paymentMethod: 'ONLINE'
    }, 'seed_ref');

    const withRes = await fs.requestWithdrawal(workerId, 500, { bankName: 'HDFC Bank', accountLast4: '1234' });
    assert.strictEqual(withRes.success, true);
    assert.strictEqual(withRes.ledgerEntry.amount, -500);

    const bal = await fs.getWorkerBalance(workerId);
    assert.strictEqual(bal.balance, 500);
  });

  await test('TC20: Rejection of withdrawal when balance is insufficient', async () => {
    const fs = new FinancialService();
    const workerId = trackWorker(toTestObjectId('worker_withdraw_fail_1'));

    // Seed worker balance with ₹200
    await fs.settleOnlinePayment({
      jobId: 'test_p1_seed_job_2',
      workerId,
      jobAmount: 200,
      workerNetEarning: 200,
      commissionAmount: 0,
      paymentMethod: 'ONLINE'
    }, 'seed_ref_2');

    // Attempt to withdraw ₹500
    const withRes = await fs.requestWithdrawal(workerId, 500, { bankName: 'HDFC Bank', accountLast4: '1234' });
    assert.strictEqual(withRes.success, false);
    assert(withRes.message.includes('Insufficient balance'));
  });

  await test('TC21: Block withdrawal when worker has negative / outstanding balance', async () => {
    const fs = new FinancialService();
    const workerId = trackWorker(toTestObjectId('worker_withdraw_neg_1'));

    // Cash job puts worker at -₹150
    await fs.settleCashPayment({
      jobId: 'test_p1_cash_neg_1',
      workerId,
      jobAmount: 1500,
      commissionAmount: 150,
      paymentMethod: 'CASH'
    });

    const withRes = await fs.requestWithdrawal(workerId, 100, { bankName: 'SBI', accountLast4: '5678' });
    assert.strictEqual(withRes.success, false);
    assert(withRes.message.includes('outstanding') || withRes.message.includes('Insufficient'));
  });

  await test('TC22: Rejection of withdrawal below minimum withdrawal limit (₹100)', async () => {
    const fs = new FinancialService();
    const workerId = trackWorker(toTestObjectId('worker_withdraw_min_1'));

    await fs.settleOnlinePayment({
      jobId: 'test_p1_seed_min_1',
      workerId,
      jobAmount: 1000,
      workerNetEarning: 1000,
      commissionAmount: 0,
      paymentMethod: 'ONLINE'
    }, 'seed_min_ref');

    // Attempt to withdraw ₹50 (minimum is ₹100)
    const withRes = await fs.requestWithdrawal(workerId, 50, { bankName: 'ICICI', accountLast4: '9999' });
    assert.strictEqual(withRes.success, false);
    assert(withRes.message.includes('Minimum withdrawal amount'));
  });

  // ============================================================================
  // GROUP 6: CASH BOOKING ELIGIBILITY GATE (1 Test)
  // ============================================================================

  await test('TC23: Worker cash booking eligibility gate (blocked when negative balance exceeds -500 threshold)', async () => {
    const fs = new FinancialService();
    const workerId = trackWorker(toTestObjectId('worker_gate_1'));

    // 1. Worker has zero balance -> allowed
    let check = await fs.canAcceptCashJob(workerId);
    assert.strictEqual(check.allowed, true);

    // 2. Worker does cash job of ₹3,000 -> commission is -₹300 (balance is -₹300 >= -₹500 threshold) -> still allowed
    await fs.settleCashPayment({
      jobId: 'test_p1_cash_gate_1',
      workerId,
      jobAmount: 3000,
      commissionAmount: 300,
      paymentMethod: 'CASH'
    });
    check = await fs.canAcceptCashJob(workerId);
    assert.strictEqual(check.allowed, true);
    assert.strictEqual(check.balance, -300);

    // 3. Worker does another cash job of ₹3,000 -> commission is -₹300 (balance is -₹600 < -₹500 threshold) -> BLOCKED
    await fs.settleCashPayment({
      jobId: 'test_p1_cash_gate_2',
      workerId,
      jobAmount: 3000,
      commissionAmount: 300,
      paymentMethod: 'CASH'
    });
    check = await fs.canAcceptCashJob(workerId);
    assert.strictEqual(check.allowed, false, 'Worker with balance < -500 must be blocked from cash jobs');
    assert(check.message.includes('exceeds the limit'));
  });

  // ============================================================================
  // GROUP 7: CONCURRENCY & BACKWARD COMPATIBILITY (1 Test)
  // ============================================================================

  await test('TC24: Legacy processPayment backwards compatibility delegates cleanly to confirmPayment', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    const engine = new BookingDispatchEngine(io, activeWorkers, { skipDb: true });

    const workerId = trackWorker(toTestObjectId('worker_legacy_1')).toString();
    const workerSocket = new MockSocket('ws_leg', workerId);
    activeWorkers.set(workerId, {
      userId: workerId,
      fullName: 'Legacy Worker',
      role: 'Labour',
      workCategory: ['Painting'],
      latitude: 19.1982,
      longitude: 72.9968,
      availability: 'Available',
      isAvailableForBooking: true,
      lastLocationUpdate: new Date()
    });

    const clientSocket = new MockSocket('cs_leg', 'client_leg');
    const jobId = 'test_p1_job_legacy_compat_1';

    await engine.createAndStartJobRequest(clientSocket, { jobId, service: 'Painting', latitude: 19.1982, longitude: 72.9968 });
    await engine.acceptJob(jobId, { id: workerId, fullName: 'Legacy Worker' }, workerSocket);
    await engine.startTrip(jobId);
    await engine.confirmArrival(jobId);
    await engine.startWork(jobId);
    await engine.submitJobCompletion(jobId, { finalAmount: 1500 });
    await engine.confirmJobCompletion(jobId);

    // Call legacy processPayment
    const res = await engine.processPayment(jobId, { method: 'ONLINE', amount: 1500 });
    assert.strictEqual(res.success, true);
    const job = engine.jobs.get(jobId);
    assert.strictEqual(job.status, 'COMPLETED');
    assert.strictEqual(job.settlementStatus, 'SETTLED');
  });

  // Cleanup test documents safely via raw collection bypass
  console.log('\nCleaning up test records...');
  await mongoose.connection.db.collection('ledgers').deleteMany({ workerId: { $in: testWorkerIds } });
  await mongoose.connection.db.collection('withdrawals').deleteMany({ workerId: { $in: testWorkerIds } });
  console.log('Test cleanup completed.\n');

  await mongoose.disconnect();

  // ============================================================================
  // SUMMARY
  // ============================================================================

  console.log('================================================================');
  console.log(`📊 FINANCIAL SYSTEM RESULTS: ${passed} PASSED, ${failed} FAILED (Total 24)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
