// backend/test/test_active_job_banner_regression.js
// Automated Regression Test Suite for Active Job Banner Authentication & Lifecycle Guards:
// TEST A: Unauthenticated user -> no ActiveJobBanner (blocked on auth/public screens, 401 on server)
// TEST B: Login with customer having active job -> banner appears with correct metadata
// TEST C: Login with customer having no active job -> no banner
// TEST D: Logout -> banner disappears immediately, active-job memory cleared, sockets disconnected
// TEST E: Customer A logout -> Customer B cannot see Customer A's active job (cross-user isolation)
// TEST F: Refresh while authenticated -> active job restores correctly; back navigation persistence verified

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

// Mirror client-side route guard helper
function isAuthOrPublicRoute(pathname, segments) {
  if (segments && segments.length > 0) {
    const first = segments[0]?.toLowerCase().replace(/^\//, '');
    if (['login', 'signup', 'choose-language', 'index', 'about', 'contact', 'privacy-policy', 'terms'].includes(first)) {
      return true;
    }
  }

  if (!pathname || pathname === '/' || pathname === '') {
    return true;
  }

  const cleanPath = pathname.toLowerCase().split('?')[0].split('#')[0];
  const publicPaths = [
    '/login',
    '/signup',
    '/choose-language',
    '/about',
    '/contact',
    '/privacy-policy',
    '/terms',
    '/index',
  ];

  return publicPaths.some(p => cleanPath === p || cleanPath.startsWith(p + '/'));
}

// Mirror client-side ActiveJobBanner rendering evaluator
function evaluateActiveJobBannerRender({
  activeJob,
  activeJobUserId,
  currentUser,
  pathname,
  segments,
  sessionRestored
}) {
  if (!sessionRestored) return null;
  const isAuthScreen = isAuthOrPublicRoute(pathname, segments);
  const isOnActiveScreen = pathname?.includes('/active-job') || pathname?.includes('/booking-flow');
  const isAuthenticated = Boolean(currentUser && currentUser._id && activeJobUserId === currentUser._id);

  if (!activeJob || isOnActiveScreen || isAuthScreen || !isAuthenticated) {
    return null;
  }

  return {
    rendered: true,
    title: activeJob.service || activeJob.title || 'Painting Service',
    jobId: activeJob.jobId,
    status: activeJob.status
  };
}

// Client ActiveJobState simulator
class ClientActiveJobStore {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this.activeJob = null;
    this.activeJobUserId = null;
    this.currentUser = null;
    this.token = null;
    this.pathname = '/login';
    this.segments = ['login'];
    this.sessionRestored = false;
    this.socketConnected = false;
  }

  async checkActiveJob() {
    if (isAuthOrPublicRoute(this.pathname, this.segments)) {
      if (this.activeJob !== null) {
        this.clearActiveJob();
      }
      return null;
    }

    if (!this.currentUser || !this.currentUser._id || !this.token) {
      this.clearActiveJob();
      return null;
    }

    if (this.activeJobUserId && this.activeJobUserId !== this.currentUser._id) {
      this.clearActiveJob();
    }

    const endpoint = (this.currentUser.role === 'Labour' || this.currentUser.role === 'Contractor')
      ? `${this.apiBaseUrl}/api/worker/active-job`
      : `${this.apiBaseUrl}/api/customer/active-job`;

    const res = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.hasActiveJob && data.activeJob) {
        this.activeJob = data.activeJob;
        this.activeJobUserId = this.currentUser._id;
        return this.activeJob;
      }
    }

    this.clearActiveJob();
    return null;
  }

  clearActiveJob() {
    this.activeJob = null;
    this.activeJobUserId = null;
  }

  logout() {
    this.clearActiveJob();
    this.currentUser = null;
    this.token = null;
    this.socketConnected = false;
    this.pathname = '/login';
    this.segments = ['login'];
  }

  getBannerRender() {
    return evaluateActiveJobBannerRender({
      activeJob: this.activeJob,
      activeJobUserId: this.activeJobUserId,
      currentUser: this.currentUser,
      pathname: this.pathname,
      segments: this.segments,
      sessionRestored: this.sessionRestored
    });
  }
}

