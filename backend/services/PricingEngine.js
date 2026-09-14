// backend/services/PricingEngine.js
// Authoritative Location-Aware Dynamic Pricing Engine for Allver
// Resolves geographic zones, applies controlled supply/demand adjustments,
// and produces authoritative price estimates in integer paise.

const mongoose = require('mongoose');
const MarketRate = require('../models/MarketRate');

class PricingEngine {
  constructor(options = {}) {
    this.dispatchEngine = options.dispatchEngine || null;
    this.activeWorkerLocations = options.activeWorkerLocations || null;

    // Geographic Zone Definitions with Centroids and Approximate Radii (km)
    this.ZONE_CENTROIDS = {
      MUMBAI_METRO: {
        zone: 'MUMBAI_METRO',
        zoneName: 'BKC & South Mumbai',
        lat: 19.0657,
        lng: 72.8683,
        radiusKm: 8.5,
        keywords: ['bkc', 'bandra', 'dadar', 'worli', 'colaba', 'lower parel', 'fort', 'marine lines', 'south mumbai', 'mahim', 'prabhadevi', 'matunga', 'sion'],
      },
      MUMBAI_SUBURBS: {
        zone: 'MUMBAI_SUBURBS',
        zoneName: 'Andheri & Suburbs',
        lat: 19.1363,
        lng: 72.8277,
        radiusKm: 14.0,
        keywords: ['andheri', 'juhu', 'goregaon', 'malad', 'kandivali', 'borivali', 'powai', 'santacruz', 'vile parle', 'jogeshwari', 'dahisar', 'mumbai suburbs'],
      },
      THANE_NAVI_MUMBAI: {
        zone: 'THANE_NAVI_MUMBAI',
        zoneName: 'Thane & Navi Mumbai',
        lat: 19.2183,
        lng: 72.9781,
        radiusKm: 16.0,
        keywords: ['thane', 'kalwa', 'mumbra', 'airoli', 'vashi', 'nerul', 'belapur', 'kharghar', 'panvel', 'ghansoli', 'kopar khairane', 'sanpada', 'ulwe', 'navi mumbai'],
      },
      DELHI_NCR: {
        zone: 'DELHI_NCR',
        zoneName: 'Delhi / NCR',
        lat: 28.6273,
        lng: 77.3725,
        radiusKm: 35.0,
        keywords: ['noida', 'delhi', 'ghaziabad', 'gurugram', 'gurgaon', 'faridabad', 'indirapuram', 'connaught place', 'sector 62', 'sector 18'],
      },
    };

    // In-memory fallback matrix if MongoDB is not connected
    this.FALLBACK_RATES = {
      MUMBAI_METRO: {
        zoneName: 'BKC & South Mumbai',
        Painting: [1000, 1300],
        Masonry: [1100, 1500],
        Electrical: [950, 1250],
        Plumbing: [900, 1200],
        Carpentry: [1050, 1400],
        Tiling: [1000, 1350],
        Cleaning: [750, 1000],
        'General Work': [650, 900],
      },
      MUMBAI_SUBURBS: {
        zoneName: 'Andheri & Suburbs',
        Painting: [900, 1150],
        Masonry: [1000, 1300],
        Electrical: [850, 1100],
        Plumbing: [800, 1050],
        Carpentry: [950, 1200],
        Tiling: [900, 1150],
        Cleaning: [700, 900],
        'General Work': [600, 800],
      },
      THANE_NAVI_MUMBAI: {
        zoneName: 'Thane & Navi Mumbai',
        Painting: [800, 1000],
        Masonry: [900, 1200],
        Electrical: [750, 1000],
        Plumbing: [700, 950],
        Carpentry: [850, 1100],
        Tiling: [800, 1050],
        Cleaning: [600, 850],
        'General Work': [500, 750],
      },
      DELHI_NCR: {
        zoneName: 'Delhi / NCR',
        Painting: [850, 1100],
        Masonry: [950, 1250],
        Electrical: [800, 1050],
        Plumbing: [750, 1000],
        Carpentry: [900, 1150],
        Tiling: [850, 1100],
        Cleaning: [650, 900],
        'General Work': [550, 800],
      },
      DEFAULT: {
        zoneName: 'Standard Market Area',
        Painting: [800, 1000],
        Masonry: [900, 1200],
        Electrical: [750, 1000],
        Plumbing: [700, 950],
        Carpentry: [850, 1100],
        Tiling: [800, 1050],
        Cleaning: [600, 850],
        'General Work': [500, 750],
      },
    };
  }

