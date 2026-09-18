// backend/test/test_booking_notification_lifecycle.js
// Comprehensive verification test suite for Allver Production Booking Notification System
// Tests: MongoDB Source of Truth, Idempotency, Multi-Channel Dispatch (Socket & Push),
// Booking State Machine Notifications, and Worker Pending Requests Sync.

const assert = require('assert');
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const Notification = require('../models/Notification');
const User = require('../models/User');
const Job = require('../models/Job');
const NotificationService = require('../services/NotificationService');
const BookingDispatchEngine = require('../services/BookingDispatchEngine');

// Mock Socket.IO Server for testing real-time events
class MockSocketServer {
  constructor() {
    this.emittedEvents = [];
    this.rooms = new Map();
  }

  to(room) {
    const self = this;
    return {
      emit: (eventName, payload) => {
        self.emittedEvents.push({ room, eventName, payload, timestamp: Date.now() });
      }
    };
  }

  emit(eventName, payload) {
    this.emittedEvents.push({ room: 'broadcast', eventName, payload, timestamp: Date.now() });
  }

  clear() {
    this.emittedEvents = [];
  }

  getEventsForRoom(room, eventName = null) {
    return this.emittedEvents.filter(e => e.room === room && (!eventName || e.eventName === eventName));
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING PRODUCTION BOOKING NOTIFICATION VERIFICATION SUITE');
  console.log('================================================================\n');

  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');
  } else {
    console.log('⚠️ No MONGODB_URI found, skipping DB operations requiring live connection\n');
  }

  const mockIo = new MockSocketServer();
  const testWorkerId = new mongoose.Types.ObjectId().toString();
  const testClientId = new mongoose.Types.ObjectId().toString();
  const testJobId = `test_job_${Date.now()}`;

  let passed = 0;
  let total = 7;

