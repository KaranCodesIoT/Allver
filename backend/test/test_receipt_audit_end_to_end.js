// backend/test/test_receipt_audit_end_to_end.js
// End-to-End Audit & Verification Suite for Payment Receipt System:
// 1. Authoritative payment confirmation requirement (no receipt before payment)
// 2. Duplicate webhook / payment confirmation idempotency (single receipt)
// 3. Exact amount matching between PaymentOrder, Job, and Receipt
// 4. GST & tax language exclusion when isGstRegistered=false
// 5. Strict participant authorization: IDOR protection (customer B cannot download customer A's receipt)

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const assert = require('assert');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Job = require('../models/Job');
const User = require('../models/User');
const Receipt = require('../models/Receipt');
const PaymentOrder = require('../models/PaymentOrder');
const WebhookEvent = require('../models/WebhookEvent');
const Ledger = require('../models/Ledger');
const PaymentService = require('../services/PaymentService');
const FinancialService = require('../services/FinancialService');
const MockPaymentProvider = require('../services/MockPaymentProvider');
const authenticateJWT = require('../middleware/auth');
const { getBusinessConfig } = require('../config/businessConfig');

async function runAudit() {
  console.log('================================================================');
  console.log('STARTING PAYMENT RECEIPT END-TO-END AUDIT & SECURITY SUITE');
  console.log('================================================================\n');

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required in .env');
  }

  await mongoose.connect(mongoUri);
  console.log(' Connected to MongoDB Atlas.\n');

  const testSuffix = Date.now();
  let passedCount = 0;
  let failedCount = 0;

  function pass(id, detail) {
    passedCount++;
    console.log(` PASS [${id}]: ${detail}`);
  }

  function fail(id, err) {
    failedCount++;
    console.error(` FAIL [${id}]:`, err.message || err);
  }

  // Set up mock payment services
  const mockProvider = new MockPaymentProvider();
  const financialService = new FinancialService({ paymentProvider: mockProvider });
  const paymentService = new PaymentService({ paymentProvider: mockProvider, financialService });

  // Spin up an Express test server on an ephemeral port
  const app = express();
  app.use(express.json());

  // Mount identical receipt endpoints from index.js
  app.get('/api/payment/receipt/:jobId', authenticateJWT, async (req, res) => {
    try {
      const { jobId } = req.params;
      const requesterId = req.userId?.toString();
      let receipt = await Receipt.findOne({ jobId });

      if (!receipt) {
        const job = await Job.findOne({ jobId });
        if (!job) {
          return res.status(404).json({ success: false, message: 'Receipt not found for this job' });
        }

        const isJobCustomer = job.clientId && job.clientId.toString() === requesterId;
        const isJobWorker = (job.workerId && job.workerId.toString() === requesterId) || 
                            (job.workerUserId && job.workerUserId.toString() === requesterId);
        if (!isJobCustomer && !isJobWorker) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: You are not authorized to view this receipt'
          });
        }

        if (job.paymentStatus !== 'PAID') {
          return res.status(404).json({
            success: false,
            message: 'Receipt not available: job payment is not yet confirmed'
          });
        }

        const paymentOrder = await PaymentOrder.findOne({ jobId: job.jobId, status: 'PAID' });
        const amt = paymentOrder ? (paymentOrder.amountInPaise / 100) : (job.jobAmount || (job.payment && job.payment.amount));
        if (!amt || amt <= 0) {
          return res.status(404).json({ success: false, message: 'Authoritative payment amount not found' });
        }

        const fee = job.commissionAmount || (job.payment && job.payment.platformFee) || 0;
        const receiptNum = `ALV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        try {
          receipt = await Receipt.create({
            receiptNumber: receiptNum,
            jobId: job.jobId,
            orderId: paymentOrder?.orderId || job.paymentOrderId || `ord_${job.jobId}`,
            customerId: job.clientId,
            workerId: job.workerId || job.workerUserId || job.clientId,
            customerName: job.clientInfo?.name || 'Customer',
            customerPhone: job.clientInfo?.phone || '',
            workerName: job.workerInfo?.name || 'Service Professional',
            workerPhone: job.workerInfo?.phone || '',
            serviceName: job.service || 'Home Service',
            currency: paymentOrder?.currency || 'INR',
            baseAmount: amt,
            platformFee: fee,
            totalAmount: amt,
            totalAmountInPaise: Math.round(amt * 100),
            paymentMethod: job.paymentMethod === 'CASH' ? 'Cash' : 'Online UPI',
            gateway: paymentOrder?.gateway || 'razorpay',
            gatewayPaymentId: paymentOrder?.gatewayPaymentId || job.paymentProviderRef || '',
            gatewayOrderId: paymentOrder?.gatewayOrderId || job.paymentOrderId || '',
            status: 'PAID',
            issuedAt: job.settledAt || job.completedAt || new Date(),
            businessDetails: getBusinessConfig()
          });
          job.receiptNumber = receipt.receiptNumber;
          job.receiptId = receipt._id;
          await job.save();
        } catch (createErr) {
          if (createErr.code === 11000) {
            receipt = await Receipt.findOne({ jobId });
          } else {
            console.error('[Receipt Create Error]:', createErr);
          }
        }
      }

      if (!receipt) {
        return res.status(404).json({ success: false, message: 'Receipt not found for this job' });
      }

      const isCustomer = receipt.customerId && receipt.customerId.toString() === requesterId;
      const isWorker = receipt.workerId && receipt.workerId.toString() === requesterId;

      if (!isCustomer && !isWorker) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are not authorized to view this receipt'
        });
      }

      return res.json({ success: true, receipt });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get('/api/payment/receipt/:jobId/download', authenticateJWT, async (req, res) => {
    try {
      const { jobId } = req.params;
      const requesterId = req.userId?.toString();
      let receipt = await Receipt.findOne({ jobId });

      if (!receipt) {
        const job = await Job.findOne({ jobId });
        if (!job) {
          return res.status(404).send('<h2>Receipt not found.</h2>');
        }

        const isJobCustomer = job.clientId && job.clientId.toString() === requesterId;
        const isJobWorker = (job.workerId && job.workerId.toString() === requesterId) || 
                            (job.workerUserId && job.workerUserId.toString() === requesterId);
        if (!isJobCustomer && !isJobWorker) {
          return res.status(403).send('<h2>403 Forbidden: You are not authorized to view this receipt.</h2>');
        }

        if (job.paymentStatus !== 'PAID') {
          return res.status(404).send('<h2>Receipt not found or job payment is not yet confirmed.</h2>');
        }

        const paymentOrder = await PaymentOrder.findOne({ jobId: job.jobId, status: 'PAID' });
        const amt = paymentOrder ? (paymentOrder.amountInPaise / 100) : (job.jobAmount || (job.payment && job.payment.amount));
        if (!amt || amt <= 0) {
          return res.status(404).send('<h2>Receipt not found: authoritative payment amount missing.</h2>');
        }

        const fee = job.commissionAmount || (job.payment && job.payment.platformFee) || 0;
        const receiptNum = `ALV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        try {
          receipt = await Receipt.create({
            receiptNumber: receiptNum,
            jobId: job.jobId,
            orderId: paymentOrder?.orderId || job.paymentOrderId || `ord_${job.jobId}`,
            customerId: job.clientId,
            workerId: job.workerId || job.workerUserId || job.clientId,
            customerName: job.clientInfo?.name || 'Customer',
            customerPhone: job.clientInfo?.phone || '',
            workerName: job.workerInfo?.name || 'Service Professional',
            workerPhone: job.workerInfo?.phone || '',
            serviceName: job.service || 'Home Service',
            currency: paymentOrder?.currency || 'INR',
            baseAmount: amt,
            platformFee: fee,
            totalAmount: amt,
            totalAmountInPaise: Math.round(amt * 100),
            paymentMethod: job.paymentMethod === 'CASH' ? 'Cash' : 'Online UPI',
            gateway: paymentOrder?.gateway || 'razorpay',
            gatewayPaymentId: paymentOrder?.gatewayPaymentId || job.paymentProviderRef || '',
            gatewayOrderId: paymentOrder?.gatewayOrderId || job.paymentOrderId || '',
            status: 'PAID',
            issuedAt: job.settledAt || job.completedAt || new Date(),
            businessDetails: getBusinessConfig()
          });
          job.receiptNumber = receipt.receiptNumber;
          job.receiptId = receipt._id;
          await job.save();
        } catch (createErr) {
          if (createErr.code === 11000) {
            receipt = await Receipt.findOne({ jobId });
          } else {
            console.error('[Receipt Download Create Error]:', createErr);
          }
        }
      }

      if (!receipt) {
        return res.status(404).send('<h2>Receipt not found or job payment is not yet confirmed.</h2>');
      }

      const isCustomer = receipt.customerId && receipt.customerId.toString() === requesterId;
      const isWorker = receipt.workerId && receipt.workerId.toString() === requesterId;

      if (!isCustomer && !isWorker) {
        return res.status(403).send('<h2>403 Forbidden: You are not authorized to view this receipt.</h2>');
      }

      const dateStr = new Date(receipt.issuedAt).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const isGstRegistered = Boolean(receipt.businessDetails?.isGstRegistered && receipt.businessDetails?.gstin);
      const documentHeading = isGstRegistered ? 'Official Tax Invoice & Payment Receipt' : 'Official Payment Receipt';
      const pageTitle = isGstRegistered ? `Tax Invoice - ${receipt.receiptNumber}` : `Payment Receipt - ${receipt.receiptNumber}`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${pageTitle}</title>
