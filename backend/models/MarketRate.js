// backend/models/MarketRate.js
// Persistent geographic market pricing benchmarks per service trade
// Stores base daily/hourly rates in integer paise with zone multiplier limits

const mongoose = require('mongoose');

const marketRateSchema = new mongoose.Schema({
  service: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  country: {
    type: String,
    default: 'India',
    trim: true,
  },
  state: {
    type: String,
    default: 'Maharashtra',
    trim: true,
  },
  city: {
    type: String,
    default: 'Mumbai',
    trim: true,
  },
  zone: {
    type: String,
    required: true,
    index: true,
    enum: [
      'MUMBAI_METRO',       // South/Central Mumbai, Bandra, BKC, Dadar, Worli
      'MUMBAI_SUBURBS',     // Andheri, Juhu, Borivali, Goregaon, Powai, Malad
      'THANE_NAVI_MUMBAI',  // Thane, Kalwa, Airoli, Vashi, Nerul, Belapur
      'DELHI_NCR',          // Noida, Ghaziabad, Delhi, Gurugram, Faridabad
      'DEFAULT',            // Universal baseline fallback
    ],
    default: 'DEFAULT',
  },
  zoneName: {
    type: String,
    default: 'Standard Service Area',
  },
  minDailyRateInPaise: {
    type: Number,
    required: true,
    min: 1000, // at least ₹10
  },
  maxDailyRateInPaise: {
    type: Number,
    required: true,
    min: 1000,
  },
  standardDailyHours: {
    type: Number,
    default: 8,
    min: 1,
    max: 24,
  },
  minHourlyRateInPaise: {
    type: Number,
    default: 0,
  },
  maxHourlyRateInPaise: {
    type: Number,
    default: 0,
  },
  demandMultiplierMin: {
    type: Number,
    default: 0.90, // Floor limit (10% discount during abundant supply)
    min: 0.50,
    max: 1.00,
  },
  demandMultiplierMax: {
    type: Number,
    default: 1.25, // Ceiling limit (25% maximum increase during peak demand)
    min: 1.00,
    max: 2.00,
  },
  pricingVersion: {
    type: String,
    default: 'v1.0',
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
}, { timestamps: true });

// Compound unique index: only 1 active rate per (service, zone)
marketRateSchema.index({ service: 1, zone: 1 }, { unique: true });

/**
 * Seed default baseline rates for all standard trades across geographic zones
 */
marketRateSchema.statics.seedDefaultRates = async function () {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return;
  }

  // Zone rate matrix (rates in integer Rupees, auto-converted to paise)
  // Format: [minDaily, maxDaily]
  const ZONE_BENCHMARKS = {
    MUMBAI_METRO: {
      zoneName: 'BKC & South Mumbai',
      state: 'Maharashtra',
      city: 'Mumbai',
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
      state: 'Maharashtra',
      city: 'Mumbai',
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
      state: 'Maharashtra',
      city: 'Thane',
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
      state: 'Uttar Pradesh / Delhi',
      city: 'Noida / Delhi',
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
      state: 'Maharashtra',
      city: 'Standard',
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

  const services = ['Painting', 'Masonry', 'Electrical', 'Plumbing', 'Carpentry', 'Tiling', 'Cleaning', 'General Work'];

  for (const [zoneKey, zoneMeta] of Object.entries(ZONE_BENCHMARKS)) {
    for (const s of services) {
      const rates = zoneMeta[s] || [800, 1000];
      const minDailyRateInPaise = rates[0] * 100;
      const maxDailyRateInPaise = rates[1] * 100;
      const minHourlyRateInPaise = Math.round((minDailyRateInPaise / 8));
      const maxHourlyRateInPaise = Math.round((maxDailyRateInPaise / 8));

      await this.findOneAndUpdate(
        { service: s, zone: zoneKey },
        {
          $setOnInsert: {
            service: s,
            zone: zoneKey,
            zoneName: zoneMeta.zoneName,
            country: 'India',
            state: zoneMeta.state,
            city: zoneMeta.city,
            minDailyRateInPaise,
            maxDailyRateInPaise,
            minHourlyRateInPaise,
            maxHourlyRateInPaise,
            standardDailyHours: 8,
            demandMultiplierMin: 0.90,
            demandMultiplierMax: 1.25,
            pricingVersion: 'v1.0',
            isActive: true,
          }
        },
        { upsert: true, new: true }
      );
    }
  }
};

module.exports = mongoose.models.MarketRate || mongoose.model('MarketRate', marketRateSchema);