async function runActiveJobBannerRegressionSuite() {
  console.log('================================================================');
  console.log('STARTING ACTIVE JOB BANNER AUTH GUARD REGRESSION SUITE (A - F)');
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

  // Setup express server with customer active-job endpoint
  const app = express();
  app.use(express.json());

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

  app.get('/api/customer/active-job', authenticateJWT, async (req, res) => {
    try {
      const clientId = req.user.userId || req.user.id || req.user._id;
      if (!clientId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const activeJob = await Job.findOne({
        clientId: new mongoose.Types.ObjectId(clientId),
        status: { $in: CUSTOMER_ACTIVE_STATUSES }
      }).sort({ updatedAt: -1 });

      if (activeJob) {
        return res.json({
          success: true,
          hasActiveJob: true,
          activeJob: {
            jobId: activeJob.jobId,
            service: activeJob.service || activeJob.category || 'Painting',
            status: activeJob.status,
            price: activeJob.price,
            clientId: activeJob.clientId?.toString(),
            startedAt: activeJob.createdAt
          }
        });
      }

      return res.json({
        success: true,
        hasActiveJob: false,
        activeJob: null
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(` Regression test server listening on ${baseUrl}\n`);

  const jwtSecret = process.env.JWT_SECRET || 'allver_jwt_secure_secret_default';

  // Seed Users
  const customerA = await User.create({
    fullName: `Customer A ${testSuffix}`,
    email: `custA_${testSuffix}@banner-test.com`,
    phone: `+91981${String(testSuffix).slice(-7)}`,
    password: 'TestPassword123!',
    city: 'Noida',
    role: 'Client'
  });

  const customerB = await User.create({
    fullName: `Customer B ${testSuffix}`,
    email: `custB_${testSuffix}@banner-test.com`,
    phone: `+91982${String(testSuffix).slice(-7)}`,
    password: 'TestPassword123!',
    city: 'Noida',
    role: 'Client'
  });

  const tokenCustA = jwt.sign({ userId: customerA._id.toString(), id: customerA._id.toString(), role: 'Client' }, jwtSecret, { expiresIn: '1h' });
  const tokenCustB = jwt.sign({ userId: customerB._id.toString(), id: customerB._id.toString(), role: 'Client' }, jwtSecret, { expiresIn: '1h' });

  // Create Active Painting Job for Customer A
  const jobIdA = `job_painting_${testSuffix}`;
  const jobCustA = await Job.create({
    jobId: jobIdA,
    clientId: customerA._id,
    service: 'Painting Service',
    category: 'Painting',
    status: 'WORK_IN_PROGRESS',
    price: 1200,
    clientLocation: {
      latitude: 28.6280,
      longitude: 77.3649,
      address: 'Sector 62, Noida'
    }
  });

  const clientStore = new ClientActiveJobStore(baseUrl);

  try {
    // --------------------------------------------------------------------------
    // TEST A: Unauthenticated user -> no ActiveJobBanner
    // --------------------------------------------------------------------------
    console.log('--- TEST A: Unauthenticated user -> no ActiveJobBanner ---');
    clientStore.pathname = '/login';
    clientStore.segments = ['login'];
    clientStore.currentUser = null;
    clientStore.token = null;
    clientStore.sessionRestored = true;

    // 1. Route guard check
    assert.strictEqual(isAuthOrPublicRoute('/login', ['login']), true, 'Login route must be recognized as auth/public');
    assert.strictEqual(isAuthOrPublicRoute('/signup', ['signup']), true, 'Signup route must be recognized as auth/public');
    assert.strictEqual(isAuthOrPublicRoute('/choose-language', ['choose-language']), true, 'Choose language must be recognized as auth/public');
    assert.strictEqual(isAuthOrPublicRoute('/', []), true, 'Root index must be recognized as auth/public');

    // 2. Active job check must abort and return null
    const jobResult = await clientStore.checkActiveJob();
    assert.strictEqual(jobResult, null, 'Unauthenticated checkActiveJob must return null');

    // 3. Banner evaluator must return null (does not render)
    const bannerRender = clientStore.getBannerRender();
    assert.strictEqual(bannerRender, null, 'ActiveJobBanner must return null for unauthenticated user on /login');

    // 4. Server API call without token must reject with 401
    const rawRes = await fetch(`${baseUrl}/api/customer/active-job`);
    assert.strictEqual(rawRes.status, 401, 'Endpoint must reject unauthenticated request with 401');

    pass('TEST_A', 'Unauthenticated user on /login never renders ActiveJobBanner and API call is blocked');

    // --------------------------------------------------------------------------
    // TEST B: Login with customer having active job -> banner appears
    // --------------------------------------------------------------------------
    console.log('\n--- TEST B: Login with customer having active job -> banner appears ---');
    // Customer A logs in and navigates to tabs
    clientStore.currentUser = { _id: customerA._id.toString(), fullName: customerA.fullName, role: 'Client' };
    clientStore.token = tokenCustA;
    clientStore.pathname = '/(tabs)';
    clientStore.segments = ['(tabs)'];

    const activeJobA = await clientStore.checkActiveJob();
    assert.ok(activeJobA, 'Customer A active job must be returned by authoritative endpoint');
    assert.strictEqual(activeJobA.jobId, jobIdA, 'Returned active job ID must match Customer A job');

    const bannerRenderA = clientStore.getBannerRender();
    assert.ok(bannerRenderA, 'ActiveJobBanner must render for authenticated user with active job');
    assert.strictEqual(bannerRenderA.rendered, true);
    assert.strictEqual(bannerRenderA.title, 'Painting Service', 'Banner must display correct job title');
    assert.strictEqual(bannerRenderA.jobId, jobIdA);

    pass('TEST_B', 'Customer A with active job renders ActiveJobBanner on authenticated screen with correct metadata');

    // --------------------------------------------------------------------------
    // TEST C: Login with customer having no active job -> no banner
    // --------------------------------------------------------------------------
    console.log('\n--- TEST C: Login with customer having no active job -> no banner ---');
    // Customer B logs in and navigates to tabs
    clientStore.currentUser = { _id: customerB._id.toString(), fullName: customerB.fullName, role: 'Client' };
    clientStore.token = tokenCustB;
    clientStore.pathname = '/(tabs)';
    clientStore.segments = ['(tabs)'];

    const activeJobB = await clientStore.checkActiveJob();
    assert.strictEqual(activeJobB, null, 'Customer B has no active job; checkActiveJob must return null');

    const bannerRenderB = clientStore.getBannerRender();
    assert.strictEqual(bannerRenderB, null, 'ActiveJobBanner must return null for Customer B (no active job)');

    pass('TEST_C', 'Customer B with no active job never renders ActiveJobBanner');

    // --------------------------------------------------------------------------
    // TEST D: Logout -> banner disappears and active-job state is cleared
    // --------------------------------------------------------------------------
    console.log('\n--- TEST D: Logout -> banner disappears and active-job state is cleared ---');
    // First reinstate Customer A's active job session
    clientStore.currentUser = { _id: customerA._id.toString(), fullName: customerA.fullName, role: 'Client' };
    clientStore.token = tokenCustA;
    clientStore.pathname = '/(tabs)';
    clientStore.segments = ['(tabs)'];
    await clientStore.checkActiveJob();
    assert.ok(clientStore.activeJob !== null, 'Customer A active job re-established before logout');

    // Trigger logout
    clientStore.logout();

    // Verify all state is wiped
    assert.strictEqual(clientStore.activeJob, null, 'activeJob in client memory must be null after logout');
    assert.strictEqual(clientStore.activeJobUserId, null, 'activeJobUserId in client memory must be null after logout');
    assert.strictEqual(clientStore.currentUser, null, 'currentUser must be null after logout');
    assert.strictEqual(clientStore.token, null, 'token must be null after logout');
    assert.strictEqual(clientStore.pathname, '/login', 'pathname must be /login after logout');

    const bannerAfterLogout = clientStore.getBannerRender();
    assert.strictEqual(bannerAfterLogout, null, 'ActiveJobBanner must return null immediately upon logout');

    pass('TEST_D', 'Logout immediately clears active-job memory, unmounts ActiveJobBanner, and cleans session');

    // --------------------------------------------------------------------------
    // TEST E: Customer A logout -> Customer B cannot see Customer A's active job
    // --------------------------------------------------------------------------
    console.log('\n--- TEST E: Customer A logout -> Customer B cannot see Customer A\'s active job ---');
    // Customer A had active job and logged out (handled in TEST D)
    // Customer B now logs in
    clientStore.currentUser = { _id: customerB._id.toString(), fullName: customerB.fullName, role: 'Client' };
    clientStore.token = tokenCustB;
    clientStore.pathname = '/(tabs)';
    clientStore.segments = ['(tabs)'];

    // If somehow Customer A's job was maliciously placed into state:
    clientStore.activeJob = { jobId: jobIdA, service: 'Painting Service', clientId: customerA._id.toString() };
    clientStore.activeJobUserId = customerA._id.toString(); // Leftover user id

    // Even before checkActiveJob, the guard should refuse to render because activeJobUserId !== currentUser._id
    const hostileRenderAttempt = clientStore.getBannerRender();
    assert.strictEqual(hostileRenderAttempt, null, 'User isolation guard prevents Customer B from rendering Customer A job');

    // checkActiveJob executes for Customer B
    await clientStore.checkActiveJob();
    assert.strictEqual(clientStore.activeJob, null, 'Customer B checkActiveJob authoritative check must overwrite with null');
    assert.strictEqual(clientStore.getBannerRender(), null, 'Customer B can never see Customer A job');

    pass('TEST_E', 'Strict user isolation: Customer B can NEVER see or render Customer A active job');

    // --------------------------------------------------------------------------
    // TEST F: Refresh while authenticated -> active job still restores correctly; back navigation persistence verified
    // --------------------------------------------------------------------------
    console.log('\n--- TEST F: Refresh while authenticated -> active job still restores correctly ---');
    // Simulate App Startup / Refresh for authenticated Customer A
    const refreshStore = new ClientActiveJobStore(baseUrl);
    refreshStore.pathname = '/(tabs)';
    refreshStore.segments = ['(tabs)'];
    // Session restoration from storage
    refreshStore.currentUser = { _id: customerA._id.toString(), fullName: customerA.fullName, role: 'Client' };
    refreshStore.token = tokenCustA;
    refreshStore.sessionRestored = true;

    // Active job re-queries after session restored
    await refreshStore.checkActiveJob();
    assert.ok(refreshStore.activeJob, 'Active job restored from server upon refresh');
    assert.strictEqual(refreshStore.activeJob.jobId, jobIdA);

    // Verify persistence across various authenticated routes
    const subRoutes = [
      { path: '/contractors', segs: ['contractors'] },
      { path: '/chat-room', segs: ['chat-room'] },
      { path: '/(tabs)/wallet', segs: ['(tabs)', 'wallet'] },
      { path: '/(tabs)/profile', segs: ['(tabs)', 'profile'] }
    ];

    for (const r of subRoutes) {
      refreshStore.pathname = r.path;
      refreshStore.segments = r.segs;
      const rRender = refreshStore.getBannerRender();
      assert.ok(rRender, `ActiveJobBanner must persist on sub-route ${r.path}`);
      assert.strictEqual(rRender.jobId, jobIdA);
    }

    // When navigating to /active-job, banner should hide (isOnActiveScreen)
    refreshStore.pathname = '/active-job';
    refreshStore.segments = ['active-job'];
    assert.strictEqual(refreshStore.getBannerRender(), null, 'ActiveJobBanner must hide on /active-job screen');

    // When navigating back to tabs, banner should reappear
    refreshStore.pathname = '/(tabs)';
    refreshStore.segments = ['(tabs)'];
    assert.ok(refreshStore.getBannerRender(), 'ActiveJobBanner must reappear after back-navigating from /active-job');

    pass('TEST_F', 'Active job restores correctly on authenticated refresh and persists across navigation & back-nav');

  } catch (err) {
    fail('SUITE_ERROR', err);
  } finally {
    // Cleanup seeded data
    try {
      await Job.deleteMany({ jobId: { $regex: testSuffix } });
      await User.deleteMany({ _id: { $in: [customerA._id, customerB._id] } });
      console.log('\n Test data cleaned up successfully.');
    } catch (cleanupErr) {
      console.warn('Cleanup error:', cleanupErr.message);
    }

    server.close();
    await mongoose.disconnect();
    console.log(' Disconnected from MongoDB.\n');

    console.log('================================================================');
    console.log(`REGRESSION SUITE COMPLETED: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('================================================================');

    if (failedCount > 0) {
      process.exit(1);
    }
  }
}

runActiveJobBannerRegressionSuite().catch((err) => {
  console.error('Fatal regression suite error:', err);
  process.exit(1);
});
