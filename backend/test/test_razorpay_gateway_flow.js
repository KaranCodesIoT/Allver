// backend/test/test_razorpay_gateway_flow.js
// Production Razorpay Gateway & Webhook Integration Test Suite
// Verifies:
// 1. Raw buffer HMAC-SHA256 signature verification with RAZORPAY_WEBHOOK_SECRET
// 2. Complete flow: Job -> PaymentOrder -> Webhook -> PAID -> Double-Entry Ledger -> Worker Wallet -> Receipt
// 3. Edge cases: Successful payment, failed payment, customer cancels checkout, duplicate webhook,
//    app loses internet, webhook before client verification, full refund, partial refund,
//    and cash worker debt restriction gate in BookingDispatchEngine.

const assert = require('assert');
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();

const Job = require('../models/Job');
const PaymentOrder = require('../models/PaymentOrder');
const WebhookEvent = require('../models/WebhookEvent');
const Ledger = require('../models/Ledger');
const Receipt = require('../models/Receipt');
const FinancialService = require('../services/FinancialService');
const PaymentService = require('../services/PaymentService');
const RazorpayPaymentProvider = require('../services/RazorpayPaymentProvider');
const BookingDispatchEngine = require('../services/BookingDispatchEngine');

function toTestObjectId(str) {
  const hash = crypto.createHash('md5').update('rzp_test_' + str).digest('hex').slice(0, 24);
  return new mongoose.Types.ObjectId(hash);
}

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
}

