// backend/test/test_phase35_gateway_fees.js
// Phase 3.5 Test: Gateway Fees, GST, Settlement Clearing, and Refund Fee Treatment
// Verifies that gateway processing fees and GST are properly accounted for in the ledger
// without affecting worker earnings or platform commission calculations.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');
const assert = require('assert');

const Ledger = require('../models/Ledger');
const PaymentOrder = require('../models/PaymentOrder');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const TEST_WORKER_ID = new mongoose.Types.ObjectId();
const JOB_ID_PREFIX = `test_p35_${Date.now()}_`;
let financialService;

async function cleanup() {
  const testIdempotencyPattern = new RegExp(`${JOB_ID_PREFIX}`);
  await Ledger.collection.deleteMany({ jobId: testIdempotencyPattern });
  await Ledger.collection.deleteMany({ idempotencyKey: testIdempotencyPattern });
  // Also clean up gateway_settlement test entries
  await Ledger.collection.deleteMany({ idempotencyKey: /^gateway_settlement_test_settle_/ });
  await PaymentOrder.collection.deleteMany({ orderId: /^test_p35_/ });
}

function logResult(name, pass) {
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'}: ${name}`);
}

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    logResult(name, true);
    passed++;
  } else {
    logResult(name, false);
    failed++;
  }
}

async function getPostingLegs(idempotencyKey) {
  return Ledger.find({ idempotencyKey }).sort({ legIndex: 1 }).lean();
}

// ═══════════════════════════════════════════════════════
// TEST 1: Chart of Accounts contains new expense accounts
// ═══════════════════════════════════════════════════════
async function testChartOfAccounts() {
  const coa = Ledger.CHART_OF_ACCOUNTS;
  check('ChartOfAccounts includes Expenses:PaymentGatewayFees', coa.includes('Expenses:PaymentGatewayFees'));
  check('ChartOfAccounts includes Expenses:GatewayGST', coa.includes('Expenses:GatewayGST'));
  check('ChartOfAccounts still includes Assets:GatewayClearing', coa.includes('Assets:GatewayClearing'));
  check('ChartOfAccounts still includes Liabilities:WorkerPayable', coa.includes('Liabilities:WorkerPayable'));
  check('ChartOfAccounts still includes Revenue:PlatformCommission', coa.includes('Revenue:PlatformCommission'));
}

// ═══════════════════════════════════════════════════════
// TEST 2: Online settlement WITH gateway fees produces 5-leg posting
// Customer pays ₹2,000 (200000 paise)
// Razorpay fee: ₹40 (4000 paise), GST on fee: ₹7.20 (720 paise)
// Worker earning: ₹1,800 (180000 paise), Commission: ₹200 (20000 paise)
// Gateway net receivable: ₹2,000 - ₹40 - ₹7.20 = ₹1,952.80 (195280 paise)
// ═══════════════════════════════════════════════════════
async function testOnlineSettlementWithFees() {
  const jobId = `${JOB_ID_PREFIX}online_fees_1`;
  const job = {
    jobId,
    workerId: TEST_WORKER_ID,
    workerUserId: TEST_WORKER_ID,
    jobAmount: 2000,
    commissionAmount: 200,
    workerNetEarning: 1800,
    service: 'plumbing',
    commissionRate: 0.10
  };

  const result = await financialService.settleOnlinePayment(
    job,
    'pay_test_razorpay_123',
    null,
    { gatewayFeeInPaise: 4000, gatewayTaxInPaise: 720 }
  );

  check('Online+fees: settles successfully', result.success === true);

  const legs = await getPostingLegs(`online_earning_${jobId}`);
  check('Online+fees: 5 ledger legs created', legs.length === 5);

  // Verify each leg
  const gatewayLeg = legs.find(l => l.account === 'Assets:GatewayClearing' && l.entryType === 'DEBIT');
  const workerLeg = legs.find(l => l.account === 'Liabilities:WorkerPayable' && l.entryType === 'CREDIT');
  const commLeg = legs.find(l => l.account === 'Revenue:PlatformCommission' && l.entryType === 'CREDIT');
  const feeLeg = legs.find(l => l.account === 'Expenses:PaymentGatewayFees' && l.entryType === 'DEBIT');
  const gstLeg = legs.find(l => l.account === 'Expenses:GatewayGST' && l.entryType === 'DEBIT');

  check('Online+fees: GatewayClearing = ₹1,952.80 (net)', gatewayLeg?.amountInPaise === 195280);
  check('Online+fees: WorkerPayable = ₹1,800', workerLeg?.amountInPaise === 180000);
  check('Online+fees: PlatformCommission = ₹200', commLeg?.amountInPaise === 20000);
  check('Online+fees: PaymentGatewayFees = ₹40', feeLeg?.amountInPaise === 4000);
  check('Online+fees: GatewayGST = ₹7.20', gstLeg?.amountInPaise === 720);

  // CRITICAL: Double-entry balance check
  let totalDebits = 0;
  let totalCredits = 0;
  for (const leg of legs) {
    if (leg.entryType === 'DEBIT') totalDebits += leg.amountInPaise;
    else totalCredits += leg.amountInPaise;
  }
  check('Online+fees: Debits === Credits (zero-sum)', totalDebits === totalCredits);
  check('Online+fees: Total debits = ₹2,000', totalDebits === 200000);

  // CRITICAL: Worker earning UNCHANGED by gateway fees
  check('Online+fees: Worker earning NOT reduced by fees', workerLeg?.amountInPaise === 180000);
}

