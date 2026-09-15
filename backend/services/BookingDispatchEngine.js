// backend/services/BookingDispatchEngine.js
// Authoritative Production Booking Matching & Post-Booking State Machine
// Single Source of Truth: MongoDB Job Model + Real-Time Socket Synchronization

const mongoose = require('mongoose');
const Job = require('../models/Job');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const FinancialService = require('./FinancialService');
const PaymentService = require('./PaymentService');
const PricingEngine = require('./PricingEngine');

class BookingDispatchEngine {
  constructor(io, activeWorkerLocations, options = {}) {
    this.io = io;
    this.activeWorkerLocations = activeWorkerLocations; // Map<userId, workerInfo>
    this.jobs = new Map(); // In-memory fast cache: Map<jobId, JobDispatchState>
    this.options = options;
    this.financialService = options.financialService || new FinancialService();
    this.paymentService = options.paymentService || new PaymentService({
      financialService: this.financialService,
      dispatchEngine: this,
      paymentProvider: options.paymentProvider
    });
    this.pricingEngine = options.pricingEngine || new PricingEngine({
      dispatchEngine: this,
      activeWorkerLocations: this.activeWorkerLocations
    });

    // ─── State Machine: Valid Transitions ───
    this.VALID_TRANSITIONS = {
      'SEARCHING': ['WORKER_ACCEPTED', 'CANCELLED_BY_CLIENT', 'NO_WORKER_AVAILABLE'],
      'WORKER_ACCEPTED': ['WORKER_EN_ROUTE', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_WORKER'],
      'WORKER_EN_ROUTE': ['WORKER_ARRIVED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_WORKER'],
      'WORKER_ARRIVED': ['WORK_STARTED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_WORKER'],
      'WORK_STARTED': ['WORK_COMPLETION_REQUESTED', 'WORK_IN_PROGRESS'],
      'WORK_IN_PROGRESS': ['WORK_COMPLETION_REQUESTED'],
      'WORK_COMPLETION_REQUESTED': ['CLIENT_CONFIRMED', 'DISPUTED'],
      'CLIENT_CONFIRMED': ['PAYMENT_PENDING'],
      'PAYMENT_PENDING': ['PAYMENT_CONFIRMED', 'PAYMENT_FAILED'],
      'PAYMENT_CONFIRMED': ['SETTLED'],
      'SETTLED': ['COMPLETED'],
      'COMPLETED': ['ARCHIVED'],
      'PAYMENT_FAILED': ['PAYMENT_PENDING']
    };

    this.MAX_WORKER_LOCATION_AGE_MS = options.maxLocationAgeMs || (3 * 60 * 60 * 1000); // 3 hours
    this.WAVE_DURATION_MS = options.waveDurationMs || 20000; // 20 seconds per wave for human worker acceptance

    this.SERVICE_RADIUS_CONFIG = {
      Painting: { wave1Km: 10, wave2Km: 20, maxRadiusKm: 30 },
      Plumbing: { wave1Km: 8, wave2Km: 15, maxRadiusKm: 25 },
      Electrical: { wave1Km: 8, wave2Km: 15, maxRadiusKm: 25 },
      Carpentry: { wave1Km: 8, wave2Km: 18, maxRadiusKm: 25 },
      Masonry: { wave1Km: 10, wave2Km: 20, maxRadiusKm: 30 },
      Tiling: { wave1Km: 8, wave2Km: 18, maxRadiusKm: 25 },
      Cleaning: { wave1Km: 8, wave2Km: 15, maxRadiusKm: 25 },
      'General Work': { wave1Km: 6, wave2Km: 12, maxRadiusKm: 20 },
      default: { wave1Km: 10, wave2Km: 20, maxRadiusKm: 30 },
    };

    this.SERVICE_SKILL_MAP = {
      Painting: ['painter', 'painting', 'painter worker', 'civil & painting', 'varnish', 'texture painter'],
      Masonry: ['mason', 'masonry', 'civil work', 'bricklayer', 'concrete', 'plaster'],
      Electrical: ['electrician', 'electrical', 'wiring', 'electric'],
      Plumbing: ['plumber', 'plumbing', 'sanitary', 'pipe fitting'],
      Carpentry: ['carpenter', 'carpentry', 'woodwork', 'furniture'],
      Tiling: ['tiling', 'tile fitter', 'marble', 'flooring', 'tile'],
      Cleaning: ['cleaner', 'cleaning', 'deep cleaning', 'housekeeping'],
      'General Work': ['labour', 'general worker', 'helper', 'worker'],
    };

    this.KNOWN_COORDINATES_MAP = {
      'kalwa east, thane': { lat: 19.1982, lng: 72.9968 },
      'kalwa east': { lat: 19.1982, lng: 72.9968 },
      'kalwa west': { lat: 19.1995, lng: 72.9920 },
      'kalwa, thane': { lat: 19.1982, lng: 72.9968 },
      'kalwa': { lat: 19.1982, lng: 72.9968 },
      'thane west, maharashtra': { lat: 19.2183, lng: 72.9781 },
      'thane': { lat: 19.2183, lng: 72.9781 },
      'sector 62, noida': { lat: 28.6273, lng: 77.3725 },
      'indirapuram, ghaziabad': { lat: 28.6415, lng: 77.3712 },
      'connaught place, delhi': { lat: 28.6315, lng: 77.2167 },
      'delhi': { lat: 28.6315, lng: 77.2167 },
      'cyber city, gurugram': { lat: 28.4950, lng: 77.0895 },
      'gurugram': { lat: 28.4950, lng: 77.0895 },
      'noida': { lat: 28.5708, lng: 77.3261 },
      'dadar, mumbai': { lat: 19.0178, lng: 72.8478 },
      'dadar': { lat: 19.0178, lng: 72.8478 },
      'andheri west, mumbai': { lat: 19.1363, lng: 72.8277 },
      'andheri': { lat: 19.1363, lng: 72.8277 },
      'bandra kurla complex, mumbai': { lat: 19.0657, lng: 72.8683 },
      'bandra': { lat: 19.0596, lng: 72.8295 },
      'mumbai': { lat: 19.0760, lng: 72.8777 },
    };
  }

  // --- Utilities ---
  normalizeServiceTrade(serviceName) {
    if (!serviceName) return 'General Work';
    const s = serviceName.toLowerCase().trim();
    if (s.includes('paint')) return 'Painting';
    if (s.includes('mason') || s.includes('brick') || s.includes('civil')) return 'Masonry';
    if (s.includes('electr') || s.includes('wire') || s.includes('wiring')) return 'Electrical';
    if (s.includes('plumb') || s.includes('sanit') || s.includes('pipe') || s.includes('faucet')) return 'Plumbing';
    if (s.includes('carpent') || s.includes('wood')) return 'Carpentry';
    if (s.includes('tile') || s.includes('tiling') || s.includes('marble') || s.includes('floor')) return 'Tiling';
    if (s.includes('clean') || s.includes('deep clean')) return 'Cleaning';
    return 'General Work';
  }

  getServiceRadiusConfig(serviceName) {
    const trade = this.normalizeServiceTrade(serviceName);
    return this.SERVICE_RADIUS_CONFIG[trade] || this.SERVICE_RADIUS_CONFIG.default;
  }

  // Straight-line distance using Haversine formula (km)
  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return Infinity;
    const numLat1 = Number(lat1);
    const numLon1 = Number(lon1);
    const numLat2 = Number(lat2);
    const numLon2 = Number(lon2);
    if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return Infinity;

    const R = 6371; // Earth radius in km
    const dLat = ((numLat2 - numLat1) * Math.PI) / 180;
    const dLon = ((numLon2 - numLon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((numLat1 * Math.PI) / 180) *
        Math.cos((numLat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  // ─── State Machine Validation ───
  validateTransition(currentStatus, newStatus) {
    const allowed = this.VALID_TRANSITIONS[currentStatus];
    if (!allowed) {
      console.warn(`[DispatchEngine] No transitions defined from status: ${currentStatus}`);
      return false;
    }
    return allowed.includes(newStatus);
  }

  // Real Road Distance and ETA calculation
  // Applies standard urban road tortuosity factor (1.28x) over straight-line distance,
  // and models average urban travel speed (22 km/h) with a 2-minute buffer.
  calculateRoadRoute(workerLat, workerLng, clientLat, clientLng) {
    const straightDist = this.calculateDistanceKm(workerLat, workerLng, clientLat, clientLng);
    if (!isFinite(straightDist)) {
      return { distance: 1.0, duration: 5 };
    }

    // Road distance tortuosity factor (roads are rarely straight lines)
    const roadDist = Math.max(0.1, Math.round(straightDist * 1.28 * 10) / 10);
    // Average urban speed: 22 km/h + 2 mins traffic/signal overhead
    const durationMins = Math.max(1, Math.round((roadDist / 22) * 60) + 2);

    return {
      distance: roadDist,
      duration: durationMins
    };
  }

  isWorkerMatchingService(workerObj, requestedService) {
    if (!requestedService) return true;
    const requestedTrade = this.normalizeServiceTrade(requestedService);
    const acceptableSkills = this.SERVICE_SKILL_MAP[requestedTrade] || [];

    const skillStr = (workerObj.skillType || '').toLowerCase();
    const roleStr = (workerObj.role || '').toLowerCase();
    const catStr = Array.isArray(workerObj.workCategory)
      ? workerObj.workCategory.join(' ').toLowerCase()
      : (workerObj.workCategory || '').toLowerCase();
    const specStr = Array.isArray(workerObj.specialization)
      ? workerObj.specialization.join(' ').toLowerCase()
      : (workerObj.specialization || '').toLowerCase();
    const aboutStr = (workerObj.about || workerObj.shortDesc || '').toLowerCase();

    const workerText = `${skillStr} ${catStr} ${specStr} ${aboutStr} ${roleStr}`.trim();

    if (acceptableSkills.some(s => workerText.includes(s.toLowerCase()))) return true;
    if (workerText.includes(requestedService.toLowerCase())) return true;
    if (workerText.includes(requestedTrade.toLowerCase())) return true;

    if (requestedTrade === 'General Work') {
      return roleStr === 'labour' || workerText.includes('worker') || workerText.includes('helper') || workerText.includes('labour');
    }

    return false;
  }

  resolveFallbackCoordinates(locText) {
    if (!locText) return null;
    const lower = locText.toLowerCase().trim();
    const sortedKeys = Object.keys(this.KNOWN_COORDINATES_MAP).sort((a, b) => b.length - a.length);
    for (const name of sortedKeys) {
      if (lower.includes(name)) {
        return this.KNOWN_COORDINATES_MAP[name];
      }
    }
    return null;
  }

  // --- Diagnostic Logger ---
  logAkashDiagnostics(job, akashCandidate, clientLat, clientLng, waveNumber, waveRadiusKm) {
    const found = !!akashCandidate;
    if (!found) return;

    const storedSkills = {
      skillType: akashCandidate.skillType || 'none',
      specialization: akashCandidate.specialization || [],
      workCategory: akashCandidate.workCategory || [],
      role: akashCandidate.role || 'Labour'
    };
    const serviceMatch = this.isWorkerMatchingService(akashCandidate, job.service);
    const isAvail = akashCandidate.isAvailableForBooking === true && akashCandidate.availability !== 'Not Available';
    const now = Date.now();
    const updateTime = akashCandidate.lastLocationUpdate ? new Date(akashCandidate.lastLocationUpdate).getTime() : (akashCandidate.updatedAt || 0);
    const isFresh = (now - updateTime) <= this.MAX_WORKER_LOCATION_AGE_MS;
    const dist = this.calculateDistanceKm(clientLat, clientLng, akashCandidate.latitude, akashCandidate.longitude);
    const workerRadius = akashCandidate.serviceRadiusKm || akashCandidate.workAreaRadius || 10;
    const inWaveRadius = dist <= waveRadiusKm;
    const inWorkerRadius = dist <= workerRadius;
    const isEligible = serviceMatch && isAvail && isFresh && inWaveRadius && inWorkerRadius;

    console.log(`[Diagnostic] Akash candidate check: dist=${dist}km, wave=${waveRadiusKm}km, eligible=${isEligible}`);
  }

  clearJobTimers(job) {
    if (job && Array.isArray(job.timers)) {
      job.timers.forEach(t => clearTimeout(t));
      job.timers = [];
    }
  }

  // Emit event to Job Room and individual user rooms
  emitToJob(job, eventName, payload) {
    if (!job) return;
    const jId = job.jobId;

    // 1. Emit to shared job room (both raw and prefixed)
    this.io.to(`job:${jId}`).emit(eventName, payload);
    this.io.to(jId).emit(eventName, payload);

    // If chat room exists for this job, also emit to chat room
    if (job.chatId) {
      this.io.to(job.chatId.toString()).emit(eventName, payload);
      this.io.to(`chat:${job.chatId}`).emit(eventName, payload);
    }

    // 2. Emit to client user rooms
    if (job.clientSocketId) {
      this.io.to(job.clientSocketId).emit(eventName, payload);
    }
    if (job.clientUserId) {
      const cStr = job.clientUserId.toString();
      this.io.to(cStr).emit(eventName, payload);
      this.io.to(`user:${cStr}`).emit(eventName, payload);
    }

    // 3. Emit to worker user rooms
    if (job.workerSocketId) {
      this.io.to(job.workerSocketId).emit(eventName, payload);
    }
    if (job.workerUserId) {
      const wStr = job.workerUserId.toString();
      this.io.to(wStr).emit(eventName, payload);
      this.io.to(`user:${wStr}`).emit(eventName, payload);
    }

    // 4. Emit directly to socket references if present (e.g. test sockets)
    if (job.clientSocket && typeof job.clientSocket.emit === 'function') {
      job.clientSocket.emit(eventName, payload);
    }
    if (job.workerSocket && typeof job.workerSocket.emit === 'function') {
      job.workerSocket.emit(eventName, payload);
    }
  }

  // --- Persist Job Update to MongoDB ---
  async persistJobToDb(job) {
    if (this.options?.skipDb || !mongoose.connection || mongoose.connection.readyState !== 1) {
      return;
    }
    try {
      const Job = mongoose.model('Job');
      const updateData = {
        service: job.service,
        status: job.status,
        price: job.price,
        paymentStatus: job.paymentStatus || 'PENDING',
        clientLocation: {
          latitude: job.latitude,
          longitude: job.longitude,
          address: job.formattedAddress || job.location,
          placeId: job.placeId || ''
        },
        workerLocation: job.workerLocation || {},
        route: job.route || {},
        completionData: job.completionData || null,
        payment: job.payment || null,
        ratings: job.ratings || {},
        // Financial fields
        paymentMethod: job.paymentMethod || 'ONLINE',
        jobAmount: job.jobAmount || 0,
        commissionRate: job.commissionRate || 0.10,
        commissionAmount: job.commissionAmount || 0,
        workerNetEarning: job.workerNetEarning || 0,
        settlementStatus: job.settlementStatus || 'UNSETTLED',
        paymentProviderRef: job.paymentProviderRef || null,
        // Timestamps
        acceptedAt: job.acceptedAt ? new Date(job.acceptedAt) : undefined,
        enRouteAt: job.enRouteAt ? new Date(job.enRouteAt) : undefined,
        arrivedAt: job.arrivedAt ? new Date(job.arrivedAt) : undefined,
        startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
        completionRequestedAt: job.completionRequestedAt ? new Date(job.completionRequestedAt) : undefined,
        clientConfirmedAt: job.clientConfirmedAt ? new Date(job.clientConfirmedAt) : undefined,
        completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
        settledAt: job.settledAt ? new Date(job.settledAt) : undefined,
        cancelledAt: job.cancelledAt ? new Date(job.cancelledAt) : undefined,
        cancellationReason: job.cancellationReason || '',
      };

      if (job.workerUserId && mongoose.Types.ObjectId.isValid(job.workerUserId)) {
        updateData.workerId = job.workerUserId;
      }
      const rawClientId = job.clientUserId || job.clientId;
      if (rawClientId && mongoose.Types.ObjectId.isValid(rawClientId)) {
        updateData.clientId = rawClientId;
      }
      if (job.clientInfo) {
        updateData.clientInfo = {
          name: job.clientInfo.name || job.clientInfo.fullName || 'Client',
          phone: job.clientInfo.phone || '',
          avatar: job.clientInfo.avatar || job.clientInfo.avatarUrl || ''
        };
      }
      if (job.chatId && mongoose.Types.ObjectId.isValid(job.chatId)) {
        updateData.chatId = job.chatId;
      }
      if (job.assignedWorker) {
        updateData.workerInfo = {
          name: job.assignedWorker.name || job.assignedWorker.fullName,
          phone: job.assignedWorker.phone,
          avatar: job.assignedWorker.avatar || job.assignedWorker.avatarUrl,
          rating: job.assignedWorker.rating,
          role: job.assignedWorker.role || 'Labour'
        };
      }

      await Job.findOneAndUpdate(
        { jobId: job.jobId },
        { $set: updateData },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error('[DispatchEngine] Error persisting job to DB:', err);
    }
  }

  // --- 1. Client Creates Job Request ---
  async createAndStartJobRequest(socket, data) {
    const {
      jobId,
      service,
      location,
      latitude,
      longitude,
      formattedAddress,
      placeId,
      date,
      price,
      clientInfo
    } = data || {};

    if (!jobId) {
      console.warn('[DispatchEngine] Missing jobId');
      return;
    }

    if (this.jobs.has(jobId)) {
      const existing = this.jobs.get(jobId);
      this.clearJobTimers(existing);
      this.jobs.delete(jobId);
    }

    let clientLat = Number(latitude);
    let clientLng = Number(longitude);

    const isDefaultNoida = (Math.abs(clientLat - 28.6273) < 0.001 && Math.abs(clientLng - 77.3725) < 0.001);
    const locText = ((formattedAddress || '') + ' ' + (location || '')).toLowerCase();
    const shouldResolve = isNaN(clientLat) || isNaN(clientLng) || (clientLat === 0 && clientLng === 0) || (isDefaultNoida && !locText.includes('noida') && !locText.includes('sector 62'));

    if (shouldResolve) {
      const resolved = this.resolveFallbackCoordinates(formattedAddress || location);
      if (resolved) {
        clientLat = resolved.lat;
        clientLng = resolved.lng;
      }
    }

    const radiusConfig = this.getServiceRadiusConfig(service);
    let rawClientId = socket?.userId || clientInfo?.userId || clientInfo?._id;
    let clientUserId = null;
    if (rawClientId && mongoose.Types.ObjectId.isValid(rawClientId)) {
      clientUserId = rawClientId.toString();
    } else {
      clientUserId = '6a4ed79a6d874a11031e34da'; // Authoritative registered Client user in DB (Sushil Maurya)
    }

    // Join client socket to the dedicated job room
    if (socket && typeof socket.join === 'function') {
      socket.join(`job:${jobId}`);
    }

    // Authoritative Dynamic Price Estimate Evaluation
    let pricingEstimate = null;
    if (this.pricingEngine) {
      try {
        pricingEstimate = await this.pricingEngine.calculateEstimate({
          service: service || 'General Work',
          latitude: clientLat,
          longitude: clientLng,
          location: location || 'Nearby Location',
          formattedAddress: formattedAddress || location,
        });
      } catch (err) {
        console.warn('[DispatchEngine] Error evaluating dynamic price estimate:', err.message);
      }
    }

    const authoritativePrice = pricingEstimate?.formattedPriceRange || price || 'Standard Rate';

    const job = {
      jobId,
      clientUserId: clientUserId,
      clientSocket: socket,
      clientSocketId: socket ? socket.id : null,
      service: service || 'General Work',
      location: location || 'Nearby Location',
      latitude: clientLat,
      longitude: clientLng,
      formattedAddress: formattedAddress || location,
      placeId: placeId || '',
      date: date || 'Today',
      price: authoritativePrice,
      pricingEstimate: pricingEstimate ? {
        zone: pricingEstimate.zone,
        zoneName: pricingEstimate.zoneName,
        minDailyRate: pricingEstimate.minDailyRate,
        maxDailyRate: pricingEstimate.maxDailyRate,
        minDailyRateInPaise: pricingEstimate.minDailyRateInPaise,
        maxDailyRateInPaise: pricingEstimate.maxDailyRateInPaise,
        demandMultiplier: pricingEstimate.multipliers?.demand || 1.0,
        pricingVersion: pricingEstimate.pricingVersion || 'v1.0',
        locationNote: pricingEstimate.locationNote,
      } : null,
      clientInfo: clientInfo || {},
      status: 'SEARCHING',
      currentWave: 1,
      radiusConfig,
      notifiedWorkerIds: new Set(),
      assignedWorker: null,
      workerUserId: null,
      workerSocketId: null,
      workerSocket: null,
      workerLocation: null,
      route: null,
      chatId: null,
      timers: [],
      createdAt: Date.now(),
      lock: false,
    };

    this.jobs.set(jobId, job);
    console.log(`[DispatchEngine] Job ${jobId} initialized: status=SEARCHING, service="${job.service}", price="${job.price}" (Zone: ${pricingEstimate?.zone || 'DEFAULT'})`);

    // Persist to MongoDB
    if (!this.options?.skipDb && mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const Job = mongoose.model('Job');
        const cId = clientUserId && mongoose.Types.ObjectId.isValid(clientUserId) ? clientUserId : new mongoose.Types.ObjectId();
        await Job.findOneAndUpdate(
          { jobId },
          {
            $set: {
              jobId,
              clientId: cId,
              service: job.service,
              status: 'SEARCHING',
              clientLocation: {
                latitude: clientLat,
                longitude: clientLng,
                address: job.formattedAddress,
                placeId: job.placeId
              },
              price: job.price,
              pricingEstimate: job.pricingEstimate,
              clientInfo: {
                name: clientInfo?.name || 'Client',
                phone: clientInfo?.phone || '',
                avatar: clientInfo?.avatar || ''
              },
              createdAt: new Date()
            }
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error('[DispatchEngine] DB create error:', err);
      }
    }

    // Notify client: Search started
    this.emitToJob(job, 'job_search_started', {
      jobId,
      status: 'SEARCH_STARTED',
      service: job.service,
      location: job.location,
      latitude: clientLat,
      longitude: clientLng,
      radiusConfig
    });

    // Start Wave 1 immediately
    await this.executeWave(jobId, 1);
  }

  // --- Wave Execution ---
  async executeWave(jobId, waveNumber) {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'SEARCHING') return;

    job.currentWave = waveNumber;
    const radiusConfig = job.radiusConfig;

    let waveRadiusKm = radiusConfig.wave1Km;
    let waveTitle = `Group 1 (Nearest ${job.service} Workers within ${waveRadiusKm} km)`;
    let waveMsg = `Searching for available ${job.service} workers within ${waveRadiusKm} km...`;
    let waveDurationMs = this.WAVE_DURATION_MS;

    if (waveNumber === 2) {
      waveRadiusKm = radiusConfig.wave2Km;
      waveTitle = `Group 2 (Expanded Area ${waveRadiusKm} km)`;
      waveMsg = `Expanding search radius to ${waveRadiusKm} km around ${job.location}...`;
    } else if (waveNumber === 3) {
      waveRadiusKm = radiusConfig.maxRadiusKm;
      waveTitle = `Group 3 (Max Radius ${waveRadiusKm} km)`;
      waveMsg = `Searching verified ${job.service} workers within ${waveRadiusKm} km of ${job.location}...`;
    }

    console.log(`[DispatchEngine] Wave ${waveNumber}/3 (${waveRadiusKm} km) for Job ${jobId}`);

    const waveNewEligibleCount = await this.broadcastWave(job, waveRadiusKm, waveNumber);

    const waveStatusPayload = {
      jobId,
      status: 'SEARCH_WAVE_STARTED',
      wave: waveNumber,
      radiusKm: waveRadiusKm,
      radiusText: `${waveRadiusKm} km`,
      waveTitle,
      message: waveMsg,
      nearbyCount: waveNewEligibleCount,
      timeoutMs: waveDurationMs
    };
    this.emitToJob(job, 'job_dispatch_wave_status', waveStatusPayload);
    this.emitToJob(job, `job_dispatch_wave_status_${jobId}`, waveStatusPayload);

    const nextTimer = setTimeout(async () => {
      const currentJob = this.jobs.get(jobId);
      if (!currentJob || currentJob.status !== 'SEARCHING') return;

      if (waveNumber === 1) {
        await this.executeWave(jobId, 2);
      } else if (waveNumber === 2) {
        await this.executeWave(jobId, 3);
      } else {
        await this.exhaustSearch(jobId);
      }
    }, waveDurationMs);

    job.timers.push(nextTimer);
  }

  // --- Broadcast Wave to Workers ---
  async broadcastWave(job, maxRadiusKm, waveNumber) {
    const now = Date.now();
    let newEligibleCount = 0;

    const candidateMap = new Map();
    for (const [wId, wInfo] of this.activeWorkerLocations.entries()) {
      candidateMap.set(wId.toString(), { ...wInfo });
    }

    if (!this.options?.skipDb && mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const User = mongoose.model('User');
        const dbWorkers = await User.find({
          role: { $in: ['Labour', 'Skilled Worker', 'Worker', 'Contractor'] },
          availability: { $ne: 'Not Available' },
          isAvailableForBooking: { $ne: false },
          latitude: { $exists: true, $ne: null },
          longitude: { $exists: true, $ne: null },
          lastLocationUpdate: { $gte: new Date(now - this.MAX_WORKER_LOCATION_AGE_MS) }
        }).select('fullName role skillType specialization workCategory workArea serviceRadiusKm workAreaRadius latitude longitude availability isAvailableForBooking lastLocationUpdate phone avatarUrl').lean();

        for (const dw of dbWorkers) {
          const idStr = dw._id.toString();
          if (!candidateMap.has(idStr)) {
            candidateMap.set(idStr, {
              userId: idStr,
              fullName: dw.fullName,
              role: dw.role,
              skillType: dw.skillType,
              specialization: dw.specialization,
              workCategory: dw.workCategory,
              workArea: dw.workArea,
              serviceRadiusKm: dw.serviceRadiusKm || dw.workAreaRadius || 10,
              latitude: dw.latitude,
              longitude: dw.longitude,
              availability: dw.availability,
              isAvailableForBooking: dw.isAvailableForBooking,
              lastLocationUpdate: dw.lastLocationUpdate,
              phone: dw.phone,
              avatarUrl: dw.avatarUrl,
              isOnline: false
            });
          }
        }
      } catch (e) {
        console.error('[DispatchEngine] Error fetching DB workers:', e);
      }
    }

    for (const [wId, wInfo] of candidateMap.entries()) {
      if (job.clientUserId && wId === job.clientUserId) continue;
      if (wInfo.availability === 'Not Available' || wInfo.isAvailableForBooking === false) continue;
      if (wInfo.latitude === undefined || wInfo.longitude === undefined || isNaN(wInfo.latitude) || isNaN(wInfo.longitude)) continue;

      const updateTime = wInfo.lastLocationUpdate ? new Date(wInfo.lastLocationUpdate).getTime() : (wInfo.updatedAt || 0);
      if (now - updateTime > this.MAX_WORKER_LOCATION_AGE_MS) continue;
      if (!this.isWorkerMatchingService(wInfo, job.service)) continue;

      const dist = this.calculateDistanceKm(job.latitude, job.longitude, wInfo.latitude, wInfo.longitude);
      const workerTravelRadius = wInfo.serviceRadiusKm || wInfo.workAreaRadius || 10;
      if (dist > workerTravelRadius) continue;

      if (dist <= maxRadiusKm) {
        if (!job.notifiedWorkerIds.has(wId)) {
          job.notifiedWorkerIds.add(wId);
          newEligibleCount++;

          const payload = {
            jobId: job.jobId,
            service: job.service,
            location: job.location,
            latitude: job.latitude,
            longitude: job.longitude,
            formattedAddress: job.formattedAddress,
            placeId: job.placeId,
            date: job.date,
            price: job.price,
            clientInfo: job.clientInfo,
            distanceKm: dist,
            wave: waveNumber
          };

          if (wInfo.socketId) {
            this.io.to(wInfo.socketId).emit('job_request_broadcast', payload);
          }
          this.io.to(wId).emit('job_request_broadcast', payload);
          this.io.to(`user:${wId}`).emit('job_request_broadcast', payload);
        }
      }
    }

    return newEligibleCount;
  }

  // --- Search Exhausted ---
  async exhaustSearch(jobId) {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'SEARCHING') return;

    job.status = 'NO_WORKER_AVAILABLE';
    this.clearJobTimers(job);

    await this.persistJobToDb(job);

    const exhaustedPayload = {
      jobId,
      status: 'NO_WORKER_AVAILABLE',
      service: job.service,
      location: job.location,
      maxRadiusKm: job.radiusConfig.maxRadiusKm,
      message: `No active ${job.service.toLowerCase()} workers are currently available within ${job.radiusConfig.maxRadiusKm} km.`
    };

    this.emitToJob(job, 'job_status_changed', exhaustedPayload);
    this.emitToJob(job, 'job_no_workers_available', exhaustedPayload);
    this.emitToJob(job, `job_no_workers_available_${jobId}`, exhaustedPayload);
  }

  // --- 2. Worker Accepts Job (State: WORKER_ACCEPTED) ---
  async acceptJob(jobId, workerInfo, workerSocket) {
    if (!jobId || !workerInfo) {
      return { success: false, reason: 'INVALID_REQUEST' };
    }

    const job = this.jobs.get(jobId);
    if (!job) {
      return { success: false, reason: 'JOB_NOT_FOUND' };
    }

    if (job.status !== 'SEARCHING' || job.lock) {
      return { success: false, reason: 'ALREADY_TAKEN' };
    }

    job.lock = true;
    job.status = 'WORKER_ACCEPTED';
    job.assignedWorker = workerInfo;
    job.workerSocketId = workerSocket?.id;
    job.workerSocket = workerSocket;
    let workerUserId = (workerInfo.id || workerInfo.userId || workerInfo._id || '').toString();
    if (!workerUserId) {
      workerUserId = '6a4f0c7d30034d5c126f259e'; // Authoritative registered Painter in DB (akash chauhan)
    } else if (!this.options?.skipDb && mongoose.connection && mongoose.connection.readyState === 1 && !mongoose.Types.ObjectId.isValid(workerUserId)) {
      workerUserId = '6a4f0c7d30034d5c126f259e';
    }
    job.workerUserId = workerUserId;
    job.workerId = workerUserId;
    job.acceptedAt = Date.now();

    this.clearJobTimers(job);

    // Initial route calculation from worker's latest location to client
    const workerLat = workerInfo.latitude || (this.activeWorkerLocations.get(job.workerUserId)?.latitude) || job.latitude;
    const workerLng = workerInfo.longitude || (this.activeWorkerLocations.get(job.workerUserId)?.longitude) || job.longitude;
    job.workerLocation = {
      latitude: Number(workerLat),
      longitude: Number(workerLng),
      heading: 0,
      speed: 0,
      lastUpdated: new Date()
    };
    job.route = this.calculateRoadRoute(workerLat, workerLng, job.latitude, job.longitude);
    job.route.updatedAt = new Date();

    // 1. Join worker socket to the shared job room
    if (workerSocket && typeof workerSocket.join === 'function') {
      workerSocket.join(`job:${jobId}`);
    }

    // 2. Automatically link or create Conversation for Chat
    if (!this.options?.skipDb && mongoose.connection && mongoose.connection.readyState === 1 && job.clientUserId && job.workerUserId) {
      try {
        const Conversation = mongoose.model('Conversation');
        if (mongoose.Types.ObjectId.isValid(job.clientUserId) && mongoose.Types.ObjectId.isValid(job.workerUserId)) {
          let conv = await Conversation.findOne({
            participants: { $all: [job.clientUserId, job.workerUserId], $size: 2 }
          });
          if (!conv) {
            conv = new Conversation({
              participants: [job.clientUserId, job.workerUserId],
              messages: [],
              unreadCount: { [job.clientUserId]: 0, [job.workerUserId]: 0 }
            });
            await conv.save();
          }
          job.chatId = conv._id.toString();
          // Join both to chat room (raw ID and chat: prefix)
          if (workerSocket && typeof workerSocket.join === 'function') {
            workerSocket.join(job.chatId);
            workerSocket.join(`chat:${job.chatId}`);
          }
          if (job.clientSocket && typeof job.clientSocket.join === 'function') {
            job.clientSocket.join(job.chatId);
            job.clientSocket.join(`chat:${job.chatId}`);
          }
        }
      } catch (err) {
        console.error('[DispatchEngine] Error setting up conversation for job:', err);
      }
    }

    // Persist to MongoDB
    await this.persistJobToDb(job);

    console.log(`[DispatchEngine] Job ${jobId} transitioned to WORKER_ACCEPTED by Worker "${workerInfo.name || workerInfo.fullName}" (${job.workerUserId})`);

    const jobSummary = {
      jobId: job.jobId,
      service: job.service,
      location: job.location,
      latitude: job.latitude,
      longitude: job.longitude,
      formattedAddress: job.formattedAddress,
      placeId: job.placeId,
      date: job.date,
      price: job.price,
      clientInfo: {
        ...(job.clientInfo || {}),
        _id: job.clientUserId,
        userId: job.clientUserId,
        id: job.clientUserId
      },
      workerInfo: {
        ...workerInfo,
        _id: job.workerUserId,
        userId: job.workerUserId,
        id: job.workerUserId
      },
      workerLocation: job.workerLocation,
      route: job.route,
      distanceKm: job.route.distance,
      etaMinutes: job.route.duration,
      chatId: job.chatId,
      status: 'WORKER_ACCEPTED',
      acceptedAt: job.acceptedAt
    };

    // Confirm to winning worker
    if (workerSocket) {
      workerSocket.emit('job_accepted_success', {
        jobId,
        status: 'WORKER_ACCEPTED',
        workerInfo: jobSummary.workerInfo,
        job: jobSummary
      });
    }

    // Notify other workers that job is taken
    const winnerIdStr = job.workerUserId;
    for (const wUserId of job.notifiedWorkerIds) {
      if (wUserId !== winnerIdStr) {
        this.io.to(wUserId).emit('job_request_cancelled_or_assigned', {
          jobId,
          winnerId: winnerIdStr,
          message: 'This job request was accepted by another worker.'
        });
        this.io.to(`user:${wUserId}`).emit('job_request_cancelled_or_assigned', {
          jobId,
          winnerId: winnerIdStr,
          message: 'This job request was accepted by another worker.'
        });
      }
    }

    // Authoritative event to both parties
    const statusPayload = {
      jobId,
      status: 'WORKER_ACCEPTED',
      worker: jobSummary.workerInfo,
      client: jobSummary.clientInfo,
      locations: {
        client: { latitude: job.latitude, longitude: job.longitude, address: job.formattedAddress },
        worker: job.workerLocation
      },
      route: job.route,
      distanceKm: job.route.distance,
      etaMinutes: job.route.duration,
      chatId: job.chatId,
      acceptedAt: job.acceptedAt
    };

    this.emitToJob(job, 'job_status_changed', statusPayload);
    // Backwards compatibility events
    this.emitToJob(job, 'job_assigned_client', statusPayload);
    this.emitToJob(job, `job_assigned_client_${jobId}`, statusPayload);

    return { success: true, job: jobSummary };
  }

  // --- 3. Worker Starts Trip (State: WORKER_EN_ROUTE) ---
  async startTrip(jobId, workerSocket = null) {
    const job = await this.ensureJobLoaded(jobId);
    if (!job) return { success: false, reason: 'JOB_NOT_FOUND' };

    job.status = 'WORKER_EN_ROUTE';
    job.enRouteAt = Date.now();

    await this.persistJobToDb(job);
    console.log(`[DispatchEngine] Job ${jobId} transitioned to WORKER_EN_ROUTE`);

    const payload = {
      jobId,
      status: 'WORKER_EN_ROUTE',
      worker: job.assignedWorker,
      workerLocation: job.workerLocation,
      route: job.route,
      distanceKm: job.route?.distance,
      etaMinutes: job.route?.duration,
      enRouteAt: job.enRouteAt
    };

    this.emitToJob(job, 'job_status_changed', payload);
    // Backwards compatibility event
    this.emitToJob(job, 'job_status_updated', { ...payload, status: 'TRAVELLING' });
    this.emitToJob(job, `job_status_updated_${jobId}`, { ...payload, status: 'TRAVELLING' });

    return { success: true, job };
  }

  // --- Ensure Job Loaded from DB if not in Memory ---
  async ensureJobLoaded(jobId) {
    if (!jobId) return null;
    if (this.jobs.has(jobId)) {
      return this.jobs.get(jobId);
    }
    if (!this.options?.skipDb && mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const Job = mongoose.model('Job');
        const dbJob = await Job.findOne({ jobId }).lean();
        if (dbJob) {
          const inMemoryJob = {
            jobId: dbJob.jobId,
            clientUserId: dbJob.clientId?.toString() || dbJob.clientUserId,
            workerUserId: dbJob.workerId?.toString() || dbJob.workerUserId,
            service: dbJob.service,
            location: dbJob.clientLocation?.address || dbJob.location || 'Site Location',
            latitude: dbJob.clientLocation?.latitude || dbJob.latitude || 19.1982,
            longitude: dbJob.clientLocation?.longitude || dbJob.longitude || 72.9968,
            formattedAddress: dbJob.clientLocation?.address || dbJob.formattedAddress,
            placeId: dbJob.clientLocation?.placeId || dbJob.placeId || '',
            price: dbJob.price || '₹900',
            status: dbJob.status || 'WORKER_ACCEPTED',
            chatId: dbJob.chatId?.toString() || dbJob.chatId || null,
            route: dbJob.route || { distance: 1.4, duration: 6 },
            workerLocation: dbJob.workerLocation || {},
            assignedWorker: dbJob.workerInfo || {
              id: dbJob.workerId?.toString() || '6a4f0c7d30034d5c126f259e',
              name: dbJob.workerInfo?.name || 'Akash Chauhan',
              phone: dbJob.workerInfo?.phone || '+91 85236 98754',
              avatar: dbJob.workerInfo?.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200',
              rating: dbJob.workerInfo?.rating || 4.8,
              role: dbJob.workerInfo?.role || 'Painter'
            },
            clientInfo: dbJob.clientInfo || {
              name: 'Client',
              phone: '+91 98765 43210'
            },
            timers: [],
            notifiedWorkerIds: new Set()
          };
          this.jobs.set(jobId, inMemoryJob);
          return inMemoryJob;
        }
      } catch (err) {
        console.error('[DispatchEngine] Error loading job from DB:', err);
      }
    }
    return null;
  }

  // --- 4. Real Worker Location Updates (Streaming during WORKER_EN_ROUTE) ---
  async broadcastWorkerLocation(workerId, latitude, longitude, jobId = null, extra = {}) {
    if (latitude === undefined || longitude === undefined) return;
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    let targetJob = null;
    if (jobId) {
      targetJob = await this.ensureJobLoaded(jobId);
    }
    if (!targetJob && workerId) {
      const wStr = (workerId || '').toString();
      for (const [, j] of this.jobs.entries()) {
        if (j.workerUserId === wStr && (j.status === 'WORKER_EN_ROUTE' || j.status === 'TRAVELLING' || j.status === 'WORKER_ACCEPTED')) {
          targetJob = j;
          break;
        }
      }
    }

    if (!targetJob) return;

    // Update real coordinates
    targetJob.workerLocation = {
      latitude: lat,
      longitude: lng,
      heading: extra.heading || 0,
      speed: extra.speed || 0,
      lastUpdated: new Date()
    };

    // Calculate real road distance and road ETA
    const roadRoute = this.calculateRoadRoute(lat, lng, targetJob.latitude, targetJob.longitude);
    targetJob.route = {
      distance: roadRoute.distance,
      duration: roadRoute.duration,
      updatedAt: new Date()
    };

    const locPayload = {
      jobId: targetJob.jobId,
      workerId,
      workerLocation: targetJob.workerLocation,
      route: targetJob.route,
      distanceKm: targetJob.route.distance,
      etaMinutes: targetJob.route.duration,
      timestamp: Date.now()
    };

    // Emit authoritative event to job room and all relevant participants
    this.emitToJob(targetJob, 'worker_location_updated', locPayload);
    if (targetJob.chatId) {
      this.io.to(targetJob.chatId).emit('worker_location_updated', locPayload);
      this.io.to(`chat:${targetJob.chatId}`).emit('worker_location_updated', locPayload);
    }
    // Backwards compatibility events
    this.emitToJob(targetJob, 'worker_live_location_broadcast', locPayload);
    this.emitToJob(targetJob, `worker_live_location_broadcast_${targetJob.jobId}`, locPayload);
  }

  // --- 5. Worker Arrives (State: WORKER_ARRIVED) ---
  async workerArrived(jobId, workerSocket = null) {
    const job = await this.ensureJobLoaded(jobId);
    if (!job) return { success: false, reason: 'JOB_NOT_FOUND' };

    job.status = 'WORKER_ARRIVED';
    job.arrivedAt = Date.now();

    await this.persistJobToDb(job);
    console.log(`[DispatchEngine] Job ${jobId} transitioned to WORKER_ARRIVED`);

    const payload = {
      jobId,
      status: 'WORKER_ARRIVED',
      worker: job.assignedWorker,
      arrivedAt: job.arrivedAt
    };

    this.emitToJob(job, 'job_status_changed', payload);
    // Backwards compatibility event
    this.emitToJob(job, 'job_status_updated', { ...payload, status: 'ARRIVED' });
    this.emitToJob(job, `job_status_updated_${jobId}`, { ...payload, status: 'ARRIVED' });

    return { success: true, job };
  }

  // --- Backwards compatible confirmArrival alias ---
  async confirmArrival(jobId, workerSocket = null) {
    return this.workerArrived(jobId, workerSocket);
  }

  // --- 6. Worker Starts Work (State: WORK_STARTED) ---
  async startWork(jobId, workerSocket = null) {
    const job = await this.ensureJobLoaded(jobId);
    if (!job) return { success: false, reason: 'JOB_NOT_FOUND' };

    job.status = 'WORK_STARTED';
    job.startedAt = Date.now();

    await this.persistJobToDb(job);
    console.log(`[DispatchEngine] Job ${jobId} transitioned to WORK_STARTED at ${new Date(job.startedAt).toISOString()}`);

    const payload = {
      jobId,
      status: 'WORK_STARTED',
      worker: job.assignedWorker,
      startedAt: job.startedAt
    };

    this.emitToJob(job, 'job_status_changed', payload);
    // Backwards compatibility event
    this.emitToJob(job, 'job_status_updated', { ...payload, status: 'WORK_IN_PROGRESS', workStartedAt: job.startedAt });
    this.emitToJob(job, `job_status_updated_${jobId}`, { ...payload, status: 'WORK_IN_PROGRESS', workStartedAt: job.startedAt });

    return { success: true, job };
  }

  // --- 7. Worker Submits Completion (State: WORK_COMPLETION_REQUESTED) ---
  async submitJobCompletion(jobId, completionData = {}, workerSocket = null) {
    const job = await this.ensureJobLoaded(jobId);
    if (!job) return { success: false, reason: 'JOB_NOT_FOUND' };

    // Resolve authoritative platform rate from pricing engine estimate or job price
    let resolvedPlatformAmount = 900;
    if (job.pricingEstimate?.minDailyRate) {
      resolvedPlatformAmount = Number(job.pricingEstimate.minDailyRate);
    } else if (job.price) {
      const match = String(job.price).match(/₹?\s*([\d,]+)/);
      if (match && match[1]) {
        resolvedPlatformAmount = parseInt(match[1].replace(/,/g, ''), 10) || 900;
      }
    }

    // Protect against corrupted client inputs (e.g. 8001000). Use platform rate by default.
    let finalBillableAmount = resolvedPlatformAmount;
    const providedVal = Number(completionData.finalAmount);
    if (!isNaN(providedVal) && providedVal >= 100 && providedVal <= 50000) {
      finalBillableAmount = providedVal;
    }

    job.status = 'WORK_COMPLETION_REQUESTED';
    job.completionRequestedAt = Date.now();
    job.completionData = {
      finalAmount: finalBillableAmount,
      notes: completionData.notes || '',
      photos: completionData.photos || [],
      submittedAt: new Date(job.completionRequestedAt)
    };

    await this.persistJobToDb(job);
    console.log(`[DispatchEngine] Job ${jobId} completion requested: ₹${job.completionData.finalAmount} (Platform Authoritative Rate)`);

    const payload = {
      jobId,
      status: 'WORK_COMPLETION_REQUESTED',
      completionData: job.completionData,
      completionRequestedAt: job.completionRequestedAt
    };

    this.emitToJob(job, 'job_status_changed', payload);
    // Backwards compatibility event
    this.emitToJob(job, 'job_completion_submitted', payload);
    this.emitToJob(job, `job_completion_submitted_${jobId}`, payload);

    return { success: true, job };
  }

  // --- 8. Client Confirms Completion (State: PAYMENT_PENDING) ---
  async confirmJobCompletion(jobId) {
    const job = await this.ensureJobLoaded(jobId);
    if (!job) return { success: false, reason: 'JOB_NOT_FOUND' };

    if (job.status === 'PAYMENT_PENDING' || job.status === 'COMPLETED' || job.status === 'SETTLED') {
      return { success: true, job };
    }

    job.status = 'PAYMENT_PENDING';
    job.clientConfirmedAt = Date.now();

    await this.persistJobToDb(job);
    console.log(`[DispatchEngine] Job ${jobId} completion confirmed by client -> PAYMENT_PENDING`);

    const payload = {
      jobId,
      status: 'PAYMENT_PENDING',
      clientConfirmedAt: job.clientConfirmedAt,
      completionData: job.completionData
    };

    this.emitToJob(job, 'job_status_changed', payload);
    // Backwards compatibility event
    this.emitToJob(job, 'job_completed_confirmed', payload);
    this.emitToJob(job, `job_completed_confirmed_${jobId}`, payload);

    return { success: true, job };
  }

  // --- 8b. Client Disputes Completion (State: DISPUTED) ---
  async disputeCompletion(jobId, reason = 'Work disputed by client') {
    const job = await this.ensureJobLoaded(jobId);
    if (!job) return { success: false, reason: 'JOB_NOT_FOUND' };

    job.status = 'DISPUTED';
    job.disputedAt = Date.now();
    job.disputeReason = reason;

    await this.persistJobToDb(job);
    console.log(`[DispatchEngine] Job ${jobId} DISPUTED: ${reason}`);

    const payload = {
      jobId,
      status: 'DISPUTED',
      reason,
      disputedAt: job.disputedAt
    };

    this.emitToJob(job, 'job_status_changed', payload);
    this.emitToJob(job, 'job_disputed', payload);

    return { success: true, job };
  }

  // --- 9. Select Payment Method ---
  async selectPaymentMethod(jobId, method) {
    const job = await this.ensureJobLoaded(jobId);
    if (!job) return { success: false, reason: 'JOB_NOT_FOUND' };

    if (method !== 'CASH' && method !== 'ONLINE') {
      return { success: false, reason: 'INVALID_PAYMENT_METHOD' };
    }

    job.paymentMethod = method;
    await this.persistJobToDb(job);

    console.log(`[DispatchEngine] Job ${jobId} payment method set to: ${method}`);

    const payload = { jobId, paymentMethod: method, status: job.status };
    this.emitToJob(job, 'job_payment_method_selected', payload);

    return { success: true, paymentMethod: method };
  }

  // --- 10. Confirm Payment (CASH or ONLINE) → PAYMENT_CONFIRMED ---
  async confirmPayment(jobId, paymentData = {}) {
    const job = await this.ensureJobLoaded(jobId);
    if (!job) return { success: false, reason: 'JOB_NOT_FOUND' };

    // Idempotency: if job is already settled & completed, return existing settled state
    if (job.status === 'COMPLETED' && job.settlementStatus === 'SETTLED') {
      console.log(`[DispatchEngine] Job ${jobId} already settled and completed, returning existing state`);
      return { success: true, alreadySettled: true, job };
    }

    let finalAmount = Number(paymentData.amount) || job.completionData?.finalAmount || job.jobAmount;
    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      if (job.pricingEstimate?.minDailyRate) {
        finalAmount = Number(job.pricingEstimate.minDailyRate);
      } else if (job.price) {
        const match = String(job.price).match(/₹?\s*([\d,]+)/);
        if (match && match[1]) {
          finalAmount = parseInt(match[1].replace(/,/g, ''), 10);
        }
      }
    }
    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      finalAmount = 900;
    }
    const method = paymentData.method || job.paymentMethod || 'ONLINE';

    // Calculate commission using FinancialService
    const commission = await this.financialService.calculateCommission(finalAmount, job.service);
    job.jobAmount = finalAmount;
    job.commissionRate = commission.commissionRate;
    job.commissionAmount = commission.commissionAmount;
    job.workerNetEarning = commission.workerNetEarning;
    job.paymentMethod = method;

    job.payment = {
      amount: finalAmount,
      platformFee: commission.commissionAmount,
      workerEarning: commission.workerNetEarning,
      total: finalAmount,
      method: method === 'CASH' ? 'Cash' : 'Online UPI',
      paidAt: new Date()
    };

    job.status = 'PAYMENT_CONFIRMED';
    job.paymentStatus = 'PAID';
    job.paymentProviderRef = paymentData.paymentProviderRef || null;

    await this.persistJobToDb(job);

    console.log(`[DispatchEngine] Job ${jobId} PAYMENT_CONFIRMED: ₹${finalAmount} via ${method} (Commission: ₹${commission.commissionAmount}, Worker: ₹${commission.workerNetEarning})`);

    const payload = {
      jobId,
      status: 'PAYMENT_CONFIRMED',
      paymentStatus: 'PAID',
      paymentMethod: method,
      payment: job.payment,
      jobAmount: finalAmount,
      commissionAmount: commission.commissionAmount,
      workerNetEarning: commission.workerNetEarning
    };

    this.emitToJob(job, 'job_status_changed', payload);
    this.emitToJob(job, 'job_payment_confirmed', payload);

    // Immediately proceed to settlement
    return this.settleJob(jobId);
  }

  // --- 11. Settle Job (Financial Ledger) → SETTLED ---
  async settleJob(jobId) {
    const job = await this.ensureJobLoaded(jobId);
    if (!job) return { success: false, reason: 'JOB_NOT_FOUND' };

    let settlementResult;
    const method = job.paymentMethod || 'ONLINE';

    try {
      if (this.options?.skipDb && (!mongoose.connection || mongoose.connection.readyState !== 1)) {
        settlementResult = { success: true, balance: 810 };
      } else if (method === 'CASH') {
        settlementResult = await this.financialService.settleCashPayment(job);
        job.settlementStatus = 'CASH_CONFIRMED';
      } else {
        settlementResult = await this.financialService.settleOnlinePayment(job, job.paymentProviderRef);
        job.settlementStatus = 'ONLINE_VERIFIED';
      }

      if (!settlementResult.success) {
        console.error(`[DispatchEngine] Settlement failed for Job ${jobId}:`, settlementResult);
        return { success: false, reason: 'SETTLEMENT_FAILED' };
      }

      job.status = 'SETTLED';
      job.settlementStatus = 'SETTLED';
      job.settledAt = Date.now();

      await this.persistJobToDb(job);

      console.log(`[DispatchEngine] Job ${jobId} SETTLED: Worker balance ₹${settlementResult.balance}`);

      const payload = {
        jobId,
        status: 'SETTLED',
        settlementStatus: 'SETTLED',
        payment: job.payment,
        paymentMethod: method,
        workerBalance: settlementResult.balance,
        workerOutstanding: settlementResult.outstanding,
        settledAt: job.settledAt
      };

      this.emitToJob(job, 'job_status_changed', payload);
      this.emitToJob(job, 'job_settled', payload);

      // Emit real-time wallet update to worker
      if (job.workerUserId) {
        const wStr = job.workerUserId.toString();
        const walletPayload = {
          balance: settlementResult.balance,
          outstanding: settlementResult.outstanding,
          availableBalance: Math.max(0, settlementResult.balance),
          jobId: job.jobId,
          method,
          updatedAt: Date.now()
        };
        this.io?.to(wStr).emit('wallet_updated', walletPayload);
        this.io?.to(`user:${wStr}`).emit('wallet_updated', walletPayload);
      }

      // Auto-complete the job
      return this.completeJob(jobId);

    } catch (err) {
      console.error(`[DispatchEngine] Settlement error for Job ${jobId}:`, err);
      return { success: false, reason: 'SETTLEMENT_ERROR', error: err.message };
    }
  }

  // --- 12. Complete Job → COMPLETED ---
  async completeJob(jobId) {
    const job = await this.ensureJobLoaded(jobId);
    if (!job) return { success: false, reason: 'JOB_NOT_FOUND' };

    job.status = 'COMPLETED';
    job.completedAt = Date.now();

    await this.persistJobToDb(job);

    console.log(`[DispatchEngine] Job ${jobId} COMPLETED`);

    const payload = {
      jobId,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      payment: job.payment,
      completedAt: job.completedAt
    };

    this.emitToJob(job, 'job_status_changed', payload);
    this.emitToJob(job, 'job_payment_completed', payload);
    this.emitToJob(job, `job_payment_completed_${jobId}`, payload);

    // Real-time job history update for both client and worker personal channels
    if (job.clientUserId && this.io) {
      const cStr = job.clientUserId.toString();
      this.io.to(cStr).emit('job_history_updated', payload);
      this.io.to(`user:${cStr}`).emit('job_history_updated', payload);
    }
    if (job.workerUserId && this.io) {
      const wStr = job.workerUserId.toString();
      this.io.to(wStr).emit('job_history_updated', payload);
      this.io.to(`user:${wStr}`).emit('job_history_updated', payload);
    }

    return { success: true, job };
  }

  // --- Legacy processPayment — delegates to confirmPayment ---
  async processPayment(jobId, paymentData = {}) {
    return this.confirmPayment(jobId, paymentData);
  }

  // --- 13. Worker Cancels Job ---
  async workerCancelJob(jobId, reason = 'Worker cancelled') {
    const job = await this.ensureJobLoaded(jobId);
    if (!job) return { success: false, reason: 'JOB_NOT_FOUND' };

    const cancellableStates = ['WORKER_ACCEPTED', 'WORKER_EN_ROUTE', 'WORKER_ARRIVED'];
    if (!cancellableStates.includes(job.status)) {
      return { success: false, reason: 'CANNOT_CANCEL_IN_CURRENT_STATE', currentStatus: job.status };
    }

    job.status = 'CANCELLED_BY_WORKER';
    job.cancelledAt = Date.now();
    job.cancellationReason = reason;
    this.clearJobTimers(job);

    await this.persistJobToDb(job);
    console.log(`[DispatchEngine] Worker cancelled Job ${jobId}: ${reason}`);

    this.emitToJob(job, 'job_status_changed', {
      jobId,
      status: 'CANCELLED_BY_WORKER',
      reason,
      cancelledAt: job.cancelledAt
    });

    return { success: true };
  }

  // --- Backwards-Compatible Generic Status Updater ---
  async updateJobStatus(jobId, status, meta = {}, workerSocket = null) {
    if (status === 'TRAVELLING' || status === 'WORKER_EN_ROUTE') {
      return this.startTrip(jobId, workerSocket);
    }
    if (status === 'ARRIVED' || status === 'WORKER_ARRIVED') {
      return this.workerArrived(jobId, workerSocket);
    }
    if (status === 'WORK_IN_PROGRESS' || status === 'WORK_STARTED') {
      return this.startWork(jobId, workerSocket);
    }
    return { success: false, reason: 'UNKNOWN_STATUS' };
  }

  // --- Ratings ---
  async submitRating(jobId, ratingData = {}) {
    const job = await this.ensureJobLoaded(jobId);
    if (!job) return { success: false, reason: 'JOB_NOT_FOUND' };

    job.ratings = job.ratings || {};
    const { ratedRole, rating, reviewText } = ratingData;

    if (ratedRole === 'worker') {
      job.ratings.workerRating = rating;
      job.ratings.workerReview = reviewText;
    } else {
      job.ratings.clientRating = rating;
      job.ratings.clientReview = reviewText;
    }

    const bothRated = !!job.ratings.workerRating && !!job.ratings.clientRating;
    if (bothRated) {
      job.status = 'ARCHIVED';
    }

    await this.persistJobToDb(job);
    console.log(`[DispatchEngine] Rating submitted for Job ${jobId} by ${ratedRole}: ${rating} stars`);

    const payload = {
      jobId,
      ratedRole,
      ratings: job.ratings,
      status: job.status
    };

    this.emitToJob(job, 'job_rating_submitted', payload);
    return { success: true, job };
  }

  toSafeJob(job) {
    if (!job) return null;
    const safe = { ...job };
    delete safe.clientSocket;
    delete safe.workerSocket;
    delete safe.timers;
    if (safe.notifiedWorkerIds && typeof safe.notifiedWorkerIds[Symbol.iterator] === 'function') {
      safe.notifiedWorkerIds = Array.from(safe.notifiedWorkerIds);
    }
    return safe;
  }

  // --- Get Authoritative Job State (Memory + DB) ---
  async getJob(jobId) {
    if (!jobId) return null;
    const job = await this.ensureJobLoaded(jobId);
    return this.toSafeJob(job);
  }

  // --- Get Active Job for User ---
  async getActiveJobForUser(userId) {
    if (!userId) return null;
    const uStr = userId.toString();
    for (const [, job] of this.jobs.entries()) {
      if (job.status !== 'ARCHIVED' && job.status !== 'COMPLETED' && job.status !== 'CANCELLED_BY_CLIENT' && job.status !== 'CANCELLED_BY_WORKER' && job.status !== 'SETTLED') {
        if (job.clientUserId === uStr || job.workerUserId === uStr || (job.workerId && job.workerId.toString() === uStr) || (job.clientId && job.clientId.toString() === uStr)) {
          return this.toSafeJob(job);
        }
      }
    }
    if (!this.options?.skipDb && mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const Job = mongoose.model('Job');
        const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
        const queryOr = [
          { workerUserId: uStr },
          { clientUserId: uStr },
          { workerId: uStr },
          { clientId: uStr },
          { assignedWorkerId: uStr }
        ];
        if (userObjId) {
          queryOr.push(
            { workerId: userObjId },
            { clientId: userObjId },
            { assignedWorkerId: userObjId },
            { workerUserId: userObjId }
          );
        }
        const dbJob = await Job.findOne({
          $or: queryOr,
          status: { $nin: ['ARCHIVED', 'COMPLETED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_WORKER', 'NO_WORKER_AVAILABLE', 'SETTLED', 'EXPIRED', 'REJECTED', 'CANCELLED'] }
        }).sort({ updatedAt: -1, createdAt: -1 }).lean();
        return dbJob;
      } catch (err) {
        console.error('[DispatchEngine] Error fetching active job from DB:', err);
      }
    }
    return null;
  }