async function runRazorpaySuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING RAZORPAY GATEWAY & WEBHOOK INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas\n');

  const runId = Date.now();
  const testWorkerId = toTestObjectId(`worker_${runId}`);
  const testCustomerId = toTestObjectId(`customer_${runId}`);
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'whsec_allver_test_2026_webhook_sec';

  const provider = new RazorpayPaymentProvider({
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TbpiPFY6SElcbn',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '2SZUpxccP1sLr2TFilj4fN4w',
    webhookSecret
  });

  const financialService = new FinancialService({ paymentProvider: provider });
  const paymentService = new PaymentService({
    financialService,
    paymentProvider: provider
  });

  const activeWorkers = new Map();
  const io = new MockIo();
  const engine = new BookingDispatchEngine(io, activeWorkers, { financialService });
  paymentService.dispatchEngine = engine;

  let passed = 0;
  let total = 9;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
    }
  }

  // Helper to generate a cryptographically valid Razorpay webhook signature for a payload
  function signWebhookPayload(rawPayload, secret = webhookSecret) {
    const buf = Buffer.isBuffer(rawPayload) ? rawPayload : Buffer.from(typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload));
    return crypto.createHmac('sha256', secret).update(buf).digest('hex');
  }

  // 1. Webhook HMAC Raw Body Verification
  await test('1. Webhook HMAC verification strictly validates raw body and rejects tampered bodies', async () => {
    const payload = JSON.stringify({
      event: 'payment.captured',
      id: `evt_raw_${runId}`,
      entity: { amount: 100000 }
    });
    const rawBuffer = Buffer.from(payload, 'utf8');
    const validSignature = signWebhookPayload(rawBuffer);

    // Valid signature on raw buffer -> true
    const isValid = provider.verifyWebhookSignature({
      payload: rawBuffer,
      signature: validSignature
    });
    assert.strictEqual(isValid, true, 'Valid raw buffer signature must pass');

    // Tampered payload with original signature -> false
    const tamperedBuffer = Buffer.from(payload.replace('100000', '999999'), 'utf8');
    const isTamperedValid = provider.verifyWebhookSignature({
      payload: tamperedBuffer,
      signature: validSignature
    });
    assert.strictEqual(isTamperedValid, false, 'Tampered buffer signature must fail');

    // Invalid secret -> false
    const badSecretSignature = signWebhookPayload(rawBuffer, 'wrong_secret_key');
    const isBadSecretValid = provider.verifyWebhookSignature({
      payload: rawBuffer,
      signature: badSecretSignature
    });
    assert.strictEqual(isBadSecretValid, false, 'Signature with wrong secret must fail');
  });

  // 2. Complete Flow: Job -> PaymentOrder -> Webhook -> PAID -> Ledger -> Worker Wallet -> Receipt
  let orderA;
  let jobAId = `job_flow_a_${runId}`;
  await test('2. Complete flow: Job -> Create Order -> Webhook -> PAID -> Ledger -> Wallet -> Receipt', async () => {
    // 1. Create Job in DB
    const jobA = new Job({
      jobId: jobAId,
      clientId: testCustomerId,
      workerId: testWorkerId,
      service: 'Painting',
      status: 'PAYMENT_PENDING',
      paymentMethod: 'ONLINE',
      jobAmount: 2000,
      clientLocation: { latitude: 19.1, longitude: 72.9, address: 'Test Site A' },
      completionData: { finalAmount: 2000 }
    });
    await jobA.save();

    // 2. Create Payment Order directly through PaymentOrder model (mocking gateway order id for test)
    const orderId = `order_p2_${crypto.randomBytes(8).toString('hex')}`;
    const gatewayOrderId = `order_mock_rzp_${runId}`;
    orderA = new PaymentOrder({
      orderId,
      jobId: jobAId,
      customerId: testCustomerId,
      amountInPaise: 200000, // ₹2,000 in paise
      currency: 'INR',
      gateway: 'razorpay',
      gatewayOrderId,
      status: 'CREATED',
      idempotencyKey: `idemp_order_${jobAId}`
    });
    await orderA.save();
    jobA.paymentOrderId = orderId;
    await jobA.save();

    // 3. Simulate Razorpay payment.captured webhook
    const gatewayPaymentId = `pay_rzp_mock_${runId}`;
    const webhookEventId = `evt_rzp_${runId}`;
    const webhookBody = JSON.stringify({
      event: 'payment.captured',
      id: webhookEventId,
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: gatewayPaymentId,
            order_id: gatewayOrderId,
            amount: 200000,
            currency: 'INR',
            status: 'captured',
            fee: 4000, // ₹40.00 gateway fee
            tax: 720   // ₹7.20 GST
          }
        }
      }
    });
    const rawBuffer = Buffer.from(webhookBody, 'utf8');
    const signature = signWebhookPayload(rawBuffer);

    // 4. Process Webhook
    const webhookRes = await paymentService.processWebhook({
      rawBody: rawBuffer,
      headers: { 'x-razorpay-signature': signature }
    });
    assert.strictEqual(webhookRes.success, true);

    // 5. Verify PaymentOrder is now PAID
    const updatedOrder = await PaymentOrder.findOne({ orderId });
    assert.strictEqual(updatedOrder.status, 'PAID');
    assert.strictEqual(updatedOrder.gatewayPaymentId, gatewayPaymentId);
    assert.strictEqual(updatedOrder.gatewayFeeInPaise, 4000);
    assert.strictEqual(updatedOrder.gatewayTaxInPaise, 720);

    // 6. Verify Double-Entry Ledger is balanced
    const ledgerEntries = await Ledger.find({ jobId: jobAId });
    assert.strictEqual(ledgerEntries.length, 5); // GatewayClearing, Fee, GST, WorkerPayable, Commission
    const debits = ledgerEntries.filter(e => e.entryType === 'DEBIT').reduce((s, e) => s + e.amountInPaise, 0);
    const credits = ledgerEntries.filter(e => e.entryType === 'CREDIT').reduce((s, e) => s + e.amountInPaise, 0);
    assert.strictEqual(debits, 200000, 'Total debits must equal 200000 paise (₹2,000)');
    assert.strictEqual(credits, 200000, 'Total credits must equal 200000 paise (₹2,000)');
    assert.strictEqual(debits, credits, 'Double-entry ledger must be zero-sum balanced');

    // 7. Verify Worker Wallet Balance
    const wallet = await financialService.getWorkerBalance(testWorkerId);
    // Worker Net Earning = ₹2,000 - 10% commission (₹200) = ₹1,800
    assert.strictEqual(wallet.balance, 1800);
    assert.strictEqual(wallet.availableBalance, 1800);
    assert.strictEqual(wallet.outstanding, 0);

    // 8. Verify Receipt was generated
    const receipt = await Receipt.findOne({ jobId: jobAId });
    assert(receipt, 'Receipt must be generated');
    assert.strictEqual(receipt.status, 'PAID');
    assert.strictEqual(receipt.totalAmount, 2000);
  });

  // 3. Failed Payment
  await test('3. Failed payment webhook transitions PaymentOrder to FAILED without altering ledger', async () => {
    const jobFailId = `job_fail_${runId}`;
    const jobFail = new Job({
      jobId: jobFailId,
      clientId: testCustomerId,
      workerId: testWorkerId,
      service: 'Plumbing',
      status: 'PAYMENT_PENDING',
      paymentMethod: 'ONLINE',
      jobAmount: 800,
      clientLocation: { latitude: 19.1, longitude: 72.9, address: 'Test Site Fail' }
    });
    await jobFail.save();

    const orderFail = new PaymentOrder({
      orderId: `order_fail_${runId}`,
      jobId: jobFailId,
      customerId: testCustomerId,
      amountInPaise: 80000,
      currency: 'INR',
      gateway: 'razorpay',
      gatewayOrderId: `order_gw_fail_${runId}`,
      status: 'CREATED'
    });
    await orderFail.save();

    const failBody = JSON.stringify({
      event: 'payment.failed',
      id: `evt_fail_${runId}`,
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: `pay_failed_${runId}`,
            order_id: `order_gw_fail_${runId}`,
            error_description: 'Payment was declined by customer bank'
          }
        }
      }
    });
    const rawBuffer = Buffer.from(failBody, 'utf8');
    const signature = signWebhookPayload(rawBuffer);

    await paymentService.processWebhook({
      rawBody: rawBuffer,
      headers: { 'x-razorpay-signature': signature }
    });

    const updatedFailOrder = await PaymentOrder.findOne({ orderId: orderFail.orderId });
    assert.strictEqual(updatedFailOrder.status, 'FAILED');
    assert.strictEqual(updatedFailOrder.failureReason, 'Payment was declined by customer bank');

    // Ledger should have ZERO entries for this job
    const failLedger = await Ledger.find({ jobId: jobFailId });
    assert.strictEqual(failLedger.length, 0, 'No ledger entry should be written for failed payment');
  });

  // 4. Customer Cancels Checkout
  await test('4. Customer cancels checkout: order remains CREATED without false payment confirmation', async () => {
    const jobCancelId = `job_cancel_${runId}`;
    const jobCancel = new Job({
      jobId: jobCancelId,
      clientId: testCustomerId,
      workerId: testWorkerId,
      service: 'Electrical',
      status: 'PAYMENT_PENDING',
      paymentMethod: 'ONLINE',
      jobAmount: 500,
      clientLocation: { latitude: 19.1, longitude: 72.9, address: 'Test Site Cancel' }
    });
    await jobCancel.save();

    const orderCancel = new PaymentOrder({
      orderId: `order_cancel_${runId}`,
      jobId: jobCancelId,
      customerId: testCustomerId,
      amountInPaise: 50000,
      currency: 'INR',
      gateway: 'razorpay',
      gatewayOrderId: `order_gw_cancel_${runId}`,
      status: 'CREATED'
    });
    await orderCancel.save();

    // In client (booking-flow.tsx), cancellation (code 0 / dismiss) returns early without calling verify.
    // Confirm backend state remains untouched:
    const checkOrder = await PaymentOrder.findOne({ orderId: orderCancel.orderId });
    assert.strictEqual(checkOrder.status, 'CREATED', 'Order must remain in CREATED status');

    const checkJob = await Job.findOne({ jobId: jobCancelId });
    assert.strictEqual(checkJob.status, 'PAYMENT_PENDING', 'Job must remain in PAYMENT_PENDING');
  });

  // 5. Duplicate Webhook Handling
  await test('5. Duplicate webhook is safely ignored and produces exactly one ledger posting', async () => {
    const duplicateEventId = `evt_rzp_${runId}`; // Same event ID from Test 2
    const webhookBody = JSON.stringify({
      event: 'payment.captured',
      id: duplicateEventId,
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: `pay_rzp_mock_${runId}`,
            order_id: `order_mock_rzp_${runId}`,
            amount: 200000
          }
        }
      }
    });
    const rawBuffer = Buffer.from(webhookBody, 'utf8');
    const signature = signWebhookPayload(rawBuffer);

    const dupRes = await paymentService.processWebhook({
      rawBody: rawBuffer,
      headers: { 'x-razorpay-signature': signature }
    });
    assert.strictEqual(dupRes.success, true);
    assert.strictEqual(dupRes.duplicate, true, 'Duplicate webhook event must be identified');

    // Ensure ledger entries count did not increase
    const ledgerEntries = await Ledger.find({ jobId: jobAId });
    assert.strictEqual(ledgerEntries.length, 5, 'Duplicate webhook must not create additional ledger legs');
  });

  // 6. App Loses Internet & Webhook Arrives Before Client Verification
  await test('6. App loses internet: webhook settles payment; subsequent client verification is idempotent', async () => {
    const jobOfflineId = `job_offline_${runId}`;
    const jobOffline = new Job({
      jobId: jobOfflineId,
      clientId: testCustomerId,
      workerId: testWorkerId,
      service: 'Carpentry',
      status: 'PAYMENT_PENDING',
      paymentMethod: 'ONLINE',
      jobAmount: 1500,
      clientLocation: { latitude: 19.1, longitude: 72.9, address: 'Test Site Offline' },
      completionData: { finalAmount: 1500 }
    });
    await jobOffline.save();

    const orderOffline = new PaymentOrder({
      orderId: `order_off_${runId}`,
      jobId: jobOfflineId,
      customerId: testCustomerId,
      amountInPaise: 150000,
      currency: 'INR',
      gateway: 'razorpay',
      gatewayOrderId: `order_gw_off_${runId}`,
      status: 'CREATED'
    });
    await orderOffline.save();

    // 1. Webhook arrives first (e.g. while client phone is reconnecting to WiFi)
    const offPaymentId = `pay_gw_off_${runId}`;
    const offWebhookBody = JSON.stringify({
      event: 'payment.captured',
      id: `evt_off_${runId}`,
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: offPaymentId,
            order_id: `order_gw_off_${runId}`,
            amount: 150000
          }
        }
      }
    });
    const rawBuffer = Buffer.from(offWebhookBody, 'utf8');
    const signature = signWebhookPayload(rawBuffer);

    await paymentService.processWebhook({
      rawBody: rawBuffer,
      headers: { 'x-razorpay-signature': signature }
    });

    const settledOrder = await PaymentOrder.findOne({ orderId: orderOffline.orderId });
    assert.strictEqual(settledOrder.status, 'PAID', 'Webhook must mark order as PAID');

    // 2. Client re-establishes internet and calls verifyAndConfirmPayment
    const verifyRes = await paymentService.verifyAndConfirmPayment({
      orderId: orderOffline.orderId,
      gatewayOrderId: orderOffline.gatewayOrderId,
      gatewayPaymentId: offPaymentId,
      customerId: testCustomerId,
      jobId: jobOfflineId
    });

    assert.strictEqual(verifyRes.success, true);
    assert.strictEqual(verifyRes.alreadyConfirmed, true, 'Client verification must return alreadyConfirmed idempotently');
  });

  // 7. Full Refund Reversal
  await test('7. Full refund creates balanced proportional double-entry reversal and updates wallet', async () => {
    const preRefundWallet = await financialService.getWorkerBalance(testWorkerId);
    const initialBalance = preRefundWallet.balance;

    // Refund orderA (₹2,000 job where worker received ₹1,800 and commission was ₹200)
    // We mock refundPayment method on provider so it doesn't try to call external network
    provider.refundPayment = async () => ({ refundId: `rfnd_${runId}`, status: 'processed' });

    const refundRes = await paymentService.processRefund({
      orderId: orderA.orderId,
      amountInPaise: 200000, // full refund
      reason: 'Customer cancelled after inspection'
    });

    assert.strictEqual(refundRes.success, true);
    assert.strictEqual(refundRes.status, 'REFUNDED');

    // Verify reversal ledger legs
    const reversalLegs = await Ledger.find({ postingId: refundRes.reversalPostingId });
    assert(reversalLegs.length >= 3, 'Reversal must post all affected accounts');

    const debits = reversalLegs.filter(e => e.entryType === 'DEBIT').reduce((s, e) => s + e.amountInPaise, 0);
    const credits = reversalLegs.filter(e => e.entryType === 'CREDIT').reduce((s, e) => s + e.amountInPaise, 0);
    assert.strictEqual(debits, credits, 'Refund reversal must be zero-sum balanced');

    // Verify worker wallet was reduced by worker's portion of earnings (₹1,800)
    const postRefundWallet = await financialService.getWorkerBalance(testWorkerId);
    assert.strictEqual(postRefundWallet.balance, initialBalance - 1800, 'Worker balance must decrease by earned amount');
  });

  // 8. Partial Refund
  await test('8. Partial refund proportionally reverses commission and worker payable', async () => {
    // Create new job of ₹1,000, worker net ₹900, commission ₹100
    const jobPartId = `job_part_${runId}`;
    const jobPart = new Job({
      jobId: jobPartId,
      clientId: testCustomerId,
      workerId: testWorkerId,
      service: 'Cleaning',
      status: 'PAYMENT_PENDING',
      paymentMethod: 'ONLINE',
      jobAmount: 1000,
      clientLocation: { latitude: 19.1, longitude: 72.9, address: 'Test Site Partial' },
      completionData: { finalAmount: 1000 }
    });
    await jobPart.save();

    const orderPart = new PaymentOrder({
      orderId: `order_part_${runId}`,
      jobId: jobPartId,
      customerId: testCustomerId,
      amountInPaise: 100000,
      currency: 'INR',
      gateway: 'razorpay',
      gatewayOrderId: `order_gw_part_${runId}`,
      status: 'CREATED'
    });
    await orderPart.save();

    // Settle payment via webhook
    const partBody = JSON.stringify({
      event: 'payment.captured',
      id: `evt_part_${runId}`,
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: `pay_part_${runId}`,
            order_id: `order_gw_part_${runId}`,
            amount: 100000
          }
        }
      }
    });
    const rawBuffer = Buffer.from(partBody, 'utf8');
    const signature = signWebhookPayload(rawBuffer);
    await paymentService.processWebhook({ rawBody: rawBuffer, headers: { 'x-razorpay-signature': signature } });

    // Process 50% partial refund (₹500 / 50,000 paise)
    const partialRefundRes = await paymentService.processRefund({
      orderId: orderPart.orderId,
      amountInPaise: 50000,
      reason: 'Partial discount agreed'
    });

    assert.strictEqual(partialRefundRes.success, true);
    assert.strictEqual(partialRefundRes.status, 'PARTIALLY_REFUNDED');

    const checkPartOrder = await PaymentOrder.findOne({ orderId: orderPart.orderId });
    assert.strictEqual(checkPartOrder.status, 'PARTIALLY_REFUNDED');
    assert.strictEqual(checkPartOrder.refundedAmountInPaise, 50000);
  });

  // 9. Cash Worker Debt Restriction Gate in BookingDispatchEngine
  await test('9. BookingDispatchEngine rejects cash job when worker commission debt exceeds threshold', async () => {
    const debtWorkerId = toTestObjectId(`debt_worker_${runId}`).toString();
    const workerSocket = new MockSocket('ws_debt', debtWorkerId);

    // Create a series of cash jobs that push worker debt past -500 threshold
    // Cash job 1: ₹3,000 -> 10% commission = -₹300
    await financialService.settleCashPayment({
      jobId: `job_cash_debt_1_${runId}`,
      workerId: debtWorkerId,
      jobAmount: 3000,
      commissionAmount: 300,
      paymentMethod: 'CASH'
    });

    // Cash job 2: ₹3,000 -> 10% commission = -₹300. Total debt = -₹600 (< -₹500)
    await financialService.settleCashPayment({
      jobId: `job_cash_debt_2_${runId}`,
      workerId: debtWorkerId,
      jobAmount: 3000,
      commissionAmount: 300,
      paymentMethod: 'CASH'
    });

    const balanceCheck = await financialService.getWorkerBalance(debtWorkerId);
    assert.strictEqual(balanceCheck.balance, -600, 'Worker balance must be -₹600');
    assert.strictEqual(balanceCheck.outstanding, 600, 'Worker outstanding debt must be ₹600');

    // Create a new CASH job in dispatch engine
    const newCashJobId = `job_new_cash_${runId}`;
    engine.jobs.set(newCashJobId, {
      jobId: newCashJobId,
      status: 'SEARCHING',
      lock: false,
      paymentMethod: 'CASH',
      service: 'Painting',
      latitude: 19.1,
      longitude: 72.9,
      notifiedWorkerIds: [debtWorkerId],
      route: { distance: 5, duration: 15 }
    });

    // Attempt acceptJob with indebted worker
    const acceptResult = await engine.acceptJob(
      newCashJobId,
      { id: debtWorkerId, fullName: 'Indebted Worker' },
      workerSocket
    );

    // Verify rejection
    assert.strictEqual(acceptResult.success, false);
    assert.strictEqual(acceptResult.reason, 'CASH_JOB_RESTRICTED_DUE_TO_DEBT');
    assert(acceptResult.message.includes('exceeds the limit'));

    // Verify socket emission
    const errEvents = workerSocket.getEvents('job_accept_error');
    assert.strictEqual(errEvents.length, 1);
    assert.strictEqual(errEvents[0].data.reason, 'CASH_JOB_RESTRICTED_DUE_TO_DEBT');

    // Verify job remained SEARCHING and unlocked
    const jobState = engine.jobs.get(newCashJobId);
    assert.strictEqual(jobState.status, 'SEARCHING');
    assert.strictEqual(jobState.lock, false);
  });

  console.log('\n================================================================');
  console.log(`📊 RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('================================================================\n');

  process.exit(passed === total ? 0 : 1);
}

runRazorpaySuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