// ═══════════════════════════════════════════════════════
// TEST 3: Online settlement WITHOUT gateway fees (backward compatibility)
// When fee data is not available (e.g., mock provider), should fallback to 3-leg posting
// ═══════════════════════════════════════════════════════
async function testOnlineSettlementWithoutFees() {
  const jobId = `${JOB_ID_PREFIX}online_nofees_1`;
  const job = {
    jobId,
    workerId: TEST_WORKER_ID,
    workerUserId: TEST_WORKER_ID,
    jobAmount: 1000,
    commissionAmount: 100,
    workerNetEarning: 900,
    service: 'cleaning'
  };

  const result = await financialService.settleOnlinePayment(
    job,
    'pay_mock_456',
    null,
    null // No gateway fees
  );

  check('Online(no fees): settles successfully', result.success === true);

  const legs = await getPostingLegs(`online_earning_${jobId}`);
  check('Online(no fees): 3 ledger legs (backward compat)', legs.length === 3);

  const gatewayLeg = legs.find(l => l.account === 'Assets:GatewayClearing');
  check('Online(no fees): GatewayClearing = ₹1,000 (gross, no fee deduction)', gatewayLeg?.amountInPaise === 100000);

  // No expense legs
  const feeLeg = legs.find(l => l.account === 'Expenses:PaymentGatewayFees');
  const gstLeg = legs.find(l => l.account === 'Expenses:GatewayGST');
  check('Online(no fees): No fee expense leg', !feeLeg);
  check('Online(no fees): No GST expense leg', !gstLeg);

  // Balance check
  let totalDebits = 0, totalCredits = 0;
  for (const leg of legs) {
    if (leg.entryType === 'DEBIT') totalDebits += leg.amountInPaise;
    else totalCredits += leg.amountInPaise;
  }
  check('Online(no fees): Debits === Credits', totalDebits === totalCredits);
}

// ═══════════════════════════════════════════════════════
// TEST 4: Full refund with gateway fees (non-refundable fee treatment)
// ═══════════════════════════════════════════════════════
async function testFullRefundWithFees() {
  // First settle a payment WITH fees
  const jobId = `${JOB_ID_PREFIX}refund_full_1`;
  const job = {
    jobId,
    workerId: TEST_WORKER_ID,
    workerUserId: TEST_WORKER_ID,
    jobAmount: 2000,
    commissionAmount: 200,
    workerNetEarning: 1800,
    service: 'plumbing'
  };

  await financialService.settleOnlinePayment(
    job, 'pay_rfnd_full', null,
    { gatewayFeeInPaise: 4000, gatewayTaxInPaise: 720 }
  );

  // Now refund the full ₹2,000
  const refundResult = await financialService.refundOnlinePayment({
    jobId,
    orderId: 'order_rfnd_full_test',
    refundAmountInPaise: 200000,
    reason: 'Full refund test'
  });

  check('FullRefund: processes successfully', refundResult.success === true);

  // GatewayClearing credit should be NET (₹1,952.80) — the amount originally recorded
  check('FullRefund: GatewayClearing credit = ₹1,952.80 (net)',
    refundResult.gatewayClearingCredit === 195280);
  // Fee/GST are reversed (expense reduction) to balance the posting
  check('FullRefund: Reversed fee = ₹40',
    refundResult.reversedFee === 4000);
  check('FullRefund: Reversed GST = ₹7.20',
    refundResult.reversedGst === 720);

  // Verify refund posting is balanced (5 legs)
  const refundEntries = refundResult.entries;
  check('FullRefund: 5 refund legs created', refundEntries.length === 5);

  let totalDebits = 0, totalCredits = 0;
  for (const leg of refundEntries) {
    if (leg.entryType === 'DEBIT') totalDebits += leg.amountInPaise;
    else totalCredits += leg.amountInPaise;
  }
  
  // Debits: WorkerPayable 180000 + Commission 20000 = 200000
  // Credits: GatewayClearing 195280 + Fee 4000 + GST 720 = 200000
  console.log(`  Refund posting: Debits=${totalDebits}, Credits=${totalCredits}`);
  check('FullRefund: Posting is balanced (Debits === Credits)', totalDebits === totalCredits);
  check('FullRefund: Total = ₹2,000', totalDebits === 200000);
}

