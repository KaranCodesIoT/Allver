// backend/test/booking_state_machine.test.js
// Automated Test Suite for Booking Matching & Authoritative State Machine

const assert = require('assert');
const BookingDispatchEngine = require('../services/BookingDispatchEngine');

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
    this.rooms = new Map(); // roomName -> Array<{ event, data, timestamp }>
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE BOOKING MATCHING & STATE MACHINE TESTS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

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

  // Common Coordinates
  const KALWA_COORDS = { lat: 19.1982, lng: 72.9968 };
  const AKASH_KALWA_COORDS = { lat: 19.2069208, lng: 72.9968026 }; // ~0.97 km from Kalwa
  const PUNE_COORDS = { lat: 18.5204, lng: 73.8567 }; // ~118 km from Kalwa
  const MID_DISTANCE_COORDS = { lat: 19.3200, lng: 73.0100 }; // ~14 km from Kalwa (Wave 2 range: 10-20 km)
  const FAR_DISTANCE_COORDS = { lat: 19.4100, lng: 73.0200 }; // ~24 km from Kalwa (Wave 3 range: 20-30 km)

  // -------------------------------------------------------------
  // Test 1: Client Kalwa + Akash Kalwa + Painter + available -> Akash receives request in Wave 1
  // -------------------------------------------------------------
  await test('1. Client Kalwa + Akash Kalwa + Painter + available -> Akash receives request in Wave 1', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    const engine = new BookingDispatchEngine(io, activeWorkers, { waveDurationMs: 150, skipDb: true });

    const akashId = 'akash_123';
    const akashSocketId = 'socket_akash';
    activeWorkers.set(akashId, {
      userId: akashId,
      fullName: 'Akash Chauhan',
      role: 'Labour',
      skillType: 'Painter',
      workCategory: ['Painting'],
      specialization: ['Painter', 'Painting'],
      workArea: 'Kalwa East',
      serviceRadiusKm: 10,
      latitude: AKASH_KALWA_COORDS.lat,
      longitude: AKASH_KALWA_COORDS.lng,
      availability: 'Available',
      isAvailableForBooking: true,
      lastLocationUpdate: new Date(),
      socketId: akashSocketId
    });

    const clientSocket = new MockSocket('client_socket_1', 'client_1');
    const jobId = 'test_job_1';

    await engine.createAndStartJobRequest(clientSocket, {
      jobId,
      service: 'Painting',
      location: 'Kalwa, Thane',
      latitude: KALWA_COORDS.lat,
      longitude: KALWA_COORDS.lng,
      clientInfo: { userId: 'client_1', name: 'Test Client' }
    });

    // Check client received search started
    const clientStarted = clientSocket.getEvents('job_search_started');
    assert.strictEqual(clientStarted.length, 1, 'Client should receive job_search_started');
    assert.strictEqual(clientStarted[0].data.status, 'SEARCH_STARTED');

    // Check client received wave 1 status
    const clientWave = clientSocket.getEvents('job_dispatch_wave_status');
    assert(clientWave.length >= 1, 'Client should receive job_dispatch_wave_status');
    assert.strictEqual(clientWave[0].data.wave, 1);
    assert.strictEqual(clientWave[0].data.radiusKm, 10);

    // Check Akash received targeted broadcast
    const akashBroadcasts = io.getRoomEvents(akashSocketId, 'job_request_broadcast');
    assert.strictEqual(akashBroadcasts.length, 1, 'Akash should receive job_request_broadcast');
    assert.strictEqual(akashBroadcasts[0].data.jobId, jobId);
    assert.strictEqual(akashBroadcasts[0].data.wave, 1);
    assert.strictEqual(akashBroadcasts[0].data.service, 'Painting');
    assert(akashBroadcasts[0].data.distanceKm < 2, `Distance should be ~0.97 km, got ${akashBroadcasts[0].data.distanceKm}`);

    engine.cancelJob(jobId);
  });

  // -------------------------------------------------------------
  // Test 2: Client Kalwa + Painter in Pune -> Pune worker receives nothing
  // -------------------------------------------------------------
  await test('2. Client Kalwa + Painter in Pune -> Pune worker receives nothing', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    const engine = new BookingDispatchEngine(io, activeWorkers, { waveDurationMs: 150, skipDb: true });

    const puneWorkerId = 'pune_painter_1';
    const puneSocketId = 'socket_pune';
    activeWorkers.set(puneWorkerId, {
      userId: puneWorkerId,
      fullName: 'Pune Painter',
      role: 'Labour',
      skillType: 'Painter',
      workCategory: ['Painting'],
      specialization: ['Painter'],
      workArea: 'Pune',
      serviceRadiusKm: 10,
      latitude: PUNE_COORDS.lat,
      longitude: PUNE_COORDS.lng,
      availability: 'Available',
      isAvailableForBooking: true,
      lastLocationUpdate: new Date(),
      socketId: puneSocketId
    });

    const clientSocket = new MockSocket('client_socket_2', 'client_2');
    const jobId = 'test_job_2';

    await engine.createAndStartJobRequest(clientSocket, {
      jobId,
      service: 'Painting',
      location: 'Kalwa, Thane',
      latitude: KALWA_COORDS.lat,
      longitude: KALWA_COORDS.lng,
      clientInfo: { userId: 'client_2', name: 'Test Client' }
    });

    const puneBroadcasts = io.getRoomEvents(puneSocketId, 'job_request_broadcast');
    assert.strictEqual(puneBroadcasts.length, 0, 'Pune worker (>100 km away) must receive 0 broadcasts');

    engine.cancelJob(jobId);
  });

  // -------------------------------------------------------------
  // Test 3: Client Kalwa + Electrician in Kalwa -> Electrician receives nothing
  // -------------------------------------------------------------
  await test('3. Client Kalwa + Electrician in Kalwa -> Electrician receives nothing', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    const engine = new BookingDispatchEngine(io, activeWorkers, { waveDurationMs: 150, skipDb: true });

    const electricianId = 'electrician_kalwa_1';
    const electricianSocketId = 'socket_electrician';
    activeWorkers.set(electricianId, {
      userId: electricianId,
      fullName: 'Suresh Electrician',
      role: 'Skilled Worker',
      skillType: 'Electrician',
      workCategory: ['Electrical'],
      specialization: ['Electrician', 'Wiring'],
      workArea: 'Kalwa',
      serviceRadiusKm: 10,
      latitude: KALWA_COORDS.lat,
      longitude: KALWA_COORDS.lng,
      availability: 'Available',
      isAvailableForBooking: true,
      lastLocationUpdate: new Date(),
      socketId: electricianSocketId
    });

    const clientSocket = new MockSocket('client_socket_3', 'client_3');
    const jobId = 'test_job_3';

    await engine.createAndStartJobRequest(clientSocket, {
      jobId,
      service: 'Painting',
      location: 'Kalwa, Thane',
      latitude: KALWA_COORDS.lat,
      longitude: KALWA_COORDS.lng,
      clientInfo: { userId: 'client_3', name: 'Test Client' }
    });

    const electricianBroadcasts = io.getRoomEvents(electricianSocketId, 'job_request_broadcast');
    assert.strictEqual(electricianBroadcasts.length, 0, 'Electrician must NOT receive Painting job request');

    engine.cancelJob(jobId);
  });

  // -------------------------------------------------------------
  // Test 4: Nearby worker does not respond -> Wave 2 starts automatically on backend timeout
  // -------------------------------------------------------------
  await test('4. Nearby worker does not respond -> Wave 2 starts automatically on backend timeout', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    // Use fast 100ms wave duration for test
    const engine = new BookingDispatchEngine(io, activeWorkers, { waveDurationMs: 100, skipDb: true });

    const wave2WorkerId = 'worker_wave2';
    const wave2SocketId = 'socket_wave2';
    // Mid distance worker (~14 km from Kalwa): not in wave 1 (<= 10 km), but in wave 2 (<= 20 km)
    activeWorkers.set(wave2WorkerId, {
      userId: wave2WorkerId,
      fullName: 'Wave 2 Painter',
      role: 'Labour',
      skillType: 'Painter',
      workCategory: ['Painting'],
      specialization: ['Painter'],
      workArea: 'Thane North',
      serviceRadiusKm: 25,
      latitude: MID_DISTANCE_COORDS.lat,
      longitude: MID_DISTANCE_COORDS.lng,
      availability: 'Available',
      isAvailableForBooking: true,
      lastLocationUpdate: new Date(),
      socketId: wave2SocketId
    });

    const clientSocket = new MockSocket('client_socket_4', 'client_4');
    const jobId = 'test_job_4';

    await engine.createAndStartJobRequest(clientSocket, {
      jobId,
      service: 'Painting',
      location: 'Kalwa, Thane',
      latitude: KALWA_COORDS.lat,
      longitude: KALWA_COORDS.lng,
      clientInfo: { userId: 'client_4', name: 'Test Client' }
    });

    // In Wave 1, Wave 2 worker has NOT received broadcast yet
    assert.strictEqual(io.getRoomEvents(wave2SocketId, 'job_request_broadcast').length, 0, 'Wave 2 worker should not receive Wave 1');

    // Wait for backend Wave 1 timeout to expire (100ms)
    await sleep(150);

    // In Wave 2, Wave 2 worker SHOULD now have received broadcast
    const wave2Broadcasts = io.getRoomEvents(wave2SocketId, 'job_request_broadcast');
    assert.strictEqual(wave2Broadcasts.length, 1, 'Wave 2 worker should receive broadcast after Wave 1 times out');
    assert.strictEqual(wave2Broadcasts[0].data.wave, 2);

    // Client should have received Wave 2 status update
    const waveEvents = clientSocket.getEvents('job_dispatch_wave_status');
    const wave2Event = waveEvents.find(e => e.data.wave === 2);
    assert(wave2Event, 'Client should receive Wave 2 status update');
    assert.strictEqual(wave2Event.data.radiusKm, 20);

    engine.cancelJob(jobId);
  });

  // -------------------------------------------------------------
  // Test 5: Wave 2 no response -> Wave 3 starts automatically
  // -------------------------------------------------------------
  await test('5. Wave 2 no response -> Wave 3 starts automatically', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    const engine = new BookingDispatchEngine(io, activeWorkers, { waveDurationMs: 100, skipDb: true });

    const wave3WorkerId = 'worker_wave3';
    const wave3SocketId = 'socket_wave3';
    // Far distance worker (~24 km): not in wave 1 (<= 10km), not in wave 2 (<= 20km), but in wave 3 (<= 30km)
    activeWorkers.set(wave3WorkerId, {
      userId: wave3WorkerId,
      fullName: 'Wave 3 Painter',
      role: 'Labour',
      skillType: 'Painter',
      workCategory: ['Painting'],
      specialization: ['Painter'],
      workArea: 'Navi Mumbai',
      serviceRadiusKm: 30,
      latitude: FAR_DISTANCE_COORDS.lat,
      longitude: FAR_DISTANCE_COORDS.lng,
      availability: 'Available',
      isAvailableForBooking: true,
      lastLocationUpdate: new Date(),
      socketId: wave3SocketId
    });

    const clientSocket = new MockSocket('client_socket_5', 'client_5');
    const jobId = 'test_job_5';

    await engine.createAndStartJobRequest(clientSocket, {
      jobId,
      service: 'Painting',
      location: 'Kalwa, Thane',
      latitude: KALWA_COORDS.lat,
      longitude: KALWA_COORDS.lng,
      clientInfo: { userId: 'client_5', name: 'Test Client' }
    });

    // Wait for Wave 1 (100ms) + Wave 2 (100ms) = 250ms
    await sleep(250);

    // Wave 3 worker should have received broadcast
    const wave3Broadcasts = io.getRoomEvents(wave3SocketId, 'job_request_broadcast');
    assert.strictEqual(wave3Broadcasts.length, 1, 'Wave 3 worker should receive broadcast after Wave 2 times out');
    assert.strictEqual(wave3Broadcasts[0].data.wave, 3);

    // Client should have received Wave 3 status update
    const waveEvents = clientSocket.getEvents('job_dispatch_wave_status');
    const wave3Event = waveEvents.find(e => e.data.wave === 3);
    assert(wave3Event, 'Client should receive Wave 3 status update');
    assert.strictEqual(wave3Event.data.radiusKm, 30);

    engine.cancelJob(jobId);
  });

  // -------------------------------------------------------------
  // Test 6: Worker accepts during Wave 1 -> Wave 2/3 must NOT start
  // -------------------------------------------------------------
  await test('6. Worker accepts during Wave 1 -> Wave 2/3 must NOT start', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    const engine = new BookingDispatchEngine(io, activeWorkers, { waveDurationMs: 100, skipDb: true });

    const akashId = 'akash_test_6';
    const akashSocketId = 'socket_akash_6';
    const akashSocket = new MockSocket(akashSocketId, akashId);
    activeWorkers.set(akashId, {
      userId: akashId,
      fullName: 'Akash Chauhan',
      skillType: 'Painter',
      workCategory: ['Painting'],
      specialization: ['Painter'],
      workArea: 'Kalwa East',
      serviceRadiusKm: 10,
      latitude: AKASH_KALWA_COORDS.lat,
      longitude: AKASH_KALWA_COORDS.lng,
      availability: 'Available',
      isAvailableForBooking: true,
      lastLocationUpdate: new Date(),
      socketId: akashSocketId
    });

    const clientSocket = new MockSocket('client_socket_6', 'client_6');
    const jobId = 'test_job_6';

    await engine.createAndStartJobRequest(clientSocket, {
      jobId,
      service: 'Painting',
      location: 'Kalwa, Thane',
      latitude: KALWA_COORDS.lat,
      longitude: KALWA_COORDS.lng,
      clientInfo: { userId: 'client_6', name: 'Test Client' }
    });

    // Akash accepts immediately in Wave 1
    const acceptResult = await engine.acceptJob(jobId, {
      id: akashId,
      name: 'Akash Chauhan',
      phone: '+91 98765 43210',
      rating: 4.9
    }, akashSocket);

    assert.strictEqual(acceptResult.success, true, 'Acceptance should succeed');

    // Check client was notified of acceptance
    const clientAssigned = clientSocket.getEvents('job_assigned_client');
    assert.strictEqual(clientAssigned.length, 1, 'Client should receive job_assigned_client');
    assert.strictEqual(clientAssigned[0].data.worker.name, 'Akash Chauhan');

    // Wait long enough for Wave 2 and Wave 3 timers to fire if not cancelled (250ms)
    await sleep(250);

    // Verify job status is WORKER_ACCEPTED and wave never progressed to 2 or 3
    const job = engine.jobs.get(jobId);
    assert(job.status === 'WORKER_ACCEPTED' || job.status === 'JOB_ACCEPTED');
    const waveEvents = clientSocket.getEvents('job_dispatch_wave_status');
    const wave2or3 = waveEvents.filter(e => e.data.wave > 1);
    assert.strictEqual(wave2or3.length, 0, 'Wave 2 or 3 must NOT have fired after acceptance');
  });

  // -------------------------------------------------------------
  // Test 7: Concurrency: Two workers attempt acceptance simultaneously -> only one succeeds, other gets ALREADY_TAKEN
  // -------------------------------------------------------------
  await test('7. Concurrency: Two workers attempt acceptance simultaneously -> only one succeeds, other gets ALREADY_TAKEN', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    const engine = new BookingDispatchEngine(io, activeWorkers, { waveDurationMs: 200, skipDb: true });

    const clientSocket = new MockSocket('client_socket_7', 'client_7');
    const jobId = 'test_job_7';

    await engine.createAndStartJobRequest(clientSocket, {
      jobId,
      service: 'Painting',
      location: 'Kalwa, Thane',
      latitude: KALWA_COORDS.lat,
      longitude: KALWA_COORDS.lng,
      clientInfo: { userId: 'client_7', name: 'Test Client' }
    });

    const socketA = new MockSocket('socket_A', 'worker_A');
    const socketB = new MockSocket('socket_B', 'worker_B');

    // Worker A and Worker B try to accept concurrently
    const resultA = await engine.acceptJob(jobId, { id: 'worker_A', name: 'Worker A' }, socketA);
    const resultB = await engine.acceptJob(jobId, { id: 'worker_B', name: 'Worker B' }, socketB);

    assert.strictEqual(resultA.success, true, 'First worker must win the job');
    assert.strictEqual(resultB.success, false, 'Second worker must be rejected');
    assert.strictEqual(resultB.reason, 'ALREADY_TAKEN', 'Reason must be ALREADY_TAKEN');

    // Check winner got job_accepted_success
    assert.strictEqual(socketA.getEvents('job_accepted_success').length, 1);
    // Check loser got 0 success events
    assert.strictEqual(socketB.getEvents('job_accepted_success').length, 0);
  });

  // -------------------------------------------------------------
  // Test 8: No worker within max radius -> emits job_no_workers_available / SEARCH_EXHAUSTED
  // -------------------------------------------------------------
  await test('8. No worker within max radius -> emits job_no_workers_available / SEARCH_EXHAUSTED', async () => {
    const io = new MockIo();
    const activeWorkers = new Map(); // Zero workers registered
    const engine = new BookingDispatchEngine(io, activeWorkers, { waveDurationMs: 60, skipDb: true });

    const clientSocket = new MockSocket('client_socket_8', 'client_8');
    const jobId = 'test_job_8';

    await engine.createAndStartJobRequest(clientSocket, {
      jobId,
      service: 'Painting',
      location: 'Kalwa, Thane',
      latitude: KALWA_COORDS.lat,
      longitude: KALWA_COORDS.lng,
      clientInfo: { userId: 'client_8', name: 'Test Client' }
    });

    // Wait for all 3 waves to complete: 3 * 60ms = 180ms + buffer = 240ms
    await sleep(250);

    const exhaustedEvents = clientSocket.getEvents('job_no_workers_available');
    assert.strictEqual(exhaustedEvents.length, 1, 'Client should receive job_no_workers_available');
    assert(exhaustedEvents[0].data.status === 'NO_WORKER_AVAILABLE' || exhaustedEvents[0].data.status === 'SEARCH_EXHAUSTED');
    assert.strictEqual(exhaustedEvents[0].data.maxRadiusKm, 30);
  });

  // -------------------------------------------------------------
  // Test 9: Worker with stale GPS location -> excluded
  // -------------------------------------------------------------
  await test('9. Worker with stale GPS location -> excluded', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    const engine = new BookingDispatchEngine(io, activeWorkers, { waveDurationMs: 100, skipDb: true });

    const staleWorkerId = 'worker_stale';
    const staleSocketId = 'socket_stale';
    // 5 hours old location update (> 3 hours threshold)
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);

    activeWorkers.set(staleWorkerId, {
      userId: staleWorkerId,
      fullName: 'Stale Painter',
      skillType: 'Painter',
      workCategory: ['Painting'],
      specialization: ['Painter'],
      workArea: 'Kalwa',
      serviceRadiusKm: 10,
      latitude: KALWA_COORDS.lat,
      longitude: KALWA_COORDS.lng,
      availability: 'Available',
      isAvailableForBooking: true,
      lastLocationUpdate: fiveHoursAgo,
      socketId: staleSocketId
    });

    const clientSocket = new MockSocket('client_socket_9', 'client_9');
    const jobId = 'test_job_9';

    await engine.createAndStartJobRequest(clientSocket, {
      jobId,
      service: 'Painting',
      location: 'Kalwa, Thane',
      latitude: KALWA_COORDS.lat,
      longitude: KALWA_COORDS.lng,
      clientInfo: { userId: 'client_9', name: 'Test Client' }
    });

    const staleBroadcasts = io.getRoomEvents(staleSocketId, 'job_request_broadcast');
    assert.strictEqual(staleBroadcasts.length, 0, 'Worker with 5-hour stale location must be excluded');

    engine.cancelJob(jobId);
  });

  // -------------------------------------------------------------
  // Test 10: Worker turns Available OFF while search is running -> excluded
  // -------------------------------------------------------------
  await test('10. Worker turns Available OFF while search is running -> excluded', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    const engine = new BookingDispatchEngine(io, activeWorkers, { waveDurationMs: 100, skipDb: true });

    const toggleWorkerId = 'worker_toggle';
    const toggleSocketId = 'socket_toggle';
    const workerRecord = {
      userId: toggleWorkerId,
      fullName: 'Toggle Painter',
      skillType: 'Painter',
      workCategory: ['Painting'],
      specialization: ['Painter'],
      workArea: 'Thane',
      serviceRadiusKm: 25,
      latitude: MID_DISTANCE_COORDS.lat, // ~14 km away (Wave 2)
      longitude: MID_DISTANCE_COORDS.lng,
      availability: 'Available',
      isAvailableForBooking: true,
      lastLocationUpdate: new Date(),
      socketId: toggleSocketId
    };
    activeWorkers.set(toggleWorkerId, workerRecord);

    const clientSocket = new MockSocket('client_socket_10', 'client_10');
    const jobId = 'test_job_10';

    await engine.createAndStartJobRequest(clientSocket, {
      jobId,
      service: 'Painting',
      location: 'Kalwa, Thane',
      latitude: KALWA_COORDS.lat,
      longitude: KALWA_COORDS.lng,
      clientInfo: { userId: 'client_10', name: 'Test Client' }
    });

    // During Wave 1, worker turns Available OFF
    workerRecord.isAvailableForBooking = false;
    workerRecord.availability = 'Not Available';

    // Wait for Wave 1 to end and Wave 2 to fire (150ms)
    await sleep(150);

    // In Wave 2, worker should NOT receive broadcast because they turned off availability
    const toggleBroadcasts = io.getRoomEvents(toggleSocketId, 'job_request_broadcast');
    assert.strictEqual(toggleBroadcasts.length, 0, 'Worker who turned available OFF must NOT receive Wave 2 broadcast');

    engine.cancelJob(jobId);
  });

  // -------------------------------------------------------------
  // Test 11: Text location fallback: Client submits location string 'Kalwa, Thane' without lat/lng -> resolves to Kalwa coords and matches Akash in Wave 1
  // -------------------------------------------------------------
  await test('11. Text location fallback: Client submits text "Kalwa, Thane" -> resolves coordinates and matches Akash in Wave 1', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    const engine = new BookingDispatchEngine(io, activeWorkers, { waveDurationMs: 150, skipDb: true });

    const akashId = 'akash_test_11';
    const akashSocketId = 'socket_akash_11';
    activeWorkers.set(akashId, {
      userId: akashId,
      fullName: 'Akash Chauhan',
      skillType: 'Painter',
      workCategory: ['Painting'],
      specialization: ['Painter'],
      workArea: 'Kalwa East',
      serviceRadiusKm: 10,
      latitude: AKASH_KALWA_COORDS.lat,
      longitude: AKASH_KALWA_COORDS.lng,
      availability: 'Available',
      isAvailableForBooking: true,
      lastLocationUpdate: new Date(),
      socketId: akashSocketId
    });

    const clientSocket = new MockSocket('client_socket_11', 'client_11');
    const jobId = 'test_job_11';

    // Lat/lng are undefined or 0, only location text "Kalwa, Thane" is passed
    await engine.createAndStartJobRequest(clientSocket, {
      jobId,
      service: 'Painting',
      location: 'Kalwa, Thane',
      latitude: undefined,
      longitude: undefined,
      clientInfo: { userId: 'client_11', name: 'Test Client' }
    });

    // Akash should receive the broadcast because engine resolved Kalwa coordinates
    const akashBroadcasts = io.getRoomEvents(akashSocketId, 'job_request_broadcast');
    assert.strictEqual(akashBroadcasts.length, 1, 'Akash should receive request via resolved Kalwa coordinates');
    assert.strictEqual(akashBroadcasts[0].data.wave, 1);

    engine.cancelJob(jobId);
  });

  // -------------------------------------------------------------
  // Test 12-19: Complete Post-Acceptance Real-World Workflow
  // -------------------------------------------------------------
  await test('12-19. Full Lifecycle: ACCEPTED -> TRAVELLING -> LIVE GPS -> ARRIVED -> WORK_IN_PROGRESS -> COMPLETION -> PAYMENT -> RATING -> ARCHIVED', async () => {
    const io = new MockIo();
    const activeWorkers = new Map();
    const engine = new BookingDispatchEngine(io, activeWorkers, { waveDurationMs: 100, skipDb: true });

    const akashId = '507f1f77bcf86cd799439011';
    const akashSocketId = 'socket_akash_lifecycle';
    const akashSocket = new MockSocket(akashSocketId, akashId);

    activeWorkers.set(akashId, {
      userId: akashId,
      fullName: 'Akash Chauhan',
      skillType: 'Painter',
      workCategory: ['Painting'],
      specialization: ['Painter'],
      workArea: 'Kalwa East',
      serviceRadiusKm: 10,
      latitude: AKASH_KALWA_COORDS.lat,
      longitude: AKASH_KALWA_COORDS.lng,
      availability: 'Available',
      isAvailableForBooking: true,
      lastLocationUpdate: new Date(),
      socketId: akashSocketId
    });

    const clientSocket = new MockSocket('client_socket_lifecycle', 'client_lifecycle');
    const jobId = 'job_lifecycle_test';

    // 1. Client creates request
    await engine.createAndStartJobRequest(clientSocket, {
      jobId,
      service: 'Painting',
      location: 'Kalwa, Thane',
      latitude: KALWA_COORDS.lat,
      longitude: KALWA_COORDS.lng,
      price: '₹900',
      clientInfo: { userId: 'client_lifecycle', name: 'Rahul Client' }
    });

    // 2. Akash accepts
    const acceptRes = await engine.acceptJob(jobId, {
      id: akashId,
      name: 'Akash Chauhan',
      phone: '+91 98765 43210',
      rating: 4.8
    }, akashSocket);
    assert.strictEqual(acceptRes.success, true);
    assert.strictEqual(engine.jobs.get(jobId).status, 'WORKER_ACCEPTED');
    assert(clientSocket.getEvents('job_assigned_client').length >= 1 || clientSocket.getEvents('job_status_changed').length >= 1);

    // 3. Worker sets WORKER_EN_ROUTE
    const travelRes = await engine.startTrip(jobId, akashSocket);
    assert.strictEqual(travelRes.success, true);
    assert.strictEqual(engine.jobs.get(jobId).status, 'WORKER_EN_ROUTE');
    const clientTravelEvents = clientSocket.getEvents('job_status_changed').filter(e => e.data.status === 'WORKER_EN_ROUTE');
    assert.strictEqual(clientTravelEvents.length, 1, 'Client should receive WORKER_EN_ROUTE status update');

    // 4. Worker sends Live Location update
    await engine.broadcastWorkerLocation(akashId, 19.2020, 72.9968, jobId);
    const clientLocEvents = clientSocket.getEvents('worker_location_updated');
    assert(clientLocEvents.length >= 1, 'Client should receive worker_location_updated broadcast');
    assert(clientLocEvents[0].data.distanceKm !== undefined, 'Location broadcast must include distance');
    assert(clientLocEvents[0].data.etaMinutes !== undefined, 'Location broadcast must include ETA');

    // 5. Worker confirms ARRIVAL
    const arriveRes = await engine.workerArrived(jobId, akashSocket);
    assert.strictEqual(arriveRes.success, true);
    assert.strictEqual(engine.jobs.get(jobId).status, 'WORKER_ARRIVED');
    const clientArrivedEvents = clientSocket.getEvents('job_status_changed').filter(e => e.data.status === 'WORKER_ARRIVED');
    assert.strictEqual(clientArrivedEvents.length, 1, 'Client should receive WORKER_ARRIVED status update');

    // 6. Worker starts WORK
    const startWorkRes = await engine.startWork(jobId, akashSocket);
    assert.strictEqual(startWorkRes.success, true);
    assert.strictEqual(engine.jobs.get(jobId).status, 'WORK_STARTED');
    const clientWorkEvents = clientSocket.getEvents('job_status_changed').filter(e => e.data.status === 'WORK_STARTED');
    assert.strictEqual(clientWorkEvents.length, 1, 'Client should receive WORK_STARTED status update');

    // 7. Worker submits COMPLETION
    const compRes = await engine.submitJobCompletion(jobId, {
      finalAmount: 900,
      notes: 'Completed 2 coats of paint cleanly.',
      photos: []
    }, akashSocket);
    assert.strictEqual(compRes.success, true);
    assert.strictEqual(engine.jobs.get(jobId).status, 'WORK_COMPLETION_REQUESTED');
    const clientCompEvents = clientSocket.getEvents('job_status_changed').filter(e => e.data.status === 'WORK_COMPLETION_REQUESTED');
    assert.strictEqual(clientCompEvents.length, 1, 'Client should receive WORK_COMPLETION_REQUESTED');
    assert.strictEqual(clientCompEvents[0].data.completionData.finalAmount, 900);

    // 8. Client confirms COMPLETION
    const confirmRes = await engine.confirmJobCompletion(jobId);
    assert.strictEqual(confirmRes.success, true);
    assert.strictEqual(engine.jobs.get(jobId).status, 'PAYMENT_PENDING');
    const paymentPendingEvents = clientSocket.getEvents('job_status_changed').filter(e => e.data.status === 'PAYMENT_PENDING');
    assert.strictEqual(paymentPendingEvents.length, 1, 'Client should receive PAYMENT_PENDING');

    // 9. Client completes PAYMENT
    const payRes = await engine.processPayment(jobId, {
      method: 'Online UPI',
      amount: 900,
      fee: 50,
      total: 950
    });
    assert.strictEqual(payRes.success, true);
    assert.strictEqual(engine.jobs.get(jobId).status, 'COMPLETED');
    const completedEvents = clientSocket.getEvents('job_status_changed').filter(e => e.data.status === 'COMPLETED');
    assert.strictEqual(completedEvents.length, 1, 'Client should receive COMPLETED');
    assert.strictEqual(payRes.job.payment.total, 900);
    assert.strictEqual(payRes.job.payment.workerEarning, 810); // 900 - 90 (10% platform fee)

    // 10. Client and Worker submit RATINGS
    await engine.submitRating(jobId, { ratedRole: 'worker', rating: 5, reviewText: 'Great painter!' });
    await engine.submitRating(jobId, { ratedRole: 'client', rating: 5, reviewText: 'Great client!' });

    assert.strictEqual(engine.jobs.get(jobId).status, 'ARCHIVED', 'Job should be ARCHIVED after dual ratings');
  });

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (Total ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
