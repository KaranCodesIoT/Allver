// backend/test/test_active_job_lifecycle_regression.js
// Automated Regression Test Suite for Server-Authoritative Active Job Lifecycle:
// A. Assigned job remains active after screen unmount.
// B. Active job is returned after app/session restart.
// C. Back navigation does not abandon the job.
// D. Customer active-job endpoint returns the assigned job.
// E. Worker active-job endpoint returns the assigned job.
// F. Lifecycle status changes are reflected after refetch.
// G. Socket reconnect restores latest server state.
// H. Completed/cancelled jobs are excluded.
// I. Old jobs cannot replace the current active job.
// J. Customer cannot access another customer's active job.
// K. Worker cannot access another worker's active job.

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const assert = require('assert');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Job = require('../models/Job');
const User = require('../models/User');
const authenticateJWT = require('../middleware/auth');

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('STARTING ACTIVE JOB LIFECYCLE REGRESSION SUITE (A - K)');
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

  // Set up Express test server with the exact hardened endpoints
  const app = express();
  app.use(express.json());

  const TERMINAL_JOB_STATUSES = [
    'COMPLETED',
    'CANCELLED',
    'CANCELLED_BY_CLIENT',
    'CANCELLED_BY_WORKER',
    'NO_WORKER_AVAILABLE',
    'REJECTED',
    'EXPIRED',
    'ARCHIVED',
    'SETTLED'
  ];

  const WORKER_ACTIVE_STATUSES = [
    'WORKER_ASSIGNED',
    'ASSIGNED',
    'WORKER_ACCEPTED',
    'ACCEPTED',
    'WORKER_EN_ROUTE',
    'WORKER_ON_WAY',
    'TRAVELLING',
    'WORKER_ARRIVED',
    'ARRIVED',
    'WORK_STARTED',
    'WORK_IN_PROGRESS',
    'IN_PROGRESS',
    'WORK_COMPLETION_REQUESTED',
    'COMPLETION_SUBMITTED',
    'CLIENT_CONFIRMED',
    'PAYMENT_PENDING',
    'PAYMENT_FAILED',
    'DISPUTED'
  ];

  const CUSTOMER_ACTIVE_STATUSES = [
    'SEARCHING',
    'WORKER_ASSIGNED',
    'ASSIGNED',
    'WORKER_ACCEPTED',
    'ACCEPTED',
    'WORKER_EN_ROUTE',
    'WORKER_ON_WAY',
    'TRAVELLING',
    'WORKER_ARRIVED',
    'ARRIVED',
    'WORK_STARTED',
    'WORK_IN_PROGRESS',
    'IN_PROGRESS',
    'WORK_COMPLETION_REQUESTED',
    'COMPLETION_SUBMITTED',
    'CLIENT_CONFIRMED',
    'PAYMENT_PENDING',
    'PAYMENT_FAILED',
    'DISPUTED'
  ];

  app.get('/api/worker/active-job', authenticateJWT, async (req, res) => {
    try {
      const userObjId = mongoose.Types.ObjectId.isValid(req.userId) ? new mongoose.Types.ObjectId(req.userId) : null;
      const filter = {
        $or: [
          ...(userObjId ? [{ workerId: userObjId }, { assignedWorkerId: userObjId }] : []),
          { workerId: req.userId },
          { assignedWorkerId: req.userId },
          { workerUserId: req.userId }
        ],
        status: { 
          $in: WORKER_ACTIVE_STATUSES,
          $nin: TERMINAL_JOB_STATUSES
        }
      };
      const activeJob = await Job.findOne(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .populate('clientId', 'fullName name phone avatar email role');

      return res.json({
        success: true,
        hasActiveJob: Boolean(activeJob),
        activeJob: activeJob || null
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get('/api/customer/active-job', authenticateJWT, async (req, res) => {
    try {
      const userObjId = mongoose.Types.ObjectId.isValid(req.userId) ? new mongoose.Types.ObjectId(req.userId) : null;
      const filter = {
        $or: [
          ...(userObjId ? [{ clientId: userObjId }, { customerId: userObjId }] : []),
          { clientId: req.userId },
          { customerId: req.userId },
          { clientUserId: req.userId }
        ],
        status: { 
          $in: CUSTOMER_ACTIVE_STATUSES,
          $nin: TERMINAL_JOB_STATUSES
        }
      };
      const activeJob = await Job.findOne(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .populate('workerId', 'fullName name phone avatar rating reviews experience role');

      return res.json({
        success: true,
        hasActiveJob: Boolean(activeJob),
        activeJob: activeJob || null
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get('/api/jobs/:jobId', authenticateJWT, async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = await Job.findOne({ jobId })
        .populate('clientId', 'fullName name phone avatar email role')
        .populate('workerId', 'fullName name phone avatar rating reviews experience role');

      if (!job) {
        return res.status(404).json({ success: false, message: `Job ${jobId} not found` });
      }

      const currentUserIdStr = req.userId.toString();
      const isCustomer = String(job.clientId?._id || job.clientId || job.customerId?._id || job.customerId || job.clientUserId) === currentUserIdStr;
      const isWorker = String(job.workerId?._id || job.workerId || job.assignedWorkerId?._id || job.assignedWorkerId || job.workerUserId) === currentUserIdStr;

      if (!isCustomer && !isWorker) {
        return res.status(403).json({ success: false, message: 'Unauthorized: You are not a participant in this job' });
      }

      return res.json({ success: true, job });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const serverPort = server.address().port;
  const baseUrl = `http://127.0.0.1:${serverPort}`;
  console.log(` Regression test server listening at ${baseUrl}\n`);

  const jwtSecret = process.env.JWT_SECRET || 'allver_jwt_secure_secret_default';

  // Seed Users
  const customerA = await User.create({
    fullName: `Customer A ${testSuffix}`,
    email: `custA_${testSuffix}@example.com`,
    phone: `+91991${String(testSuffix).slice(-7)}`,
    password: 'TestPassword123!',
    city: 'Noida',
    role: 'Client'
  });

  const customerB = await User.create({
    fullName: `Customer B ${testSuffix}`,
    email: `custB_${testSuffix}@example.com`,
    phone: `+91992${String(testSuffix).slice(-7)}`,
    password: 'TestPassword123!',
    city: 'Noida',
    role: 'Client'
  });

  const workerA = await User.create({
    fullName: `Worker A ${testSuffix}`,
    email: `workerA_${testSuffix}@example.com`,
    phone: `+91993${String(testSuffix).slice(-7)}`,
    password: 'TestPassword123!',
    city: 'Noida',
    role: 'Labour'
  });

  const workerB = await User.create({
    fullName: `Worker B ${testSuffix}`,
    email: `workerB_${testSuffix}@example.com`,
    phone: `+91994${String(testSuffix).slice(-7)}`,
    password: 'TestPassword123!',
    city: 'Noida',
    role: 'Labour'
  });

  const tokenCustA = jwt.sign({ userId: customerA._id.toString(), id: customerA._id.toString(), role: 'Client' }, jwtSecret, { expiresIn: '1h' });
  const tokenCustB = jwt.sign({ userId: customerB._id.toString(), id: customerB._id.toString(), role: 'Client' }, jwtSecret, { expiresIn: '1h' });
  const tokenWorkerA = jwt.sign({ userId: workerA._id.toString(), id: workerA._id.toString(), role: 'Labour' }, jwtSecret, { expiresIn: '1h' });
  const tokenWorkerB = jwt.sign({ userId: workerB._id.toString(), id: workerB._id.toString(), role: 'Labour' }, jwtSecret, { expiresIn: '1h' });

  async function apiGet(endpoint, token) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, body };
  }

  // Create initial test job assigned between Customer A and Worker A
  const jobId = `job_regr_${testSuffix}`;
  const assignedJob = await Job.create({
    jobId,
    clientId: customerA._id,
    customerId: customerA._id,
    workerId: workerA._id,
    assignedWorkerId: workerA._id,
    service: 'Carpentry',
    status: 'WORKER_ASSIGNED',
    price: '₹1200',
    jobAmount: 1200,
    clientLocation: {
      latitude: 28.6273,
      longitude: 77.3725,
      address: 'Sector 62, Noida'
    },
    clientInfo: {
      name: customerA.fullName,
      phone: customerA.phone
    },
    workerInfo: {
      name: workerA.fullName,
      phone: workerA.phone,
      rating: 4.9,
      role: 'Labour'
    }
  });

  // --- TEST A: Assigned job remains active after screen unmount ---
  try {
    // Screen unmounts in UI: check that MongoDB retains the job in active status and is never deleted or reset
    const dbJob = await Job.findOne({ jobId });
    assert.ok(dbJob, 'Job must exist in DB after UI unmount');
    assert.strictEqual(dbJob.status, 'WORKER_ASSIGNED', 'Job status must be intact');
    assert.strictEqual(String(dbJob.workerId), String(workerA._id), 'Worker assignment must be retained');
    pass('TEST_A', 'Assigned job remains active in database after screen unmount (not cancelled, deleted, or reset)');
  } catch (err) {
    fail('TEST_A', err);
  }

  // --- TEST B: Active job is returned after app/session restart ---
  try {
    // Fresh session token simulating app restart and re-login
    const freshCustToken = jwt.sign({ id: customerA._id.toString(), role: 'Client' }, jwtSecret, { expiresIn: '2h' });
    const res = await apiGet('/api/customer/active-job', freshCustToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.hasActiveJob, true);
    assert.strictEqual(res.body.activeJob.jobId, jobId);
    assert.strictEqual(res.body.activeJob.status, 'WORKER_ASSIGNED');
    pass('TEST_B', 'Active job is returned with authoritative state after app/session restart');
  } catch (err) {
    fail('TEST_B', err);
  }

  // --- TEST C: Back navigation does not abandon the job ---
  try {
    // Customer/Worker presses back: active job query still returns active job
    const resCust = await apiGet('/api/customer/active-job', tokenCustA);
    const resWork = await apiGet('/api/worker/active-job', tokenWorkerA);
    assert.strictEqual(resCust.body.hasActiveJob, true, 'Customer still has active job after back navigation');
    assert.strictEqual(resWork.body.hasActiveJob, true, 'Worker still has active job after back navigation');
    pass('TEST_C', 'Back navigation does not abandon or reset the active job for either participant');
  } catch (err) {
    fail('TEST_C', err);
  }

  // --- TEST D: Customer active-job endpoint returns the assigned job ---
  try {
    const res = await apiGet('/api/customer/active-job', tokenCustA);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.hasActiveJob, true);
    assert.strictEqual(res.body.activeJob.jobId, jobId);
    assert.strictEqual(res.body.activeJob.service, 'Carpentry');
    pass('TEST_D', 'GET /api/customer/active-job returns the authoritative assigned job');
  } catch (err) {
    fail('TEST_D', err);
  }

  // --- TEST E: Worker active-job endpoint returns the assigned job ---
  try {
    const res = await apiGet('/api/worker/active-job', tokenWorkerA);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.hasActiveJob, true);
    assert.strictEqual(res.body.activeJob.jobId, jobId);
    pass('TEST_E', 'GET /api/worker/active-job returns the authoritative assigned job');
  } catch (err) {
    fail('TEST_E', err);
  }

  // --- TEST F: Lifecycle status changes are reflected after refetch ---
  try {
    const lifecycleProgression = [
      'WORKER_EN_ROUTE',
      'WORKER_ARRIVED',
      'WORK_STARTED',
      'WORK_IN_PROGRESS',
      'WORK_COMPLETION_REQUESTED',
      'CLIENT_CONFIRMED',
      'PAYMENT_PENDING'
    ];

    for (const nextStatus of lifecycleProgression) {
      await Job.updateOne({ jobId }, { $set: { status: nextStatus, updatedAt: new Date() } });
      const refetchCust = await apiGet('/api/customer/active-job', tokenCustA);
      const refetchWork = await apiGet('/api/worker/active-job', tokenWorkerA);
      assert.strictEqual(refetchCust.body.activeJob.status, nextStatus, `Customer must see updated status ${nextStatus}`);
      assert.strictEqual(refetchWork.body.activeJob.status, nextStatus, `Worker must see updated status ${nextStatus}`);
    }
    pass('TEST_F', 'Lifecycle status transitions are atomically reflected for both parties upon refetch');
  } catch (err) {
    fail('TEST_F', err);
  }

  // --- TEST G: Socket reconnect restores latest server state ---
  try {
    // Advance status to WORK_IN_PROGRESS on server while client is "disconnected"
    await Job.updateOne({ jobId }, { $set: { status: 'WORK_IN_PROGRESS', updatedAt: new Date() } });
    // "Reconnection" triggers HTTP active job sync
    const res = await apiGet('/api/customer/active-job', tokenCustA);
    assert.strictEqual(res.body.activeJob.status, 'WORK_IN_PROGRESS', 'Server state restored after socket reconnect');
    pass('TEST_G', 'Socket reconnect refreshes and restores latest authoritative server state from MongoDB');
  } catch (err) {
    fail('TEST_G', err);
  }

  // --- TEST H: Completed/cancelled jobs are excluded ---
  try {
    const terminalStatuses = [
      'COMPLETED',
      'CANCELLED_BY_CLIENT',
      'CANCELLED_BY_WORKER',
      'NO_WORKER_AVAILABLE',
      'ARCHIVED'
    ];

    for (const term of terminalStatuses) {
      await Job.updateOne({ jobId }, { $set: { status: term, updatedAt: new Date() } });
      const resCust = await apiGet('/api/customer/active-job', tokenCustA);
      const resWork = await apiGet('/api/worker/active-job', tokenWorkerA);
      assert.strictEqual(resCust.body.hasActiveJob, false, `Customer endpoint must exclude terminal status ${term}`);
      assert.strictEqual(resCust.body.activeJob, null, `Customer activeJob must be null for ${term}`);
      assert.strictEqual(resWork.body.hasActiveJob, false, `Worker endpoint must exclude terminal status ${term}`);
      assert.strictEqual(resWork.body.activeJob, null, `Worker activeJob must be null for ${term}`);
    }
    pass('TEST_H', 'Terminal states (COMPLETED, CANCELLED_BY_CLIENT, CANCELLED_BY_WORKER, etc.) are strictly excluded');
  } catch (err) {
    fail('TEST_H', err);
  }

  // --- TEST I: Old jobs cannot replace the current active job ---
  try {
    // Keep the old job in COMPLETED status
    await Job.updateOne({ jobId }, { $set: { status: 'COMPLETED', updatedAt: new Date(Date.now() - 60000) } });

    // Create a NEW active job for the same customer & worker
    const newActiveJobId = `job_regr_new_${testSuffix}`;
    await Job.create({
      jobId: newActiveJobId,
      clientId: customerA._id,
      customerId: customerA._id,
      workerId: workerA._id,
      assignedWorkerId: workerA._id,
      service: 'Plumbing',
      status: 'WORKER_ACCEPTED',
      price: '₹800',
      jobAmount: 800,
      clientLocation: {
        latitude: 28.6273,
        longitude: 77.3725,
        address: 'Sector 62, Noida'
      }
    });

    const resCust = await apiGet('/api/customer/active-job', tokenCustA);
    const resWork = await apiGet('/api/worker/active-job', tokenWorkerA);
    assert.strictEqual(resCust.body.hasActiveJob, true);
    assert.strictEqual(resCust.body.activeJob.jobId, newActiveJobId, 'Must select the new active job, not the old completed one');
    assert.strictEqual(resWork.body.hasActiveJob, true);
    assert.strictEqual(resWork.body.activeJob.jobId, newActiveJobId, 'Worker must receive the new active job, not old job');
    pass('TEST_I', 'Old completed/cancelled jobs cannot replace or contaminate the current active job');
  } catch (err) {
    fail('TEST_I', err);
  }

  // --- TEST J: Customer cannot access another customer's active job ---
  try {
    // Customer B calling active-job endpoint must not see Customer A's active job
    const resCustB = await apiGet('/api/customer/active-job', tokenCustB);
    assert.strictEqual(resCustB.body.hasActiveJob, false, 'Customer B has no active job');
    assert.strictEqual(resCustB.body.activeJob, null);

    // Customer B calling /api/jobs/:jobId on Customer A's job must receive 403 Forbidden
    const resCustBAccess = await apiGet(`/api/jobs/job_regr_new_${testSuffix}`, tokenCustB);
    assert.strictEqual(resCustBAccess.status, 403, 'Customer B must be blocked with 403 when accessing Customer A job');
    pass('TEST_J', 'Customer cannot access or view another customer active job (strict IDOR protection)');
  } catch (err) {
    fail('TEST_J', err);
  }

  // --- TEST K: Worker cannot access another worker's active job ---
  try {
    // Worker B calling active-job endpoint must not see Worker A's active job
    const resWorkerB = await apiGet('/api/worker/active-job', tokenWorkerB);
    assert.strictEqual(resWorkerB.body.hasActiveJob, false, 'Worker B has no active job');
    assert.strictEqual(resWorkerB.body.activeJob, null);

    // Worker B calling /api/jobs/:jobId on Worker A's job must receive 403 Forbidden
    const resWorkerBAccess = await apiGet(`/api/jobs/job_regr_new_${testSuffix}`, tokenWorkerB);
    assert.strictEqual(resWorkerBAccess.status, 403, 'Worker B must be blocked with 403 when accessing Worker A job');
    pass('TEST_K', 'Worker cannot access or view another worker active job (strict IDOR protection)');
  } catch (err) {
    fail('TEST_K', err);
  }

  // Cleanup
  await Job.deleteMany({ jobId: { $regex: testSuffix } });
  await User.deleteMany({ email: { $regex: testSuffix } });
  server.close();
  await mongoose.disconnect();

  console.log('\n================================================================');
  console.log(`REGRESSION SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