// ═══════════════════════════════════════════════════════
// TEST 5: Refund WITHOUT original fee legs (backward compat for legacy postings)
// ═══════════════════════════════════════════════════════
async function testRefundWithoutFees() {
  const jobId = `${JOB_ID_PREFIX}refund_nofee_1`;
  const job = {
    jobId,
    workerId: TEST_WORKER_ID,
    workerUserId: TEST_WORKER_ID,
    jobAmount: 1000,
    commissionAmount: 100,
    workerNetEarning: 900,
    service: 'cleaning'
  };

  // Settle WITHOUT fees (mock provider)
  await financialService.settleOnlinePayment(job, 'pay_mock_rfnd', null, null);

  const refundResult = await financialService.refundOnlinePayment({
    jobId,
    orderId: 'order_rfnd_nofee_test',
    refundAmountInPaise: 100000,
    reason: 'Backward compat refund test'
  });

  check('RefundNoFees: processes successfully', refundResult.success === true);
  check('RefundNoFees: GatewayClearing credit = ₹1,000 (full, no fee deduction)',
    refundResult.gatewayClearingCredit === 100000);
  check('RefundNoFees: Reversed fee = 0', refundResult.reversedFee === 0);
  check('RefundNoFees: Reversed GST = 0', refundResult.reversedGst === 0);

  // Balance check
  const refundEntries = refundResult.entries;
  let totalDebits = 0, totalCredits = 0;
  for (const leg of refundEntries) {
    if (leg.entryType === 'DEBIT') totalDebits += leg.amountInPaise;
    else totalCredits += leg.amountInPaise;
  }
  check('RefundNoFees: Posting is balanced', totalDebits === totalCredits);
}

// ═══════════════════════════════════════════════════════
// TEST 6: recordGatewaySettlement clears GatewayClearing to BankClearing
// ═══════════════════════════════════════════════════════
async function testGatewaySettlement() {
  const result = await financialService.recordGatewaySettlement({
    settlementId: 'test_settle_001',
    settlementAmountInPaise: 195280,
    paymentOrderIds: [],
    metadata: { testRun: true }
  });

  check('GatewaySettlement: processes successfully', result.success === true);
  check('GatewaySettlement: returns correct amount', result.settlementAmountInPaise === 195280);

  const legs = await getPostingLegs(`gateway_settlement_test_settle_001`);
  check('GatewaySettlement: 2 ledger legs created', legs.length === 2);

  const bankLeg = legs.find(l => l.account === 'Assets:BankClearing' && l.entryType === 'DEBIT');
  const clearingLeg = legs.find(l => l.account === 'Assets:GatewayClearing' && l.entryType === 'CREDIT');
  check('GatewaySettlement: BankClearing DEBIT = ₹1,952.80', bankLeg?.amountInPaise === 195280);
  check('GatewaySettlement: GatewayClearing CREDIT = ₹1,952.80', clearingLeg?.amountInPaise === 195280);

  // Balance check
  let totalDebits = 0, totalCredits = 0;
  for (const leg of legs) {
    if (leg.entryType === 'DEBIT') totalDebits += leg.amountInPaise;
    else totalCredits += leg.amountInPaise;
  }
  check('GatewaySettlement: Posting is balanced', totalDebits === totalCredits);
}

// ═══════════════════════════════════════════════════════
// TEST 7: recordGatewaySettlement idempotency
// ═══════════════════════════════════════════════════════
async function testGatewaySettlementIdempotency() {
  const result1 = await financialService.recordGatewaySettlement({
    settlementId: 'test_settle_idemp_001',
    settlementAmountInPaise: 50000,
    paymentOrderIds: []
  });
  const result2 = await financialService.recordGatewaySettlement({
    settlementId: 'test_settle_idemp_001',
    settlementAmountInPaise: 50000,
    paymentOrderIds: []
  });

  check('GatewaySettlement idempotent: both succeed', result1.success && result2.success);
  check('GatewaySettlement idempotent: second is alreadyProcessed', result2.alreadyProcessed === true);
}