  try {
    // -------------------------------------------------------------
    // Test 1: Notification Schema Validation & Field Verification
    // -------------------------------------------------------------
    console.log('Test 1: Notification Model Schema & Enum Validation');
    const sampleNotif = new Notification({
      recipientId: testWorkerId,
      senderId: testClientId,
      type: 'BOOKING_REQUEST',
      bookingId: testJobId,
      title: 'New Painting Booking Request!',
      body: 'Customer Sushil requested Painting nearby.',
      metadata: { service: 'Painting', price: '₹900' },
      isRead: false
    });

    assert.strictEqual(sampleNotif.type, 'BOOKING_REQUEST');
    assert.strictEqual(sampleNotif.bookingId, testJobId);
    assert.strictEqual(sampleNotif.userId.toString(), testWorkerId);
    assert.strictEqual(sampleNotif.read, false);
    assert.strictEqual(sampleNotif.title, 'New Painting Booking Request!');
    console.log('  ✅ Schema supports all required fields & virtual getters/setters (userId, read)');
    passed++;

    // -------------------------------------------------------------
    // Test 2: NotificationService.sendBookingNotification Persistence & Socket Emission
    // -------------------------------------------------------------
    console.log('\nTest 2: NotificationService.sendBookingNotification (MongoDB + Socket.IO)');
    mockIo.clear();

    const notif1 = await NotificationService.sendBookingNotification({
      type: 'BOOKING_REQUEST',
      bookingId: testJobId,
      userId: testWorkerId,
      senderId: testClientId,
      title: 'New Service Request',
      body: 'Tap to view and accept this job request.',
      metadata: { service: 'Electrical', distanceKm: 2.5 },
      idempotencyKey: `BOOKING_REQUEST_${testJobId}_${testWorkerId}`,
      io: mockIo
    });

    assert(notif1, 'Notification should be saved and returned');
    assert.strictEqual(notif1.type, 'BOOKING_REQUEST');
    assert.strictEqual(notif1.bookingId, testJobId);
    assert.strictEqual(notif1.isRead, false);

    // Verify Socket emissions
    const socketEvents = mockIo.getEventsForRoom(testWorkerId);
    const hasBookingNotif = socketEvents.some(e => e.eventName === 'booking_notification');
    const hasNewNotif = socketEvents.some(e => e.eventName === 'new_notification');
    assert(hasBookingNotif, 'Should emit booking_notification to user room');
    assert(hasNewNotif, 'Should emit new_notification to user room');

    console.log(`  ✅ Notification saved in MongoDB (ID: ${notif1._id})`);
    console.log(`  ✅ Emitted realtime socket events: 'booking_notification' and 'new_notification'`);
    passed++;

    // -------------------------------------------------------------
    // Test 3: Idempotency & Deduplication
    // -------------------------------------------------------------
    console.log('\nTest 3: Idempotency & Duplicate Prevention');
    const duplicateNotif = await NotificationService.sendBookingNotification({
      type: 'BOOKING_REQUEST',
      bookingId: testJobId,
      userId: testWorkerId,
      senderId: testClientId,
      title: 'New Service Request',
      body: 'Tap to view and accept this job request.',
      metadata: { service: 'Electrical', distanceKm: 2.5 },
      idempotencyKey: `BOOKING_REQUEST_${testJobId}_${testWorkerId}`,
      io: mockIo
    });

    assert.strictEqual(
      duplicateNotif._id.toString(),
      notif1._id.toString(),
      'Duplicate dispatch should return existing record without creating a new document'
    );
    console.log('  ✅ Idempotency verified: identical notification within 30s returned original document');
    passed++;

    // -------------------------------------------------------------
    // Test 4: Unread Sync & Mark As Read
    // -------------------------------------------------------------
    console.log('\nTest 4: Unread Sync & Mark As Read');
    mockIo.clear();

    const unread = await NotificationService.getUnreadBookingNotifications(testWorkerId);
    assert(unread.length > 0, 'Should return at least 1 unread notification');
    const found = unread.find(n => n.bookingId === testJobId);
    assert(found, 'Should find the test job notification in unread list');
    console.log(`  ✅ Successfully fetched ${unread.length} unread notification(s) for worker`);

    const marked = await NotificationService.markAsRead(notif1._id, testWorkerId, mockIo);
    assert.strictEqual(marked.isRead, true, 'Notification should be marked as read');

    // Verify socket emitted notifications_read
    const readEvents = mockIo.getEventsForRoom(testWorkerId, 'notifications_read');
    assert(readEvents.length > 0, 'Should emit notifications_read to user');
    console.log(`  ✅ Notification marked as read and emitted 'notifications_read' socket event`);
    passed++;

    // -------------------------------------------------------------
    // Test 5: Full Booking Lifecycle Notification Types
    // -------------------------------------------------------------
    console.log('\nTest 5: Full Booking Lifecycle Event Types Coverage');
    const lifecycleTypes = [
      { type: 'BOOKING_ACCEPTED', title: 'Provider Accepted Your Booking!' },
      { type: 'PROVIDER_ON_THE_WAY', title: 'Provider is on the way!' },
      { type: 'PROVIDER_ARRIVED', title: 'Provider Arrived!' },
      { type: 'JOB_STARTED', title: 'Service Started' },
      { type: 'JOB_COMPLETED', title: 'Job Completed - Confirmation Required' },
      { type: 'REVIEW_REQUEST', title: 'Rate & Review Your Experience' },
      { type: 'PAYMENT_SUCCESS', title: 'Payment Successful' },
      { type: 'BOOKING_CANCELLED', title: 'Booking Cancelled by Customer' },
    ];

    for (const item of lifecycleTypes) {
      const doc = await NotificationService.sendBookingNotification({
        type: item.type,
        bookingId: testJobId,
        userId: testClientId,
        title: item.title,
        body: `Test body for ${item.type}`,
        idempotencyKey: `${item.type}_${testJobId}_${Date.now()}`,
        io: mockIo
      });
      assert(doc, `Should create notification for ${item.type}`);
      assert.strictEqual(doc.type, item.type);
    }
    console.log(`  ✅ Successfully created and verified all ${lifecycleTypes.length} lifecycle event types`);
    passed++;

    // -------------------------------------------------------------
    // Test 6: BookingDispatchEngine State Machine Notification Integration
    // -------------------------------------------------------------
    console.log('\nTest 6: BookingDispatchEngine State Machine Notifications');
    const activeWorkers = new Map();
    activeWorkers.set(testWorkerId, {
      userId: testWorkerId,
      name: 'Akash Test Worker',
      phone: '+91 9999999999',
      latitude: 19.2183,
      longitude: 72.9781,
      skills: ['Painting'],
      isAvailableForBooking: true,
      lastLocationUpdate: new Date()
    });

    const engine = new BookingDispatchEngine(mockIo, activeWorkers, { skipDb: false });
    mockIo.clear();

    // 1. Create and dispatch job
    const createdJob = await engine.createAndStartJobRequest(null, {
      jobId: testJobId,
      service: 'Painting',
      latitude: 19.2180,
      longitude: 72.9780,
      location: 'Thane West',
      price: '₹900',
      clientInfo: { userId: testClientId, name: 'Test Client' }
    });

    assert(createdJob, 'Job should be created in memory');
    assert.strictEqual(createdJob.status, 'SEARCHING');

    // Verify BOOKING_REQUEST notification was created for candidate worker
    const workerReqNotif = await Notification.findOne({
      recipientId: testWorkerId,
      bookingId: testJobId,
      type: 'BOOKING_REQUEST'
    });
    assert(workerReqNotif, 'DispatchEngine must generate BOOKING_REQUEST notification on wave broadcast');
    console.log('  ✅ DispatchEngine generated persistent BOOKING_REQUEST notification for worker');

    // 2. Accept Job
    await engine.acceptJob(testJobId, { id: testWorkerId, name: 'Akash Test Worker' });
    const acceptNotif = await Notification.findOne({
      recipientId: testClientId,
      bookingId: testJobId,
      type: 'BOOKING_ACCEPTED'
    });
    assert(acceptNotif, 'DispatchEngine must generate BOOKING_ACCEPTED notification for client');
    console.log('  ✅ DispatchEngine generated persistent BOOKING_ACCEPTED notification for client');

    // 3. Start Trip
    await engine.startTrip(testJobId);
    const onWayNotif = await Notification.findOne({
      recipientId: testClientId,
      bookingId: testJobId,
      type: 'PROVIDER_ON_THE_WAY'
    });
    assert(onWayNotif, 'DispatchEngine must generate PROVIDER_ON_THE_WAY notification for client');
    console.log('  ✅ DispatchEngine generated persistent PROVIDER_ON_THE_WAY notification for client');

    // 4. Worker Arrived
    await engine.workerArrived(testJobId);
    const arrivedNotif = await Notification.findOne({
      recipientId: testClientId,
      bookingId: testJobId,
      type: 'PROVIDER_ARRIVED'
    });
    assert(arrivedNotif, 'DispatchEngine must generate PROVIDER_ARRIVED notification for client');
    console.log('  ✅ DispatchEngine generated persistent PROVIDER_ARRIVED notification for client');

    // 5. Start Work
    await engine.startWork(testJobId);
    const workNotif = await Notification.findOne({
      recipientId: testClientId,
      bookingId: testJobId,
      type: 'JOB_STARTED'
    });
    assert(workNotif, 'DispatchEngine must generate JOB_STARTED notification for client');
    console.log('  ✅ DispatchEngine generated persistent JOB_STARTED notification for client');

    passed++;

    // -------------------------------------------------------------
    // Test 7: Worker Pending Requests Sync on App Open / Reconnect
    // -------------------------------------------------------------
    console.log('\nTest 7: Worker Pending Requests Sync');
    const pendingJobId = `pending_test_${Date.now()}`;
    await engine.createAndStartJobRequest(null, {
      jobId: pendingJobId,
      service: 'Painting',
      latitude: 19.2180,
      longitude: 72.9780,
      location: 'Thane West',
      price: '₹950',
      clientInfo: { userId: testClientId, name: 'Test Client 2' }
    });

    const pendingRequests = await engine.getPendingRequestsForWorker(testWorkerId);
    assert(pendingRequests.length > 0, 'Worker should have at least 1 pending request');
    const foundPending = pendingRequests.find(p => p.jobId === pendingJobId);
    assert(foundPending, 'Worker should find newly broadcasted job in pending requests');
    console.log(`  ✅ Worker successfully retrieved ${pendingRequests.length} pending request(s) on sync`);

    // Clean up test job in engine
    await engine.cancelJob(pendingJobId);
    await engine.cancelJob(testJobId);

    passed++;

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
  } finally {
    // Cleanup test notifications from database
    try {
      await Notification.deleteMany({ bookingId: { $in: [testJobId] } });
      await Job.deleteMany({ jobId: { $in: [testJobId] } });
      console.log('\n🧹 Cleaned up test data from MongoDB');
    } catch (cleanErr) {}

    console.log('\n================================================================');
    console.log(`TEST RESULTS: ${passed}/${total} PASSED`);
    console.log('================================================================');

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }

    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

runTests();
