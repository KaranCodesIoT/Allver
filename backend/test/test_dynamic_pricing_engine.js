// backend/test/test_dynamic_pricing_engine.js
// Comprehensive verification test suite for Allver Dynamic Pricing Engine
// Tests location zone resolution, supply/demand scaling, guardrails, and authoritative dispatch

const assert = require('assert');
const mongoose = require('mongoose');
const http = require('http');
require('dotenv').config();

const MarketRate = require('../models/MarketRate');
const Job = require('../models/Job');
const PricingEngine = require('../services/PricingEngine');
const BookingDispatchEngine = require('../services/BookingDispatchEngine');

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING PRODUCTION DYNAMIC PRICING ENGINE VERIFICATION SUITE');
  console.log('================================================================\n');

  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas\n');
  }

  // Seed default market rate benchmarks
  await MarketRate.seedDefaultRates();
  console.log('✅ Seeded default MarketRate benchmarks in MongoDB\n');

  let passed = 0;
  let total = 8;
  const engine = new PricingEngine();

  try {
    // -------------------------------------------------------------
    // Test 1: Location Zone Resolution across 3 Mumbai/Thane Locations
    // -------------------------------------------------------------
    console.log('Test 1: Location Zone Resolution across Mumbai / Thane');

    // 1. Thane
    const resThane = engine.resolveZone({
      latitude: 19.2183,
      longitude: 72.9781,
      location: 'Thane, Thane, Maharashtra',
    });
    console.log(`  Thane Coords (19.2183, 72.9781) -> Zone: ${resThane.zone} (${resThane.zoneName})`);
    assert.strictEqual(resThane.zone, 'THANE_NAVI_MUMBAI');

    // 2. Andheri West
    const resAndheri = engine.resolveZone({
      latitude: 19.1363,
      longitude: 72.8277,
      location: 'Andheri West, Mumbai',
    });
    console.log(`  Andheri Coords (19.1363, 72.8277) -> Zone: ${resAndheri.zone} (${resAndheri.zoneName})`);
    assert.strictEqual(resAndheri.zone, 'MUMBAI_SUBURBS');

    // 3. BKC / South Mumbai
    const resBKC = engine.resolveZone({
      latitude: 19.0657,
      longitude: 72.8683,
      location: 'Bandra Kurla Complex, Mumbai',
    });
    console.log(`  BKC Coords (19.0657, 72.8683) -> Zone: ${resBKC.zone} (${resBKC.zoneName})`);
    assert.strictEqual(resBKC.zone, 'MUMBAI_METRO');

    console.log('✅ Test 1 PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test 2: Distinct Authoritative Price Estimates per Zone
    // -------------------------------------------------------------
    console.log('Test 2: Distinct Authoritative Price Estimates per Zone');

    const estThane = await engine.calculateEstimate({
      service: 'Painting',
      latitude: 19.2183,
      longitude: 72.9781,
      location: 'Thane West, Maharashtra',
    });
    console.log(`  Thane Painting Estimate: ${estThane.formattedPriceRange} (${estThane.locationNote})`);
    assert.strictEqual(estThane.zone, 'THANE_NAVI_MUMBAI');
    assert.strictEqual(estThane.minDailyRate, 800);
    assert.strictEqual(estThane.maxDailyRate, 1000);
    assert(estThane.locationNote.includes('Thane'));

    const estAndheri = await engine.calculateEstimate({
      service: 'Painting',
      latitude: 19.1363,
      longitude: 72.8277,
      location: 'Andheri West, Mumbai',
    });
    console.log(`  Andheri Painting Estimate: ${estAndheri.formattedPriceRange} (${estAndheri.locationNote})`);
    assert.strictEqual(estAndheri.zone, 'MUMBAI_SUBURBS');
    assert.strictEqual(estAndheri.minDailyRate, 900);
    assert.strictEqual(estAndheri.maxDailyRate, 1150);
    assert(estAndheri.locationNote.includes('Andheri'));

    const estBKC = await engine.calculateEstimate({
      service: 'Painting',
      latitude: 19.0657,
      longitude: 72.8683,
      location: 'Bandra Kurla Complex, Mumbai',
    });
    console.log(`  BKC Painting Estimate: ${estBKC.formattedPriceRange} (${estBKC.locationNote})`);
    assert.strictEqual(estBKC.zone, 'MUMBAI_METRO');
    assert.strictEqual(estBKC.minDailyRate, 1000);
    assert.strictEqual(estBKC.maxDailyRate, 1300);
    assert(estBKC.locationNote.includes('BKC'));

    // Verify estimates are truly distinct and location-dependent
    assert(estBKC.minDailyRate > estAndheri.minDailyRate);
    assert(estAndheri.minDailyRate > estThane.minDailyRate);

    console.log('✅ Test 2 PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test 3: Address / Keyword Fallback Resolution
    // -------------------------------------------------------------
    console.log('Test 3: Address / Keyword Fallback Resolution without Coords');

    const kwBKC = engine.resolveZone({ location: 'Near Diamond Bourse, BKC, Mumbai' });
    assert.strictEqual(kwBKC.zone, 'MUMBAI_METRO');

    const kwAndheri = engine.resolveZone({ location: 'Lokhandwala Complex, Andheri West' });
    assert.strictEqual(kwAndheri.zone, 'MUMBAI_SUBURBS');

    const kwThane = engine.resolveZone({ location: 'Gokhale Road, Naupada, Thane' });
    assert.strictEqual(kwThane.zone, 'THANE_NAVI_MUMBAI');

    const kwNoida = engine.resolveZone({ location: 'Sector 62, Noida, Uttar Pradesh' });
    assert.strictEqual(kwNoida.zone, 'DELHI_NCR');

    const kwUnknown = engine.resolveZone({ location: 'Random Village, Unknown District' });
    assert.strictEqual(kwUnknown.zone, 'DEFAULT');

    console.log('✅ Test 3 PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test 4: Controlled Supply/Demand Multiplier & Strict Clamping
    // -------------------------------------------------------------
    console.log('Test 4: Controlled Supply/Demand Multiplier & Strict Clamping');

    // Case 4A: High demand surge clamp (10 requests, 1 worker) -> clamped at 1.25x max
    const simulatedWorkersHighDemand = new Map([
      ['w1', { userId: 'w1', availability: 'Available', workCategory: ['Painting'], latitude: 19.065, longitude: 72.868 }],
    ]);
    const mockJobsHighDemand = new Map(
      Array.from({ length: 10 }, (_, i) => [`j${i}`, { status: 'SEARCHING', service: 'Painting' }])
    );

    const surgeEngine = new PricingEngine({
      activeWorkerLocations: simulatedWorkersHighDemand,
      dispatchEngine: { jobs: mockJobsHighDemand },
    });

    const surgeAdj = surgeEngine.calculateDemandMultiplier({
      service: 'Painting',
      zone: 'MUMBAI_METRO',
      latitude: 19.0657,
      longitude: 72.8683,
      rateConfig: { demandMultiplierMin: 0.90, demandMultiplierMax: 1.25 },
    });

    console.log(`  Extreme Demand Simulation -> Multiplier: ${surgeAdj.multiplier}x (Max Limit: 1.25x)`);
    assert.strictEqual(surgeAdj.multiplier, 1.25, 'Multiplier must clamp strictly at maximum limit of 1.25');
    assert.strictEqual(surgeAdj.isSurgeActive, true);

    // Case 4B: Abundant supply clamp (20 workers, 0 requests) -> floor clamp at 0.95x
    const simulatedWorkersAbundant = new Map(
      Array.from({ length: 20 }, (_, i) => [
        `w${i}`,
        { userId: `w${i}`, availability: 'Available', workCategory: ['Painting'], latitude: 19.065, longitude: 72.868 },
      ])
    );
    const abundantEngine = new PricingEngine({
      activeWorkerLocations: simulatedWorkersAbundant,
      dispatchEngine: { jobs: new Map() },
    });

    const abundantAdj = abundantEngine.calculateDemandMultiplier({
      service: 'Painting',
      zone: 'MUMBAI_METRO',
      latitude: 19.0657,
      longitude: 72.8683,
      rateConfig: { demandMultiplierMin: 0.90, demandMultiplierMax: 1.25 },
    });

    console.log(`  Abundant Supply Simulation -> Multiplier: ${abundantAdj.multiplier}x (Floor: 0.90x)`);
    assert(abundantAdj.multiplier <= 1.0, 'Multiplier must not increase under abundant supply');
    assert(abundantAdj.multiplier >= 0.90, 'Multiplier must respect configured floor limit');

    console.log('✅ Test 4 PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test 5: Job Factors (Job Size & Urgency) Multipliers
    // -------------------------------------------------------------
    console.log('Test 5: Job Factors (Job Size & Urgency) Multipliers');

    const estStandard = await engine.calculateEstimate({
      service: 'Electrical',
      latitude: 19.0657,
      longitude: 72.8683,
      jobSize: 'standard',
      urgency: 'standard',
    });

    const estLargeUrgent = await engine.calculateEstimate({
      service: 'Electrical',
      latitude: 19.0657,
      longitude: 72.8683,
      jobSize: 'large',   // 1.25x
      urgency: 'urgent',  // 1.10x -> combined 1.375x
    });

    console.log(`  Standard Electrical: ₹${estStandard.minDailyRate} – ₹${estStandard.maxDailyRate}`);
    console.log(`  Large Urgent Electrical: ₹${estLargeUrgent.minDailyRate} – ₹${estLargeUrgent.maxDailyRate}`);
    assert(estLargeUrgent.minDailyRate > estStandard.minDailyRate);
    assert.strictEqual(estLargeUrgent.multipliers.jobFactor, 1.375);

    console.log('✅ Test 5 PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test 6: Backend Authoritative Override (Never Trust Client Price)
    // -------------------------------------------------------------
    console.log('Test 6: Backend Authoritative Override in BookingDispatchEngine');

    class MockSocket {
      constructor(id, userId) {
        this.id = id;
        this.userId = userId;
        this.rooms = new Set();
      }
      join(room) { this.rooms.add(room); }
      emit() {}
    }

    const mockIo = { to: () => ({ emit: () => {} }) };
    const dispatchEngine = new BookingDispatchEngine(mockIo, new Map(), { skipDb: false });

    const clientSocket = new MockSocket('sock_test_client', '6a4ed79a6d874a11031e34da');
    const testJobId = `job_test_auth_price_${Date.now()}`;

    // Client maliciously sends fake price "₹100 / day"
    await dispatchEngine.createAndStartJobRequest(clientSocket, {
      jobId: testJobId,
      service: 'Painting',
      latitude: 19.0657, // BKC
      longitude: 72.8683,
      location: 'BKC, Mumbai',
      price: '₹100 / day', // FORGED CLIENT PRICE
    });

    const createdJob = dispatchEngine.jobs.get(testJobId);
    console.log(`  Client requested: "₹100 / day" -> Server authoritatively set: "${createdJob.price}"`);
    assert.notStrictEqual(createdJob.price, '₹100 / day', 'Backend must NOT accept client forged price');
    assert(createdJob.price.includes('₹1,000') || createdJob.price.includes('1000'), 'Backend must set authoritative BKC rate');
    assert.strictEqual(createdJob.pricingEstimate.zone, 'MUMBAI_METRO');

    // Clean up created job from DB
    await Job.deleteOne({ jobId: testJobId });

    console.log('✅ Test 6 PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test 7: HTTP API Endpoint GET /api/pricing/estimate
    // -------------------------------------------------------------
    console.log('Test 7: HTTP API Endpoint GET /api/pricing/estimate');

    const testHttpPromise = (path) => {
      return new Promise((resolve, reject) => {
        http.get(`http://localhost:5000${path}`, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', reject);
      });
    };

    const apiThane = await testHttpPromise('/api/pricing/estimate?service=Painting&latitude=19.2183&longitude=72.9781&location=Thane');
    assert.strictEqual(apiThane.success, true);
    assert.strictEqual(apiThane.estimate.zone, 'THANE_NAVI_MUMBAI');
    assert.strictEqual(apiThane.estimate.minDailyRate, 800);
    assert.strictEqual(apiThane.estimate.maxDailyRate, 1000);
    console.log(`  API Response Thane: ${apiThane.estimate.formattedPriceRange} [${apiThane.estimate.zone}]`);

    const apiBKC = await testHttpPromise('/api/pricing/estimate?service=Painting&latitude=19.0657&longitude=72.8683&location=BKC');
    assert.strictEqual(apiBKC.success, true);
    assert.strictEqual(apiBKC.estimate.zone, 'MUMBAI_METRO');
    assert.strictEqual(apiBKC.estimate.minDailyRate, 1000);
    assert.strictEqual(apiBKC.estimate.maxDailyRate, 1300);
    console.log(`  API Response BKC: ${apiBKC.estimate.formattedPriceRange} [${apiBKC.estimate.zone}]`);

    console.log('✅ Test 7 PASSED\n');
    passed++;

    // -------------------------------------------------------------
    // Test 8: Financial Separation Confirmation
    // -------------------------------------------------------------
    console.log('Test 8: Financial Separation Confirmation');
    const FinancialService = require('../services/FinancialService');
    const fs = new FinancialService();

    // Confirm that commission calculation continues to strictly apply 10% Allver fee on final amount
    const comm1 = await fs.calculateCommission(1000, 'Painting');
    assert.strictEqual(comm1.commissionRate, 0.10);
    assert.strictEqual(comm1.commissionAmount, 100);
    assert.strictEqual(comm1.workerNetEarning, 900);

    const comm2 = await fs.calculateCommission(1300, 'Painting');
    assert.strictEqual(comm2.commissionRate, 0.10);
    assert.strictEqual(comm2.commissionAmount, 130);
    assert.strictEqual(comm2.workerNetEarning, 1170);

    console.log('  Financial ledger commission verified: 10% Allver fee intact across pricing variations');
    console.log('✅ Test 8 PASSED\n');
    passed++;

  } finally {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }

  console.log('================================================================');
  console.log(`📊 DYNAMIC PRICING ENGINE RESULTS: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error in pricing engine test suite:', err);
  process.exit(1);
});