</head>
<body>
  <div class="invoice-card">
    <div class="brand-sub">${documentHeading}</div>
    <div class="receipt-badge">PAID</div>
    <div class="num">${receipt.receiptNumber}</div>
    <div>Customer: ${receipt.customerName}</div>
    <div>Job: ${receipt.jobId}</div>
    <div>Service: ${receipt.serviceName}</div>
    <div>Base: ₹${receipt.baseAmount}</div>
    <div>Total Paid: ₹${receipt.totalAmount}</div>
    <div>Ref: ${receipt.gatewayPaymentId}</div>
    <div class="invoice-footer">
      <strong>${receipt.businessDetails?.companyName || 'Allver Technologies Pvt. Ltd.'}</strong>${isGstRegistered ? ` | GSTIN: ${receipt.businessDetails.gstin}` : ''}
    </div>
  </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch (err) {
      return res.status(500).send('<h2>Error loading receipt</h2>');
    }
  });

  const testServer = http.createServer(app);
  await new Promise(resolve => testServer.listen(0, resolve));
  const serverPort = testServer.address().port;
  const baseUrl = `http://127.0.0.1:${serverPort}`;
  console.log(` Test server listening at ${baseUrl}\n`);

  // Create two distinct customers and one worker
  const customerA = await User.create({
    fullName: `Customer A ${testSuffix}`,
    email: `custA_${testSuffix}@example.com`,
    password: 'Password123!',
    role: 'Client',
    city: 'Mumbai',
    phoneNumber: '9820000001'
  });

  const customerB = await User.create({
    fullName: `Customer B ${testSuffix}`,
    email: `custB_${testSuffix}@example.com`,
    password: 'Password123!',
    role: 'Client',
    city: 'Mumbai',
    phoneNumber: '9820000002'
  });

  const worker1 = await User.create({
    fullName: `Worker ${testSuffix}`,
    email: `worker_${testSuffix}@example.com`,
    password: 'Password123!',
    role: 'Labour',
    city: 'Mumbai',
    phoneNumber: '9820000003'
  });

  const jwtSecret = process.env.JWT_SECRET || 'allver_jwt_secure_secret_default';
  const tokenA = jwt.sign({ userId: customerA._id.toString() }, jwtSecret);
  const tokenB = jwt.sign({ userId: customerB._id.toString() }, jwtSecret);
  const tokenWorker = jwt.sign({ userId: worker1._id.toString() }, jwtSecret);

  const jobIdA = `job_audit_${testSuffix}`;

  try {
    // =========================================================================
    // AUDIT 1: Receipt Generation ONLY After Authoritative Payment Confirmation
    // =========================================================================
    console.log('--- AUDIT 1: Authoritative Payment Confirmation Enforcement ---');

    // 1.1 Job in WORK_IN_PROGRESS / PENDING payment
    const jobA = await Job.create({
      jobId: jobIdA,
      service: 'Home Deep Cleaning',
      clientId: customerA._id,
      workerId: worker1._id,
      workerUserId: worker1._id,
      status: 'WORK_IN_PROGRESS',
      paymentStatus: 'PENDING',
      clientLocation: { latitude: 19.2, longitude: 72.9, address: 'Thane West' },
      jobAmount: 1500,
      clientInfo: { name: customerA.fullName, phone: customerA.phoneNumber },
      workerInfo: { name: worker1.fullName, phone: worker1.phoneNumber }
    });

    // Check DB: no receipt should exist
    let receiptInDb = await Receipt.findOne({ jobId: jobIdA });
    assert.strictEqual(receiptInDb, null, 'Receipt must not exist before payment');

    // Call JSON endpoint with Customer A's token
    const resPrePaidJson = await fetch(`${baseUrl}/api/payment/receipt/${jobIdA}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.strictEqual(resPrePaidJson.status, 404, 'Must return 404 for unconfirmed payment');
    const dataPrePaidJson = await resPrePaidJson.json();
    assert(dataPrePaidJson.message.includes('not yet confirmed') || dataPrePaidJson.message.includes('not found'));

    // Call download endpoint with Customer A's token
    const resPrePaidDownload = await fetch(`${baseUrl}/api/payment/receipt/${jobIdA}/download`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.strictEqual(resPrePaidDownload.status, 404, 'Download must return 404 for unconfirmed payment');

    // 1.2 Job marked COMPLETED before payment (e.g. worker completed physical work)
    jobA.status = 'COMPLETED';
    jobA.paymentStatus = 'PENDING';
    await jobA.save();

    const resCompletedUnpaid = await fetch(`${baseUrl}/api/payment/receipt/${jobIdA}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.strictEqual(resCompletedUnpaid.status, 404, 'Must NOT generate receipt even if status=COMPLETED when paymentStatus=PENDING');
    receiptInDb = await Receipt.findOne({ jobId: jobIdA });
    assert.strictEqual(receiptInDb, null, 'No receipt should be auto-generated for unpaid completed job');

    pass('AUDIT_1A', 'No receipt generated while job payment is PENDING or UNPAID, even if status is COMPLETED');

    // Reset status to WORK_IN_PROGRESS so payment order can be created
    jobA.status = 'WORK_IN_PROGRESS';
    await jobA.save();

    // 1.3 Create authoritative PaymentOrder and confirm payment
    const paymentOrderA = await paymentService.createPaymentOrder({
      jobId: jobIdA,
      customerId: customerA._id,
      amountInRupees: 1500,
      currency: 'INR',
      idempotencyKey: `idem_audit_${jobIdA}`
    });
    assert.strictEqual(paymentOrderA.amountInPaise, 150000, 'Authoritative order amount must be 150000 paise (₹1,500)');

    // Execute authoritative confirmation
    const confirmResult = await paymentService.verifyAndConfirmPayment({
      orderId: paymentOrderA.orderId,
      customerId: customerA._id,
      jobId: jobIdA
    });
    assert.strictEqual(confirmResult.success, true);
    assert.strictEqual(confirmResult.status, 'PAID');

    receiptInDb = await Receipt.findOne({ jobId: jobIdA });
    assert(receiptInDb, 'Receipt must be created immediately upon authoritative payment confirmation');
    assert.strictEqual(receiptInDb.status, 'PAID');
    assert(receiptInDb.receiptNumber.startsWith('ALV-'), 'Receipt number must follow ALV- format');
    pass('AUDIT_1B', 'Receipt successfully generated immediately after authoritative payment confirmation');

    // =========================================================================
    // AUDIT 2: Duplicate Webhook & Payment Events Cannot Create Duplicate Receipts
    // =========================================================================
    console.log('\n--- AUDIT 2: Deduplication & Idempotency ---');

    // 2.1 Re-confirm payment via PaymentService
    const reconfirmResult = await paymentService.verifyAndConfirmPayment({
      orderId: paymentOrderA.orderId,
      customerId: customerA._id,
      jobId: jobIdA
    });
    assert.strictEqual(reconfirmResult.alreadyConfirmed, true);

    // 2.2 Process duplicate webhook
    const duplicateWebhookPayload = JSON.stringify({
      event_id: `evt_audit_${testSuffix}`,
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentOrderA.gatewayPaymentId || `pay_${paymentOrderA.gatewayOrderId}`,
            order_id: paymentOrderA.gatewayOrderId,
            amount: 150000,
            status: 'captured'
          }
        }
      }
    });

    const signature = mockProvider.generateWebhookSignature(duplicateWebhookPayload);
    const webhookRes1 = await paymentService.processWebhook({
      rawBody: duplicateWebhookPayload,
      headers: { 'x-razorpay-signature': signature }
    });
    assert.strictEqual(webhookRes1.success, true);

    // Send identical webhook again
    const webhookRes2 = await paymentService.processWebhook({
      rawBody: duplicateWebhookPayload,
      headers: { 'x-razorpay-signature': signature }
    });
    assert.strictEqual(webhookRes2.duplicate, true, 'Duplicate webhook event must be flagged duplicate');

    // Verify DB count
    const totalReceiptsForJob = await Receipt.countDocuments({ jobId: jobIdA });
    assert.strictEqual(totalReceiptsForJob, 1, 'Duplicate webhook or re-confirmation must NEVER create duplicate receipts');
    pass('AUDIT_2', 'Duplicate webhooks and repeated confirmations are strictly idempotent; exactly 1 receipt exists');

    // =========================================================================
    // AUDIT 3: Receipt Amount Exactly Matches PaymentOrder & Job
    // =========================================================================
    console.log('\n--- AUDIT 3: Authoritative Amount Matching ---');

    const confirmedOrder = await PaymentOrder.findOne({ orderId: paymentOrderA.orderId });
    const confirmedJob = await Job.findOne({ jobId: jobIdA });

    assert.strictEqual(receiptInDb.totalAmount, 1500, 'Receipt totalAmount must match ₹1,500');
    assert.strictEqual(receiptInDb.totalAmountInPaise, 150000, 'Receipt totalAmountInPaise must match 150000');
    assert.strictEqual(receiptInDb.baseAmount, 1500, 'Receipt baseAmount must match ₹1,500');
    assert.strictEqual(receiptInDb.totalAmount, confirmedOrder.amountInPaise / 100, 'Receipt totalAmount must equal PaymentOrder paise/100');
    assert.strictEqual(receiptInDb.totalAmount, confirmedJob.jobAmount, 'Receipt totalAmount must equal Job.jobAmount');
    assert.strictEqual(receiptInDb.orderId, confirmedOrder.orderId, 'Receipt orderId must link to authoritative PaymentOrder');

    pass('AUDIT_3', `Receipt amount (₹${receiptInDb.totalAmount} / ${receiptInDb.totalAmountInPaise} paise) exactly matches PaymentOrder and Job`);

    // =========================================================================
    // AUDIT 4: No GST/Tax Language Appears When isGstRegistered=false
    // =========================================================================
    console.log('\n--- AUDIT 4: GST / Tax Exclusion when isGstRegistered=false ---');

    // 4.1 When unregistered (default / no GSTIN set)
    assert.strictEqual(receiptInDb.businessDetails.isGstRegistered, false);
    assert.strictEqual(receiptInDb.businessDetails.gstin, null);
    assert.strictEqual(receiptInDb.businessDetails.documentType, 'PAYMENT_RECEIPT');
    assert.strictEqual(receiptInDb.businessDetails.documentTitle, 'Official Payment Receipt');

    // Fetch the download HTML
    const downloadRes = await fetch(`${baseUrl}/api/payment/receipt/${jobIdA}/download?token=${encodeURIComponent(tokenA)}`);
    assert.strictEqual(downloadRes.status, 200);
    const htmlContent = await downloadRes.text();

    // Verify Title and Headings
    assert(htmlContent.includes('Payment Receipt - ALV-'), 'Must display "Payment Receipt - ALV-"');
    assert(htmlContent.includes('Official Payment Receipt'), 'Must display "Official Payment Receipt"');

    // Strict Negative Assertions: NO GST language when unregistered
    assert(!htmlContent.includes('Tax Invoice'), 'Must NOT contain "Tax Invoice" when isGstRegistered=false');
    assert(!htmlContent.includes('GSTIN:'), 'Must NOT contain "GSTIN:" when isGstRegistered=false');
    assert(!htmlContent.includes('CGST'), 'Must NOT contain "CGST"');
    assert(!htmlContent.includes('SGST'), 'Must NOT contain "SGST"');
    assert(!htmlContent.includes('IGST'), 'Must NOT contain "IGST"');
    assert(!htmlContent.includes('27AABCA1234F1Z5'), 'Must NOT contain any fake GSTIN');

    pass('AUDIT_4', 'No GST/tax/invoice language or GSTIN appears when isGstRegistered=false; clean "Official Payment Receipt" rendered');

    // =========================================================================
    // AUDIT 5: Strict Participant Authorization (IDOR Security)
    // =========================================================================
    console.log('\n--- AUDIT 5: Participant Authorization & IDOR Protection ---');

    // 5.1 Customer B attempts to download Customer A's receipt via Authorization header
    const attackerHeaderRes = await fetch(`${baseUrl}/api/payment/receipt/${jobIdA}/download`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.strictEqual(attackerHeaderRes.status, 403, 'Customer B accessing Customer A receipt must be rejected with 403');
    const attackerHeaderBody = await attackerHeaderRes.text();
    assert(attackerHeaderBody.includes('403 Forbidden'), 'Body must indicate 403 Forbidden');
    pass('AUDIT_5A', 'Customer B blocked with 403 Forbidden when accessing Customer A receipt download via Bearer header');

    // 5.2 Customer B attempts to download Customer A's receipt via ?token query param
    const attackerQueryRes = await fetch(`${baseUrl}/api/payment/receipt/${jobIdA}/download?token=${encodeURIComponent(tokenB)}`);
    assert.strictEqual(attackerQueryRes.status, 403, 'Customer B accessing Customer A receipt via ?token query must return 403');
    pass('AUDIT_5B', 'Customer B blocked with 403 Forbidden when accessing Customer A receipt download via ?token query param');

    // 5.3 Customer B attempts to view Customer A's receipt JSON
    const attackerJsonRes = await fetch(`${baseUrl}/api/payment/receipt/${jobIdA}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.strictEqual(attackerJsonRes.status, 403, 'Customer B accessing Customer A receipt JSON must return 403');
    const attackerJsonData = await attackerJsonRes.json();
    assert.strictEqual(attackerJsonData.success, false);
    assert(attackerJsonData.message.includes('Forbidden'), 'Must contain Forbidden message');
    pass('AUDIT_5C', 'Customer B blocked with 403 Forbidden when accessing Customer A receipt JSON');

    // 5.4 Unauthenticated request (no token)
    const unauthRes = await fetch(`${baseUrl}/api/payment/receipt/${jobIdA}/download`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated download request must return 401');
    pass('AUDIT_5D', 'Unauthenticated request blocked with 401 Unauthorized');

    // 5.5 Customer A (legitimate customer owner) accesses their own receipt
    const customerJsonRes = await fetch(`${baseUrl}/api/payment/receipt/${jobIdA}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.strictEqual(customerJsonRes.status, 200, 'Customer A must be able to view their own receipt JSON');
    const customerJsonData = await customerJsonRes.json();
    assert.strictEqual(customerJsonData.receipt.jobId, jobIdA);

    const customerDownloadRes = await fetch(`${baseUrl}/api/payment/receipt/${jobIdA}/download?token=${encodeURIComponent(tokenA)}`);
    assert.strictEqual(customerDownloadRes.status, 200, 'Customer A must be able to download their own receipt HTML');
    pass('AUDIT_5E', 'Legitimate customer (Customer A) can successfully query JSON and download receipt');

    // 5.6 Assigned Worker accesses the receipt
    const workerDownloadRes = await fetch(`${baseUrl}/api/payment/receipt/${jobIdA}/download?token=${encodeURIComponent(tokenWorker)}`);
    assert.strictEqual(workerDownloadRes.status, 200, 'Assigned worker must be authorized to view the job receipt');
    pass('AUDIT_5F', 'Assigned worker successfully authorized to view receipt');

    // 5.7 IDOR tamper attempt with non-existent or modified jobId
    const fakeJobRes = await fetch(`${baseUrl}/api/payment/receipt/job_fake_tampered_9999/download?token=${encodeURIComponent(tokenA)}`);
    assert.strictEqual(fakeJobRes.status, 404, 'Accessing non-existent/tampered jobId returns 404');
    pass('AUDIT_5G', 'Arbitrary/tampered jobId returns 404 and does not leak info');

  } finally {
    // Cleanup test records
    await Receipt.deleteMany({ jobId: jobIdA });
    await PaymentOrder.deleteMany({ jobId: jobIdA });
    await Job.deleteMany({ jobId: jobIdA });
    await WebhookEvent.deleteMany({ eventId: `evt_audit_${testSuffix}` });
    await User.deleteMany({ _id: { $in: [customerA._id, customerB._id, worker1._id] } });

    testServer.close();
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`AUDIT COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Fatal audit suite error:', err);
  process.exit(1);
});