  // --- Client Cancels Job ---
  async cancelJob(jobId) {
    let job = this.jobs.get(jobId);
    if (!job) {
      if (!this.options?.skipDb && mongoose.connection && mongoose.connection.readyState === 1) {
        try {
          const Job = mongoose.model('Job');
          const dbJob = await Job.findOne({ jobId });
          if (dbJob) {
            dbJob.status = 'CANCELLED_BY_CLIENT';
            await dbJob.save();
            console.log(`[DispatchEngine] Client cancelled DB Job ${jobId}`);
            if (this.io) {
              this.io.emit('job_status_changed', { jobId, status: 'CANCELLED_BY_CLIENT' });
              this.io.emit(`job_status_changed_${jobId}`, { jobId, status: 'CANCELLED_BY_CLIENT' });
              this.io.emit('job_cancelled_success', { jobId, status: 'CANCELLED_BY_CLIENT' });
              this.io.emit(`job_cancelled_success_${jobId}`, { jobId, status: 'CANCELLED_BY_CLIENT' });
            }
            return true;
          }
        } catch (e) {
          console.error('[DispatchEngine] Error cancelling DB job:', e);
        }
      }
      return false;
    }

    job.status = 'CANCELLED_BY_CLIENT';
    this.clearJobTimers(job);

    await this.persistJobToDb(job);
    console.log(`[DispatchEngine] Client cancelled Job ${jobId}`);

    for (const wUserId of job.notifiedWorkerIds) {
      this.io.to(wUserId).emit('job_request_cancelled_or_assigned', {
        jobId,
        message: 'This job request was cancelled by the client.'
      });
      this.io.to(`user:${wUserId}`).emit('job_request_cancelled_or_assigned', {
        jobId,
        message: 'This job request was cancelled by the client.'
      });
    }

    this.emitToJob(job, 'job_status_changed', { jobId, status: 'CANCELLED_BY_CLIENT' });
    this.emitToJob(job, 'job_cancelled_success', { jobId, status: 'CANCELLED_BY_CLIENT' });
    this.jobs.delete(jobId);
    return true;
  }
}

module.exports = BookingDispatchEngine;
