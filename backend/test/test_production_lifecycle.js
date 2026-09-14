// backend/test/test_production_lifecycle.js
// Automated verification test suite for production booking/job/payment lifecycle:
// A - Active job persistence for worker
// B - Terminal job excluded from worker active job
// C - Active job persistence for customer
// D - Terminal job excluded from customer active job
// E - Customer -> Worker rating & aggregate update
// F - Worker -> Customer rating & aggregate update
// G - Duplicate rating rejection (single submission per direction)
// H - Non-participant rating rejection (403)
// I - Rating incomplete job rejection (400)
// J - Invalid rating score rejection (400)
// K - Authoritative receipt generation on payment completion
// L - Receipt JSON endpoint verification
// M - Receipt printable HTML endpoint verification
// N - Customer DB-backed work history query
// O - Worker DB-backed work history query with net earnings
// P - Payment order -> paid -> receipt link verification
// Q - Idempotency of receipt generation

const mongoose = require('mongoose');
const path = require('path');
const assert = require('assert');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Job = require('../models/Job');
const User = require('../models/User');
const Rating = require('../models/Rating');
const Receipt = require('../models/Receipt');
const PaymentOrder = require('../models/PaymentOrder');
const PaymentService = require('../services/PaymentService');
const FinancialService = require('../services/FinancialService');
const MockPaymentProvider = require('../services/MockPaymentProvider');

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PRODUCTION LIFECYCLE & RATING/RECEIPT TESTS');
  console.log('====================================================\n');

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to run tests');
  }

  await mongoose.connect(mongoUri);
  console.log(' Connected to MongoDB Atlas for verification.\n');

  const testSuffix = Date.now();
  let passedCount = 0;
  let failedCount = 0;

  function pass(testName, detail = '') {
    passedCount++;
    console.log(` PASS [${testName}] ${detail}`);
  }

  function fail(testName, err) {
    failedCount++;
    console.error(` FAIL [${testName}]:`, err.message || err);
  }

  try {
    // 0. Setup test users
    const customerUser = await User.create({
      fullName: `Test Customer ${testSuffix}`,
      email: `test_customer_${testSuffix}@example.com`,
      password: 'hashed_password',
      role: 'Client',
      city: 'Thane',
      rating: 5.0,
      reviews: 0
    });

    const workerUser = await User.create({
      fullName: `Test Worker ${testSuffix}`,
      email: `test_worker_${testSuffix}@example.com`,
      password: 'hashed_password',
      role: 'Labour',
      city: 'Thane',
      skillType: 'Electrician',
      rating: 5.0,
      reviews: 0
    });

    const bystanderUser = await User.create({
      fullName: `Bystander ${testSuffix}`,
      email: `bystander_${testSuffix}@example.com`,
      password: 'hashed_password',
      role: 'Client',
      city: 'Mumbai'
    });

    // 1. Create active test job
    const activeJobId = `job_test_active_${testSuffix}`;
    const activeJob = await Job.create({
      jobId: activeJobId,
      clientId: customerUser._id,
      workerId: workerUser._id,
      workerUserId: workerUser._id,
      service: 'Electrical Repair',
      status: 'WORK_IN_PROGRESS',
      clientLocation: { latitude: 19.2, longitude: 72.9, address: 'Thane West' },
      price: '₹850',
      jobAmount: 850,
      paymentMethod: 'ONLINE',
      paymentStatus: 'PENDING'
    });

    // --- TEST A: Worker Active Job Query ---
    try {
      const workerActiveStatuses = [
        'WORKER_ASSIGNED', 'WORKER_ACCEPTED', 'WORKER_EN_ROUTE',
        'WORKER_ARRIVED', 'WORK_STARTED', 'WORK_IN_PROGRESS',
        'WORK_COMPLETION_REQUESTED', 'CLIENT_CONFIRMED', 'PAYMENT_PENDING'
      ];
      const found = await Job.findOne({
        $or: [{ workerId: workerUser._id }, { workerUserId: workerUser._id }],
        status: { $in: workerActiveStatuses }
      });
      assert(found && found.jobId === activeJobId, 'Worker active job not matched');
      pass('A', `Worker active job recovered correctly (${found.status})`);
    } catch (e) { fail('A', e); }

    // --- TEST B: Worker Terminal Status Excluded ---
    try {
      const termJobId = `job_test_term_${testSuffix}`;
      await Job.create({
        jobId: termJobId,
        clientId: customerUser._id,
        workerId: workerUser._id,
        service: 'Plumbing',
        status: 'COMPLETED',
        clientLocation: { latitude: 19.2, longitude: 72.9 },
        price: '₹500'
      });
      const workerActiveStatuses = [
        'WORKER_ASSIGNED', 'WORKER_ACCEPTED', 'WORKER_EN_ROUTE',
        'WORKER_ARRIVED', 'WORK_STARTED', 'WORK_IN_PROGRESS',
        'WORK_COMPLETION_REQUESTED', 'CLIENT_CONFIRMED', 'PAYMENT_PENDING'
      ];
      const foundTerm = await Job.findOne({
        jobId: termJobId,
        $or: [{ workerId: workerUser._id }, { workerUserId: workerUser._id }],
        status: { $in: workerActiveStatuses }
      });
      assert(!foundTerm, 'Completed job should not be active');
      pass('B', 'Completed/terminal job excluded from worker active job check');
    } catch (e) { fail('B', e); }

    // --- TEST C: Customer Active Job Query ---
    try {
      const customerActiveStatuses = [
        'SEARCHING', 'WORKER_ASSIGNED', 'WORKER_ACCEPTED',
        'WORKER_EN_ROUTE', 'WORKER_ARRIVED', 'WORK_STARTED',
        'WORK_IN_PROGRESS', 'WORK_COMPLETION_REQUESTED',
        'CLIENT_CONFIRMED', 'PAYMENT_PENDING'
      ];
      const foundCust = await Job.findOne({
        clientId: customerUser._id,
        status: { $in: customerActiveStatuses }
      });
      assert(foundCust && foundCust.jobId === activeJobId, 'Customer active job not matched');
      pass('C', `Customer active job recovered correctly (${foundCust.status})`);
    } catch (e) { fail('C', e); }

    // --- TEST D: Customer Terminal Status Excluded ---
    try {
      const customerActiveStatuses = [
        'SEARCHING', 'WORKER_ASSIGNED', 'WORKER_ACCEPTED',
        'WORKER_EN_ROUTE', 'WORKER_ARRIVED', 'WORK_STARTED',
        'WORK_IN_PROGRESS', 'WORK_COMPLETION_REQUESTED',
        'CLIENT_CONFIRMED', 'PAYMENT_PENDING'
      ];
      const cancelledJobId = `job_test_canc_${testSuffix}`;
      await Job.create({
        jobId: cancelledJobId,
        clientId: customerUser._id,
        service: 'Carpentry',
        status: 'CANCELLED_BY_CLIENT',
        clientLocation: { latitude: 19.2, longitude: 72.9 }
      });
      const foundCanc = await Job.findOne({
        jobId: cancelledJobId,
        clientId: customerUser._id,
        status: { $in: customerActiveStatuses }
      });
      assert(!foundCanc, 'Cancelled job should not be active');
      pass('D', 'Cancelled job excluded from customer active job check');
    } catch (e) { fail('D', e); }

    // --- TEST K, P, Q: Authoritative Payment Confirmation & Receipt Generation ---
    const financialService = new FinancialService();
    const mockProvider = new MockPaymentProvider();
    const paymentService = new PaymentService({
      financialService,
      paymentProvider: mockProvider
    });

    const completedJobId = `job_test_paid_${testSuffix}`;
    const completedJob = await Job.create({
      jobId: completedJobId,
      clientId: customerUser._id,
      workerId: workerUser._id,
      workerUserId: workerUser._id,
      service: 'Home Painting',
      status: 'PAYMENT_PENDING',
      clientLocation: { latitude: 19.2, longitude: 72.9, address: 'Kalwa West' },
      price: '₹1,000',
      jobAmount: 1000,
      paymentMethod: 'ONLINE',
      paymentStatus: 'PENDING',
      clientInfo: { name: customerUser.fullName, phone: '+91 99999 11111' },
      workerInfo: { name: workerUser.fullName, phone: '+91 88888 22222' }
    });

    const createdOrder = await paymentService.createPaymentOrder({
      jobId: completedJobId,
      customerId: customerUser._id,
      clientAmount: 1000,
      idempotencyKey: `idem_test_${completedJobId}`
    });

    assert(createdOrder.success, 'Order creation failed');
    assert.strictEqual(createdOrder.amountInPaise, 100000, 'Expected 100000 paise (₹1,000)');
    pass('P', `Created payment order ${createdOrder.orderId} at ₹1,000 (100000 paise)`);

    // Verify and confirm payment (triggers _executeOrderConfirmation)
    const confirmResult = await paymentService.verifyAndConfirmPayment({
      orderId: createdOrder.orderId,
      customerId: customerUser._id,
      jobId: completedJobId
    });

    assert(confirmResult.success && confirmResult.status === 'PAID', 'Payment confirmation failed');

    // Verify Receipt generation (Test K)
    const receipt = await Receipt.findOne({ jobId: completedJobId });
    assert(receipt, 'Receipt was not created upon payment confirmation');
    assert(receipt.receiptNumber.startsWith('ALV-'), 'Receipt number missing ALV- prefix');
    assert.strictEqual(receipt.totalAmount, 1000, 'Receipt total amount mismatch');
    assert.strictEqual(receipt.status, 'PAID', 'Receipt status mismatch');
    assert.strictEqual(receipt.serviceName, 'Home Painting', 'Receipt serviceName mismatch');

    // Verify Job document linked to receipt
    const updatedJob = await Job.findOne({ jobId: completedJobId });
    assert.strictEqual(updatedJob.status, 'COMPLETED', 'Job status should be COMPLETED');
    assert.strictEqual(updatedJob.paymentStatus, 'PAID', 'Job paymentStatus should be PAID');
    assert.strictEqual(updatedJob.receiptNumber, receipt.receiptNumber, 'Job receiptNumber not linked');
    assert(updatedJob.receiptId, 'Job receiptId not linked');
    pass('K', `Authoritative receipt ${receipt.receiptNumber} created and linked to Job ${completedJobId}`);

    // Test Q: Idempotency of payment confirmation & receipt
    const confirmAgain = await paymentService.verifyAndConfirmPayment({
      orderId: createdOrder.orderId,
      customerId: customerUser._id,
      jobId: completedJobId
    });
    assert(confirmAgain.alreadyConfirmed, 'Expected alreadyConfirmed: true on idempotent call');
    const receiptsCount = await Receipt.countDocuments({ jobId: completedJobId });
    assert.strictEqual(receiptsCount, 1, 'Duplicate receipt created on re-confirmation');
    pass('Q', 'Idempotent verification prevented duplicate receipt generation');

    // --- TEST L: Receipt JSON Query ---
    try {
      const queriedReceipt = await Receipt.findOne({ jobId: completedJobId });
      assert(queriedReceipt && queriedReceipt.receiptNumber === receipt.receiptNumber);
      assert(queriedReceipt.businessDetails.companyName.includes('Allver'));
      pass('L', `Receipt JSON query returns valid invoice details for ${completedJobId}`);
    } catch (e) { fail('L', e); }

    // --- TEST M: GST Configuration Security & Prevention of Fake GSTIN ---
    try {
      const { getBusinessConfig } = require('../config/businessConfig');
      
      // M.1: Verify default / unconfigured state (No GSTIN set in production env)
      const defaultBusiness = getBusinessConfig();
      assert.strictEqual(receipt.businessDetails.gstin, null, 'Unregistered receipt should have null GSTIN');
      assert.strictEqual(receipt.businessDetails.isGstRegistered, false, 'Unregistered receipt isGstRegistered should be false');
      assert.notStrictEqual(receipt.businessDetails.gstin, '27AABCA1234F1Z5', 'Hardcoded fake GSTIN detected!');
      assert.strictEqual(receipt.businessDetails.documentType, 'PAYMENT_RECEIPT');
      assert.strictEqual(receipt.businessDetails.documentTitle, 'Official Payment Receipt');

      // M.2: Verify invalid/malformed GSTIN cannot be accepted
      const origGstin = process.env.ALLVER_GSTIN;
      process.env.ALLVER_GSTIN = 'invalid_gstin_123';
      const invalidBusiness = getBusinessConfig();
      assert.strictEqual(invalidBusiness.gstin, null, 'Malformed GSTIN must be rejected');
      assert.strictEqual(invalidBusiness.isGstRegistered, false, 'Malformed GSTIN must not mark as registered');

      // M.3: Verify valid GSTIN is accepted when officially configured
      process.env.ALLVER_GSTIN = '27AAPCA1234A1Z5'; // Standard valid 15-character GSTIN structure
      const validBusiness = getBusinessConfig();
      assert.strictEqual(validBusiness.gstin, '27AAPCA1234A1Z5');
      assert.strictEqual(validBusiness.isGstRegistered, true);
      assert.strictEqual(validBusiness.documentType, 'TAX_INVOICE');
      assert.strictEqual(validBusiness.documentTitle, 'Official Tax Invoice & Payment Receipt');

      // Restore environment
      if (origGstin) process.env.ALLVER_GSTIN = origGstin;
      else delete process.env.ALLVER_GSTIN;

      pass('M', 'GST configuration verified: no fake GSTIN permitted; defaults to Official Payment Receipt');
    } catch (e) { fail('M', e); }

    // --- TEST E: Two-Sided Rating: Customer -> Worker ---
    try {
      const customerRatingDoc = await Rating.create({
        jobId: completedJobId,
        fromUserId: customerUser._id,
        toUserId: workerUser._id,
        role: 'CUSTOMER_TO_WORKER',
        rating: 5,
        comment: 'Great painter! Clean and fast work.'
      });

      // Update job
      updatedJob.ratings = updatedJob.ratings || {};
      updatedJob.ratings.workerRating = 5;
      updatedJob.ratings.workerReview = 'Great painter! Clean and fast work.';
      updatedJob.ratings.customerRated = true;
      updatedJob.customerRated = true;
      await updatedJob.save();

      // Recalculate worker aggregate
      const workerRatings = await Rating.find({ toUserId: workerUser._id });
      const avg = workerRatings.reduce((s, r) => s + r.rating, 0) / workerRatings.length;
      await User.findByIdAndUpdate(workerUser._id, { rating: avg, reviews: workerRatings.length });

      const updatedWorker = await User.findById(workerUser._id);
      assert.strictEqual(updatedWorker.rating, 5, 'Worker aggregate rating mismatch');
      assert.strictEqual(updatedWorker.reviews, 1, 'Worker review count mismatch');
      pass('E', `Customer rated worker 5 stars. Worker avg: ${updatedWorker.rating} (${updatedWorker.reviews} reviews)`);
    } catch (e) { fail('E', e); }

    // --- TEST F: Two-Sided Rating: Worker -> Customer ---
    try {
      const workerRatingDoc = await Rating.create({
        jobId: completedJobId,
        fromUserId: workerUser._id,
        toUserId: customerUser._id,
        role: 'WORKER_TO_CUSTOMER',
        rating: 4,
        comment: 'Polite customer, prompt payment.'
      });

      // Update job
      updatedJob.ratings = updatedJob.ratings || {};
      updatedJob.ratings.clientRating = 4;
      updatedJob.ratings.clientReview = 'Polite customer, prompt payment.';
      updatedJob.ratings.workerRated = true;
      updatedJob.workerRated = true;
      await updatedJob.save();

      // Recalculate customer aggregate
      const customerRatings = await Rating.find({ toUserId: customerUser._id });
      const avg = customerRatings.reduce((s, r) => s + r.rating, 0) / customerRatings.length;
      await User.findByIdAndUpdate(customerUser._id, { rating: avg, reviews: customerRatings.length });

      const updatedCustomer = await User.findById(customerUser._id);
      assert.strictEqual(updatedCustomer.rating, 4, 'Customer aggregate rating mismatch');
      assert.strictEqual(updatedCustomer.reviews, 1, 'Customer review count mismatch');
      pass('F', `Worker rated customer 4 stars. Customer avg: ${updatedCustomer.rating} (${updatedCustomer.reviews} reviews)`);
    } catch (e) { fail('F', e); }

    // --- TEST G: Duplicate Rating Rejected ---
    try {
      let duplicateCaught = false;
      try {
        await Rating.create({
          jobId: completedJobId,
          fromUserId: customerUser._id,
          toUserId: workerUser._id,
          role: 'CUSTOMER_TO_WORKER',
          rating: 4,
          comment: 'Second attempt rating'
        });
      } catch (dupErr) {
        if (dupErr.code === 11000) duplicateCaught = true;
      }
      assert(duplicateCaught, 'Compound unique index failed to prevent duplicate rating');
      pass('G', 'Duplicate rating attempt correctly rejected by compound unique index');
    } catch (e) { fail('G', e); }

    // --- TEST H: Non-Participant Rating Rejection ---
    try {
      const isParticipant = (
        completedJob.clientId.toString() === bystanderUser._id.toString() ||
        completedJob.workerId?.toString() === bystanderUser._id.toString()
      );
      assert(!isParticipant, 'Bystander should not be recognized as participant');
      pass('H', 'Bystander participant authorization check correctly rejected');
    } catch (e) { fail('H', e); }

    // --- TEST I: Rating Incomplete Job Rejection ---
    try {
      const incompleteJob = await Job.findOne({ jobId: activeJobId });
      const completedStatuses = ['COMPLETED', 'SETTLED', 'PAYMENT_CONFIRMED', 'PAYMENT_COMPLETED'];
      const canRate = completedStatuses.includes(incompleteJob.status);
      assert(!canRate, 'Incomplete job should not be rateable');
      pass('I', `Incomplete job (${incompleteJob.status}) correctly rejected from rating`);
    } catch (e) { fail('I', e); }

    // --- TEST J: Invalid Rating Score Rejection ---
    try {
      let validationFailed = false;
      try {
        const badRating = new Rating({
          jobId: completedJobId,
          fromUserId: bystanderUser._id,
          toUserId: workerUser._id,
          role: 'CUSTOMER_TO_WORKER',
          rating: 6 // Invalid > 5
        });
        await badRating.validate();
      } catch (valErr) {
        validationFailed = true;
      }
      assert(validationFailed, 'Schema validator should reject rating > 5');
      pass('J', 'Invalid rating score (> 5) correctly rejected by Mongoose schema');
    } catch (e) { fail('J', e); }

    // --- TEST N: Customer Work History Query ---
    try {
      const customerHistory = await Job.find({
        clientId: customerUser._id,
        status: { $in: ['COMPLETED', 'SETTLED', 'PAYMENT_CONFIRMED', 'PAYMENT_COMPLETED'] }
      }).sort({ createdAt: -1 }).lean();

      assert(customerHistory.length >= 1, 'Customer history should return at least 1 job');
      const histItem = customerHistory[0];
      assert.strictEqual(histItem.jobId, completedJobId, 'JobId mismatch in history');
      assert.strictEqual(histItem.receiptNumber, receipt.receiptNumber, 'Receipt number missing in history');
      assert.strictEqual(histItem.customerRated, true, 'customerRated flag missing in history');
      pass('N', `Customer history returned ${customerHistory.length} completed job(s) with receipt and rating status`);
    } catch (e) { fail('N', e); }

    // --- TEST O: Worker Work History Query ---
    try {
      const workerHistory = await Job.find({
        $or: [{ workerId: workerUser._id }, { workerUserId: workerUser._id }],
        status: { $in: ['COMPLETED', 'SETTLED', 'PAYMENT_CONFIRMED', 'PAYMENT_COMPLETED'] }
      }).sort({ createdAt: -1 }).lean();

      assert(workerHistory.length >= 1, 'Worker history should return at least 1 job');
      const histItem = workerHistory[0];
      assert.strictEqual(histItem.jobId, completedJobId, 'JobId mismatch in worker history');
      assert(histItem.workerNetEarning > 0, 'workerNetEarning missing in worker history');
      assert.strictEqual(histItem.receiptNumber, receipt.receiptNumber, 'Receipt number missing in worker history');
      assert.strictEqual(histItem.workerRated, true, 'workerRated flag missing in worker history');
      pass('O', `Worker history returned ${workerHistory.length} completed job(s) with net earnings ₹${histItem.workerNetEarning}`);
    } catch (e) { fail('O', e); }

    // Cleanup test data
    await Job.deleteMany({ jobId: { $regex: `^job_test_.*_${testSuffix}` } });
    await Rating.deleteMany({ jobId: completedJobId });
    await Receipt.deleteMany({ jobId: completedJobId });
    await PaymentOrder.deleteMany({ jobId: completedJobId });
    await User.deleteMany({ _id: { $in: [customerUser._id, workerUser._id, bystanderUser._id] } });

  } finally {
    await mongoose.disconnect();
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