  // Calculate distance in km using Haversine formula
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

  /**
   * 1. Authoritative Geographic Zone Resolution
   * Resolves coordinates or location address to one of:
   * 'MUMBAI_METRO' | 'MUMBAI_SUBURBS' | 'THANE_NAVI_MUMBAI' | 'DELHI_NCR' | 'DEFAULT'
   */
  resolveZone({ latitude, longitude, location, formattedAddress }) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    const hasValidCoords = !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);

    const fullText = `${location || ''} ${formattedAddress || ''}`.toLowerCase().trim();

    // 1. Precise Coordinate Proximity Check (Highest Accuracy)
    if (hasValidCoords) {
      let closestZone = null;
      let minDistance = Infinity;

      for (const [zoneKey, zoneDef] of Object.entries(this.ZONE_CENTROIDS)) {
        const d = this.calculateDistanceKm(lat, lng, zoneDef.lat, zoneDef.lng);
        if (d <= zoneDef.radiusKm && d < minDistance) {
          minDistance = d;
          closestZone = {
            zone: zoneKey,
            zoneName: zoneDef.zoneName,
            matchedBy: 'COORDINATES_PROXIMITY',
            distanceKm: d,
          };
        }
      }

      if (closestZone) {
        return closestZone;
      }
    }

    // 2. Keyword-based Address Match (Secondary Path)
    if (fullText) {
      for (const [zoneKey, zoneDef] of Object.entries(this.ZONE_CENTROIDS)) {
        for (const kw of zoneDef.keywords) {
          if (fullText.includes(kw)) {
            return {
              zone: zoneKey,
              zoneName: zoneDef.zoneName,
              matchedBy: 'KEYWORD_MATCH',
              matchedKeyword: kw,
            };
          }
        }
      }
    }

    // 3. Fallback to Default Zone
    return {
      zone: 'DEFAULT',
      zoneName: 'Standard Market Area',
      matchedBy: 'FALLBACK_DEFAULT',
    };
  }

  /**
   * 2. Controlled Supply / Demand Adjustment
   * Evaluates local real-time worker supply vs. active job requests.
   * Strictly clamped between demandMultiplierMin (0.90) and demandMultiplierMax (1.25).
   */
  calculateDemandMultiplier({ service, zone, latitude, longitude, rateConfig }) {
    const minMultiplier = rateConfig?.demandMultiplierMin !== undefined ? rateConfig.demandMultiplierMin : 0.90;
    const maxMultiplier = rateConfig?.demandMultiplierMax !== undefined ? rateConfig.demandMultiplierMax : 1.25;

    const engine = this.dispatchEngine || global.bookingDispatchEngine;
    const workerMap = this.activeWorkerLocations || global.activeWorkerLocations || engine?.activeWorkerLocations;

    let availableWorkers = 0;
    let activeJobRequests = 0;

    const lat = Number(latitude);
    const lng = Number(longitude);
    const hasCoords = !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);

    // Count available workers matching service trade within 20km
    if (workerMap && typeof workerMap.values === 'function') {
      const sLower = (service || '').toLowerCase();
      for (const w of workerMap.values()) {
        const isAvailable = w.availability === 'Available' && w.isAvailableForBooking !== false;
        let serviceMatch = true;
        if (w.workCategory && Array.isArray(w.workCategory)) {
          serviceMatch = w.workCategory.some((cat) => cat.toLowerCase().includes(sLower) || sLower.includes(cat.toLowerCase()));
        }

        if (isAvailable && serviceMatch) {
          if (hasCoords && w.latitude && w.longitude) {
            const dist = this.calculateDistanceKm(lat, lng, w.latitude, w.longitude);
            if (dist <= 20) {
              availableWorkers++;
            }
          } else {
            availableWorkers++;
          }
        }
      }
    }

    // Count active jobs in searching/matching state for this service
    if (engine && engine.jobs && typeof engine.jobs.values === 'function') {
      const sLower = (service || '').toLowerCase();
      for (const j of engine.jobs.values()) {
        const isSearching = j.status === 'SEARCHING';
        const serviceMatch = (j.service || '').toLowerCase().includes(sLower);
        if (isSearching && serviceMatch) {
          activeJobRequests++;
        }
      }
    }

    // Normal balanced supply -> 1.00x
    let multiplier = 1.00;

    // High demand relative to supply: ratio > 1
    const effectiveSupply = Math.max(availableWorkers, 1);
    const demandRatio = activeJobRequests / effectiveSupply;

    if (demandRatio > 1.0) {
      // Controlled moderate increase: +5% per excess ratio point
      const bump = (demandRatio - 1.0) * 0.05;
      multiplier = 1.00 + bump;
    } else if (availableWorkers >= 4 && activeJobRequests === 0) {
      // Abundant supply with zero queue: gentle 5% discount
      multiplier = 0.95;
    }

    // Strict clamping within guardrails
    multiplier = Math.max(minMultiplier, Math.min(maxMultiplier, Math.round(multiplier * 100) / 100));

    return {
      multiplier,
      availableWorkers,
      activeJobRequests,
      isSurgeActive: multiplier > 1.0,
    };
  }

  /**
   * 3. Authoritative Price Estimate Generation
   */
  async calculateEstimate(params = {}) {
    const {
      service = 'Painting',
      latitude,
      longitude,
      location,
      formattedAddress,
      jobSize = 'standard',
      urgency = 'standard',
      estimatedDuration = 1,
      unit = 'day',
    } = params;

    // 1. Resolve Geographic Zone
    const resolvedZone = this.resolveZone({ latitude, longitude, location, formattedAddress });
    const zoneKey = resolvedZone.zone;

    // 2. Fetch Rate Configuration from MongoDB
    let rateConfig = null;
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        rateConfig = await MarketRate.findOne({ service, zone: zoneKey, isActive: true }).lean();
        if (!rateConfig && zoneKey !== 'DEFAULT') {
          // Fallback to DEFAULT zone in DB
          rateConfig = await MarketRate.findOne({ service, zone: 'DEFAULT', isActive: true }).lean();
        }
      }
    } catch (err) {
      console.warn('[PricingEngine] Error reading MarketRate from DB, using in-memory baseline:', err.message);
    }

    // 3. Fallback matrix if DB rate is missing
    let minDailyPaise = 80000;
    let maxDailyPaise = 100000;
    let standardHours = 8;
    let pricingVersion = 'v1.0';
    let demandMultiplierMin = 0.90;
    let demandMultiplierMax = 1.25;
    let zoneDisplayName = resolvedZone.zoneName;

    if (rateConfig) {
      minDailyPaise = rateConfig.minDailyRateInPaise;
      maxDailyPaise = rateConfig.maxDailyRateInPaise;
      standardHours = rateConfig.standardDailyHours || 8;
      pricingVersion = rateConfig.pricingVersion || 'v1.0';
      demandMultiplierMin = rateConfig.demandMultiplierMin || 0.90;
      demandMultiplierMax = rateConfig.demandMultiplierMax || 1.25;
      zoneDisplayName = rateConfig.zoneName || zoneDisplayName;
    } else {
      const zoneRates = this.FALLBACK_RATES[zoneKey] || this.FALLBACK_RATES.DEFAULT;
      const sRates = zoneRates[service] || zoneRates.Painting || [800, 1000];
      minDailyPaise = sRates[0] * 100;
      maxDailyPaise = sRates[1] * 100;
      zoneDisplayName = zoneRates.zoneName || zoneDisplayName;
    }

    // 4. Job Factors Multiplier
    let jobFactorMultiplier = 1.0;
    const sizeLower = String(jobSize).toLowerCase();
    if (sizeLower === 'medium') {
      jobFactorMultiplier *= 1.10;
    } else if (sizeLower === 'large' || sizeLower === 'heavy') {
      jobFactorMultiplier *= 1.25;
    }

    const urgencyLower = String(urgency).toLowerCase();
    if (urgencyLower === 'urgent' || urgencyLower === 'emergency' || urgencyLower === 'immediate') {
      jobFactorMultiplier *= 1.10;
    }

    // 5. Controlled Supply/Demand Multiplier
    const demandAdjustment = this.calculateDemandMultiplier({
      service,
      zone: zoneKey,
      latitude,
      longitude,
      rateConfig: { demandMultiplierMin, demandMultiplierMax },
    });

    const totalMultiplier = Math.round(jobFactorMultiplier * demandAdjustment.multiplier * 1000) / 1000;

    // 6. Calculate Final Integer Paise Rates
    const estimatedMinDailyPaise = Math.round(minDailyPaise * totalMultiplier);
    const estimatedMaxDailyPaise = Math.round(maxDailyPaise * totalMultiplier);

    const minDailyRupees = Math.round(estimatedMinDailyPaise / 100);
    const maxDailyRupees = Math.round(estimatedMaxDailyPaise / 100);

    const minHourlyRupees = Math.round(minDailyRupees / standardHours);
    const maxHourlyRupees = Math.round(maxDailyRupees / standardHours);

    // Format display string
    let formattedPriceRange = '';
    let locationNote = '';

    if (unit === 'hour') {
      formattedPriceRange = `₹${minHourlyRupees} – ₹${maxHourlyRupees} / hr`;
    } else {
      formattedPriceRange = `₹${minDailyRupees.toLocaleString('en-IN')} – ₹${maxDailyRupees.toLocaleString('en-IN')} / day`;
    }

    if (resolvedZone.matchedBy !== 'FALLBACK_DEFAULT') {
      locationNote = `Based on current market rates in ${zoneDisplayName}`;
    } else {
      locationNote = 'Based on standard market daily rates';
    }

    return {
      service,
      zone: zoneKey,
      zoneName: zoneDisplayName,
      matchedBy: resolvedZone.matchedBy,
      currency: 'INR',
      unit: unit === 'hour' ? 'hour' : 'day',
      standardDailyHours: standardHours,
      minDailyRate: minDailyRupees,
      maxDailyRate: maxDailyRupees,
      minDailyRateInPaise: estimatedMinDailyPaise,
      maxDailyRateInPaise: estimatedMaxDailyPaise,
      minHourlyRate: minHourlyRupees,
      maxHourlyRate: maxHourlyRupees,
      baseMinDailyRate: Math.round(minDailyPaise / 100),
      baseMaxDailyRate: Math.round(maxDailyPaise / 100),
      formattedPriceRange,
      locationNote,
      multipliers: {
        jobFactor: jobFactorMultiplier,
        demand: demandAdjustment.multiplier,
        total: totalMultiplier,
      },
      marketConditions: {
        availableWorkers: demandAdjustment.availableWorkers,
        activeJobRequests: demandAdjustment.activeJobRequests,
        isSurgeActive: demandAdjustment.isSurgeActive,
      },
      pricingVersion,
      timestamp: Date.now(),
    };
  }
}

module.exports = PricingEngine;