// ═══════════════════════════════════════════════════════
// TEST 8: PaymentOrder model has new fee fields
// ═══════════════════════════════════════════════════════
async function testPaymentOrderFeeFields() {
  const order = new PaymentOrder({
    orderId: 'test_p35_order_fields',
    jobId: `${JOB_ID_PREFIX}model_test`,
    customerId: TEST_WORKER_ID,
    amountInPaise: 200000,
    gateway: 'mock',
    gatewayOrderId: 'mock_gw_001',
    gatewayFeeInPaise: 4000,
    gatewayTaxInPaise: 720,
    gatewaySettlementAmountInPaise: 195280,
    settlementStatus: 'UNSETTLED'
  });
  await order.save();

  const fetched = await PaymentOrder.findOne({ orderId: 'test_p35_order_fields' });
  check('PaymentOrder: gatewayFeeInPaise stored', fetched.gatewayFeeInPaise === 4000);
  check('PaymentOrder: gatewayTaxInPaise stored', fetched.gatewayTaxInPaise === 720);
  check('PaymentOrder: gatewaySettlementAmountInPaise stored', fetched.gatewaySettlementAmountInPaise === 195280);
  check('PaymentOrder: settlementStatus default UNSETTLED', fetched.settlementStatus === 'UNSETTLED');

  // Clean up
  await PaymentOrder.deleteOne({ orderId: 'test_p35_order_fields' });
}

// ═══════════════════════════════════════════════════════
// TEST 9: GATEWAY_SETTLEMENT type accepted in schema
// ═══════════════════════════════════════════════════════
async function testGatewaySettlementTypeAccepted() {
  const entry = new Ledger({
    postingId: `post_type_test_${Date.now()}`,
    legIndex: 0,
    idempotencyKey: `${JOB_ID_PREFIX}type_test`,
    account: 'Assets:GatewayClearing',
    entryType: 'CREDIT',
    amountInPaise: 1000,
    type: 'GATEWAY_SETTLEMENT'
  });

  let validationError = null;
  try {
    await entry.validate();
  } catch (e) {
    validationError = e;
  }
  check('Schema: GATEWAY_SETTLEMENT type is valid', validationError === null);
}

// ═══════════════════════════════════════════════════════
// TEST 10: Worker earning unaffected by gateway fee math
// Online ₹2,000 with ₹40 fee + ₹7.20 GST: worker still gets ₹1,800
// ═══════════════════════════════════════════════════════
async function testWorkerEarningUnaffected() {
  const jobId = `${JOB_ID_PREFIX}worker_unaffected`;
  const job = {
    jobId,
    workerId: TEST_WORKER_ID,
    workerUserId: TEST_WORKER_ID,
    jobAmount: 2000,
    commissionAmount: 200,
    workerNetEarning: 1800,
    service: 'electrical'
  };

  await financialService.settleOnlinePayment(
    job, 'pay_worker_unaffected', null,
    { gatewayFeeInPaise: 4000, gatewayTaxInPaise: 720 }
  );

  const legs = await getPostingLegs(`online_earning_${jobId}`);
  const workerLeg = legs.find(l => l.account === 'Liabilities:WorkerPayable' && l.entryType === 'CREDIT');
  const commLeg = legs.find(l => l.account === 'Revenue:PlatformCommission' && l.entryType === 'CREDIT');

  check('WorkerUnaffected: Worker earning = ₹1,800 exactly', workerLeg?.amountInPaise === 180000);
  check('WorkerUnaffected: Commission = ₹200 exactly', commLeg?.amountInPaise === 20000);
  check('WorkerUnaffected: Worker + Comm = ₹2,000 (customer gross)', 
    (workerLeg?.amountInPaise || 0) + (commLeg?.amountInPaise || 0) === 200000);
}

// ═══════════════════════════════════════════════════════
// MAIN RUNNER
// ═══════════════════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('Phase 3.5 Test Suite: Gateway Fees, GST, Settlement');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!MONGO_URI) {
    console.error('❌ MONGODB_URI not set. Cannot run tests.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 15000
    });
    console.log('Connected to MongoDB\n');

    // Initialize FinancialService
    const FinancialService = require('../services/FinancialService');
    financialService = new FinancialService();

    await cleanup();

    await testChartOfAccounts();
    console.log('');
    await testOnlineSettlementWithFees();
    console.log('');
    await testOnlineSettlementWithoutFees();
    console.log('');
    await testFullRefundWithFees();
    console.log('');
    await testRefundWithoutFees();
    console.log('');
    await testGatewaySettlement();
    console.log('');
    await testGatewaySettlementIdempotency();
    console.log('');
    await testPaymentOrderFeeFields();
    console.log('');
    await testGatewaySettlementTypeAccepted();
    console.log('');
    await testWorkerEarningUnaffected();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed}`);
    console.log('═══════════════════════════════════════════════════════');

    await cleanup();
  } catch (err) {
    console.error('Fatal error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
