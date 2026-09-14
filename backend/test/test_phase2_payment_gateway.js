// backend/test/test_phase2_payment_gateway.js
// Verification of Phase 2: Real Payment Gateway Integration
// Tests A through L as specified in requirements

const assert = require('assert');
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

const Job = require('../models/Job');
const PaymentOrder = require('../models/PaymentOrder');
const WebhookEvent = require('../models/WebhookEvent');
const Ledger = require('../models/Ledger');
const FinancialService = require('../services/FinancialService');
const PaymentService = require('../services/PaymentService');
const MockPaymentProvider = require('../services/MockPaymentProvider');

function toTestObjectId(str) {
  const hash = crypto.createHash('md5').update('phase2_test_' + str).digest('hex').slice(0, 24);
  return new mongoose.Types.ObjectId(hash);
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING PHASE 2: PAYMENT GATEWAY & WEBHOOK VERIFICATION SUITE');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas\n');

  const runId = Date.now();
  const testWorkerId = toTestObjectId(`worker_${runId}`);
  const testCustomerId = toTestObjectId(`customer_${runId}`);
  const foreignCustomerId = toTestObjectId(`foreign_cust_${runId}`);

  const mockProvider = new MockPaymentProvider();
  const financialService = new FinancialService({ paymentProvider: mockProvider });
  const paymentService = new PaymentService({
    financialService,
    paymentProvider: mockProvider
  });

  const createdJobIds = [];
  const createdOrderIds = [];

  // Helper to create test jobs
  async function createTestJob(jobId, price = 1000, clientId = testCustomerId) {
    createdJobIds.push(jobId);
    const job = new Job({
      jobId,
      clientId,
      workerId: testWorkerId,
      service: 'Painting',
      status: 'PAYMENT_PENDING',
      paymentMethod: 'ONLINE',
      price: `₹${price}`,
      jobAmount: price,
      clientLocation: { latitude: 19.076, longitude: 72.8777, address: 'Test Site' },
      completionData: {
        finalAmount: price,
        notes: 'Work completed',
        submittedAt: new Date()
      }
    });
    await job.save();
    return job;
  }

  let passed = 0;
  let total = 12;

  try {
    // -------------------------------------------------------------
    // Test A: Valid payment → PAID & Double-Entry Settlement
    // -------------------------------------------------------------
    console.log('Test A: Valid payment → PAID');
    const jobAId = `test_p2_job_a_${runId}`;
    await createTestJob(jobAId, 1000);

    const orderA = await paymentService.createPaymentOrder({
      jobId: jobAId,
      customerId: testCustomerId,
      description: 'Test A Payment'
    });
    assert.strictEqual(orderA.success, true);
    assert.strictEqual(orderA.amountInPaise, 100000); // ₹1,000 in paise
    createdOrderIds.push(orderA.orderId);

    // Simulate customer completing payment at gateway UI
    const gatewayPayA = mockProvider.simulateClientPaymentSuccess(orderA.gatewayOrderId);

    // Webhook event payload
    const eventAId = `evt_a_${runId}`;
    const payloadA = {
      event_id: eventAId,
      event: 'payment.captured',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: gatewayPayA.gatewayPaymentId,
            order_id: orderA.gatewayOrderId,
            amount: 100000,
            status: 'captured'
          }
        }
      }
    };
    const rawBodyA = JSON.stringify(payloadA);
    const sigA = mockProvider.generateWebhookSignature(rawBodyA);

    const webhookResA = await paymentService.processWebhook({
      rawBody: rawBodyA,
      signatureOverride: sigA
    });
    assert.strictEqual(webhookResA.success, true);

    const dbOrderA = await PaymentOrder.findOne({ orderId: orderA.orderId }).lean();
    assert.strictEqual(dbOrderA.status, 'PAID');
    assert.strictEqual(dbOrderA.gatewayPaymentId, gatewayPayA.gatewayPaymentId);
    assert(dbOrderA.ledgerPostingId, 'Order must record ledgerPostingId');

    const dbJobA = await Job.findOne({ jobId: jobAId }).lean();
    assert.strictEqual(dbJobA.status, 'COMPLETED');
    assert.strictEqual(dbJobA.paymentStatus, 'PAID');

    // Double-entry ledger verification
    const postingsA = await Ledger.find({ jobId: jobAId }).lean();
    assert.strictEqual(postingsA.length, 3);
    const sumDebitsA = postingsA.filter(p => p.entryType === 'DEBIT').reduce((acc, p) => acc + p.amountInPaise, 0);
    const sumCreditsA = postingsA.filter(p => p.entryType === 'CREDIT').reduce((acc, p) => acc + p.amountInPaise, 0);
    assert.strictEqual(sumDebitsA, sumCreditsA);
    assert.strictEqual(sumDebitsA, 100000);

    console.log('✅ Test A PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test B: Invalid webhook signature → rejected
    // -------------------------------------------------------------
    console.log('Test B: Invalid webhook signature → rejected');
    const eventBId = `evt_b_${runId}`;
    const payloadB = JSON.stringify({
      event_id: eventBId,
      event: 'payment.captured',
      created_at: Math.floor(Date.now() / 1000),
      payload: {}
    });

    let rejectedB = false;
    try {
      await paymentService.processWebhook({
        rawBody: payloadB,
        signatureOverride: 'invalid_malicious_signature_hex_12345'
      });
    } catch (err) {
      rejectedB = true;
      assert.strictEqual(err.code, 'INVALID_SIGNATURE');
    }
    assert.strictEqual(rejectedB, true, 'Must reject invalid webhook signature');
    const eventBInDb = await WebhookEvent.findOne({ eventId: eventBId });
    assert.strictEqual(eventBInDb, null, 'No WebhookEvent should be recorded for invalid signature');
    console.log('✅ Test B PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test C: Duplicate webhook → exactly one financial posting
    // -------------------------------------------------------------
    console.log('Test C: Duplicate webhook → exactly one financial posting');
    const jobCId = `test_p2_job_c_${runId}`;
    await createTestJob(jobCId, 1200);

    const orderC = await paymentService.createPaymentOrder({
      jobId: jobCId,
      customerId: testCustomerId
    });
    createdOrderIds.push(orderC.orderId);
    const gatewayPayC = mockProvider.simulateClientPaymentSuccess(orderC.gatewayOrderId);

    const eventCId = `evt_c_${runId}`;
    const payloadC = JSON.stringify({
      event_id: eventCId,
      event: 'payment.captured',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: gatewayPayC.gatewayPaymentId,
            order_id: orderC.gatewayOrderId,
            amount: 120000,
            status: 'captured'
          }
        }
      }
    });
    const sigC = mockProvider.generateWebhookSignature(payloadC);

    // Delivery 1
    const resC1 = await paymentService.processWebhook({ rawBody: payloadC, signatureOverride: sigC });
    assert.strictEqual(resC1.success, true);
    assert.strictEqual(resC1.duplicate, undefined);

    // Delivery 2 (Duplicate)
    const resC2 = await paymentService.processWebhook({ rawBody: payloadC, signatureOverride: sigC });
    assert.strictEqual(resC2.success, true);
    assert.strictEqual(resC2.duplicate, true);

    const postingsC = await Ledger.find({ jobId: jobCId }).lean();
    assert.strictEqual(postingsC.length, 3, 'Must have exactly 1 set of 3 legs');
    console.log('✅ Test C PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test D: 10 concurrent identical webhooks → exactly one financial effect
    // -------------------------------------------------------------
    console.log('Test D: 10 concurrent identical webhooks → exactly one financial effect');
    const jobDId = `test_p2_job_d_${runId}`;
    await createTestJob(jobDId, 1500);

    const orderD = await paymentService.createPaymentOrder({
      jobId: jobDId,
      customerId: testCustomerId
    });
    createdOrderIds.push(orderD.orderId);
    const gatewayPayD = mockProvider.simulateClientPaymentSuccess(orderD.gatewayOrderId);

    const eventDId = `evt_d_${runId}`;
    const payloadD = JSON.stringify({
      event_id: eventDId,
      event: 'payment.captured',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: gatewayPayD.gatewayPaymentId,
            order_id: orderD.gatewayOrderId,
            amount: 150000,
            status: 'captured'
          }
        }
      }
    });
    const sigD = mockProvider.generateWebhookSignature(payloadD);

    const concurrentWebhooks = Array.from({ length: 10 }, () =>
      paymentService.processWebhook({ rawBody: payloadD, signatureOverride: sigD })
    );

    const resultsD = await Promise.all(concurrentWebhooks);
    assert(resultsD.every(r => r.success === true));
    const duplicatesD = resultsD.filter(r => r.duplicate === true);
    console.log(`  Concurrent results: 1 processed, ${duplicatesD.length} safely detected as duplicate`);
    assert.strictEqual(duplicatesD.length, 9, '9 out of 10 must be safely marked duplicate');

    const postingsD = await Ledger.find({ jobId: jobDId }).lean();
    assert.strictEqual(postingsD.length, 3, 'Exactly 1 set of postings created under concurrency');
    console.log('✅ Test D PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test E: Client sends fake payment success → rejected
    // -------------------------------------------------------------
    console.log('Test E: Client sends fake payment success → rejected');
    const jobEId = `test_p2_job_e_${runId}`;
    await createTestJob(jobEId, 1000);

    const orderE = await paymentService.createPaymentOrder({
      jobId: jobEId,
      customerId: testCustomerId
    });
    createdOrderIds.push(orderE.orderId);

    let rejectedE = false;
    try {
      await paymentService.verifyAndConfirmPayment({
        orderId: orderE.orderId,
        gatewayOrderId: orderE.gatewayOrderId,
        gatewayPaymentId: 'fake_gateway_payment_id_99999',
        gatewaySignature: 'fake_forged_hmac_signature_00000',
        customerId: testCustomerId,
        jobId: jobEId
      });
    } catch (err) {
      rejectedE = true;
      assert(err.message.includes('verification failed'));
    }
    assert.strictEqual(rejectedE, true);

    const dbOrderE = await PaymentOrder.findOne({ orderId: orderE.orderId }).lean();
    assert.strictEqual(dbOrderE.status, 'CREATED'); // Not PAID
    assert.strictEqual(dbOrderE.failureReason, 'SIGNATURE_OR_GATEWAY_VERIFICATION_FAILED');
    console.log('✅ Test E PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test F: Client sends incorrect amount → rejected
    // -------------------------------------------------------------
    console.log('Test F: Client sends incorrect amount → rejected');
    const jobFId = `test_p2_job_f_${runId}`;
    await createTestJob(jobFId, 2000); // Authoritative is ₹2,000

    let rejectedF = false;
    try {
      await paymentService.createPaymentOrder({
        jobId: jobFId,
        customerId: testCustomerId,
        clientAmount: 500 // Client tries to pay only ₹500
      });
    } catch (err) {
      rejectedF = true;
      assert.strictEqual(err.code, 'AMOUNT_MISMATCH');
    }
    assert.strictEqual(rejectedF, true, 'Must reject client amount mismatch');
    console.log('✅ Test F PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test G: Payment gateway failure → payment remains FAILED appropriately
    // -------------------------------------------------------------
    console.log('Test G: Payment gateway failure → payment remains FAILED');
    const jobGId = `test_p2_job_g_${runId}`;
    await createTestJob(jobGId, 800);

    const orderG = await paymentService.createPaymentOrder({
      jobId: jobGId,
      customerId: testCustomerId
    });
    createdOrderIds.push(orderG.orderId);

    const eventGId = `evt_g_${runId}`;
    const payloadG = JSON.stringify({
      event_id: eventGId,
      event: 'payment.failed',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            order_id: orderG.gatewayOrderId,
            error_description: 'Card declined by issuing bank'
          }
        }
      }
    });
    const sigG = mockProvider.generateWebhookSignature(payloadG);

    await paymentService.processWebhook({ rawBody: payloadG, signatureOverride: sigG });

    const dbOrderG = await PaymentOrder.findOne({ orderId: orderG.orderId }).lean();
    assert.strictEqual(dbOrderG.status, 'FAILED');
    assert.strictEqual(dbOrderG.failureReason, 'Card declined by issuing bank');

    const postingsG = await Ledger.find({ jobId: jobGId }).lean();
    assert.strictEqual(postingsG.length, 0, 'No financial postings should exist for failed payment');
    console.log('✅ Test G PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test H: Duplicate payment-order request → no duplicate order
    // -------------------------------------------------------------
    console.log('Test H: Duplicate payment-order request → no duplicate order');
    const jobHId = `test_p2_job_h_${runId}`;
    await createTestJob(jobHId, 1000);

    const idempKeyH = `idemp_order_h_${runId}`;
    const orderH1 = await paymentService.createPaymentOrder({
      jobId: jobHId,
      customerId: testCustomerId,
      idempotencyKey: idempKeyH
    });
    createdOrderIds.push(orderH1.orderId);

    const orderH2 = await paymentService.createPaymentOrder({
      jobId: jobHId,
      customerId: testCustomerId,
      idempotencyKey: idempKeyH
    });

    assert.strictEqual(orderH1.orderId, orderH2.orderId);
    assert.strictEqual(orderH1.gatewayOrderId, orderH2.gatewayOrderId);

    const totalOrdersH = await PaymentOrder.countDocuments({ jobId: jobHId });
    assert.strictEqual(totalOrdersH, 1, 'Exactly one PaymentOrder should exist');
    console.log('✅ Test H PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test I: Refund event → correct financial reversal
    // -------------------------------------------------------------
    console.log('Test I: Refund event → correct financial reversal');
    const jobIId = `test_p2_job_i_${runId}`;
    await createTestJob(jobIId, 1000);

    const orderI = await paymentService.createPaymentOrder({
      jobId: jobIId,
      customerId: testCustomerId
    });
    createdOrderIds.push(orderI.orderId);
    const gatewayPayI = mockProvider.simulateClientPaymentSuccess(orderI.gatewayOrderId);

    // Pay first
    const payloadI = JSON.stringify({
      event_id: `evt_i_pay_${runId}`,
      event: 'payment.captured',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: gatewayPayI.gatewayPaymentId,
            order_id: orderI.gatewayOrderId,
            amount: 100000,
            status: 'captured'
          }
        }
      }
    });
    await paymentService.processWebhook({
      rawBody: payloadI,
      signatureOverride: mockProvider.generateWebhookSignature(payloadI)
    });

    // Check balance after payment (+₹900)
    const balBeforeRefund = await financialService.getWorkerBalance(testWorkerId);

    // Execute refund
    const refundRes = await paymentService.processRefund({
      orderId: orderI.orderId,
      amountInPaise: 100000,
      reason: 'Customer cancelled after payment'
    });

    assert.strictEqual(refundRes.success, true);
    assert.strictEqual(refundRes.status, 'REFUNDED');

    // Balance after refund should have debited worker's ₹900
    const balAfterRefund = await financialService.getWorkerBalance(testWorkerId);
    console.log(`  Worker balance before refund: ₹${balBeforeRefund.balance}, after refund: ₹${balAfterRefund.balance}`);
    assert.strictEqual(balAfterRefund.balance, balBeforeRefund.balance - 900);

    // Verify refund ledger entries are balanced
    const refundLegs = await Ledger.find({ jobId: jobIId, type: 'REFUND' }).lean();
    assert.strictEqual(refundLegs.length, 3);
    const sumDebitsI = refundLegs.filter(p => p.entryType === 'DEBIT').reduce((acc, p) => acc + p.amountInPaise, 0);
    const sumCreditsI = refundLegs.filter(p => p.entryType === 'CREDIT').reduce((acc, p) => acc + p.amountInPaise, 0);
    assert.strictEqual(sumDebitsI, sumCreditsI, 'Refund debits must equal credits');
    assert.strictEqual(sumDebitsI, 100000);
    console.log('✅ Test I PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test J: Restart backend between payment creation and webhook
    // -------------------------------------------------------------
    console.log('Test J: Restart backend between payment creation and webhook');
    const jobJId = `test_p2_job_j_${runId}`;
    await createTestJob(jobJId, 1000);

    const orderJ = await paymentService.createPaymentOrder({
      jobId: jobJId,
      customerId: testCustomerId
    });
    createdOrderIds.push(orderJ.orderId);
    const gatewayPayJ = mockProvider.simulateClientPaymentSuccess(orderJ.gatewayOrderId);

    // Simulate backend restart by creating fresh instances reading from MongoDB
    const restartedFinancialService = new FinancialService({ paymentProvider: mockProvider });
    const restartedPaymentService = new PaymentService({
      financialService: restartedFinancialService,
      paymentProvider: mockProvider
    });

    const payloadJ = JSON.stringify({
      event_id: `evt_j_${runId}`,
      event: 'payment.captured',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: gatewayPayJ.gatewayPaymentId,
            order_id: orderJ.gatewayOrderId,
            amount: 100000,
            status: 'captured'
          }
        }
      }
    });

    const resJ = await restartedPaymentService.processWebhook({
      rawBody: payloadJ,
      signatureOverride: mockProvider.generateWebhookSignature(payloadJ)
    });
    assert.strictEqual(resJ.success, true);

    const dbOrderJ = await PaymentOrder.findOne({ orderId: orderJ.orderId }).lean();
    assert.strictEqual(dbOrderJ.status, 'PAID');
    console.log('✅ Test J PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test K: Invalid / Expired webhook → rejected
    // -------------------------------------------------------------
    console.log('Test K: Invalid / Expired webhook → rejected');
    // Timestamp 2 days ago (172800 seconds ago)
    const expiredPayload = JSON.stringify({
      event_id: `evt_k_expired_${runId}`,
      event: 'payment.captured',
      created_at: Math.floor(Date.now() / 1000) - 172800,
      payload: {}
    });

    let expiredRejected = false;
    try {
      await paymentService.processWebhook({
        rawBody: expiredPayload,
        signatureOverride: mockProvider.generateWebhookSignature(expiredPayload)
      });
    } catch (err) {
      expiredRejected = true;
      assert.strictEqual(err.code, 'EXPIRED_EVENT');
    }
    assert.strictEqual(expiredRejected, true, 'Expired webhook event must be rejected');

    // Missing event_id payload
    const missingIdPayload = JSON.stringify({
      event: 'payment.captured',
      created_at: Math.floor(Date.now() / 1000),
      payload: {}
    });

    let missingIdRejected = false;
    try {
      await paymentService.processWebhook({
        rawBody: missingIdPayload,
        signatureOverride: mockProvider.generateWebhookSignature(missingIdPayload)
      });
    } catch (err) {
      missingIdRejected = true;
      assert.strictEqual(err.code, 'MISSING_EVENT_ID');
    }
    assert.strictEqual(missingIdRejected, true, 'Webhook missing event_id must be rejected');
    console.log('✅ Test K PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test L: Payment for Job A cannot settle Job B
    // -------------------------------------------------------------
    console.log('Test L: Payment for Job A cannot settle Job B');
    const jobL1Id = `test_p2_job_l1_${runId}`;
    const jobL2Id = `test_p2_job_l2_${runId}`;
    await createTestJob(jobL1Id, 1000);
    await createTestJob(jobL2Id, 1000);

    const orderL1 = await paymentService.createPaymentOrder({
      jobId: jobL1Id,
      customerId: testCustomerId
    });
    createdOrderIds.push(orderL1.orderId);
    const gatewayPayL1 = mockProvider.simulateClientPaymentSuccess(orderL1.gatewayOrderId);

    let crossJobRejected = false;
    try {
      // Malicious attempt to settle jobL2 using orderL1
      await paymentService.verifyAndConfirmPayment({
        orderId: orderL1.orderId,
        gatewayOrderId: orderL1.gatewayOrderId,
        gatewayPaymentId: gatewayPayL1.gatewayPaymentId,
        gatewaySignature: gatewayPayL1.signature,
        customerId: testCustomerId,
        jobId: jobL2Id // Mismatch!
      });
    } catch (err) {
      crossJobRejected = true;
      assert.strictEqual(err.code, 'JOB_MISMATCH');
    }
    assert.strictEqual(crossJobRejected, true, 'Cross-job payment settlement must be rejected');

    // Malicious attempt by foreign customer to settle another customer's order
    let foreignRejected = false;
    try {
      await paymentService.verifyAndConfirmPayment({
        orderId: orderL1.orderId,
        gatewayOrderId: orderL1.gatewayOrderId,
        gatewayPaymentId: gatewayPayL1.gatewayPaymentId,
        gatewaySignature: gatewayPayL1.signature,
        customerId: foreignCustomerId, // Foreign user!
        jobId: jobL1Id
      });
    } catch (err) {
      foreignRejected = true;
      assert.strictEqual(err.code, 'UNAUTHORIZED');
    }
    assert.strictEqual(foreignRejected, true, 'Unauthorized customer access must be rejected');
    console.log('✅ Test L PASSED\n');
    passed++;

  } finally {
    // Teardown cleanup
    console.log('Cleaning up test records from database...');
    try {
      if (createdJobIds.length > 0) {
        await Job.deleteMany({ jobId: { $in: createdJobIds } });
        await mongoose.connection.db.collection('ledgers').deleteMany({ jobId: { $in: createdJobIds } });
      }
      if (createdOrderIds.length > 0) {
        await PaymentOrder.deleteMany({ orderId: { $in: createdOrderIds } });
      }
      await WebhookEvent.deleteMany({ eventId: { $regex: new RegExp(`_${runId}`) } });
      console.log('Cleanup completed successfully.');
    } catch (cleanErr) {
      console.error('Cleanup warning:', cleanErr.message);
    }
    await mongoose.disconnect();
  }

  console.log('================================================================');
  console.log(`📊 PHASE 2 VERIFICATION RESULTS: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error in Phase 2 suite:', err);
  process.exit(1);
});
