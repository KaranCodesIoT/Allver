// Comprehensive test of Haversine distance, Painting radius waves (10km / 20km / 30km), and worker eligibility
const SERVICE_RADIUS_CONFIG = {
  default: { wave1Km: 5, wave2Km: 12, maxRadiusKm: 25 },
  Painting: { wave1Km: 10, wave2Km: 20, maxRadiusKm: 30 },
  Masonry: { wave1Km: 6, wave2Km: 15, maxRadiusKm: 30 },
  Electrical: { wave1Km: 4, wave2Km: 10, maxRadiusKm: 20 },
  Plumbing: { wave1Km: 4, wave2Km: 10, maxRadiusKm: 20 },
};

function getServiceRadiusConfig(serviceName) {
  if (!serviceName) return SERVICE_RADIUS_CONFIG.default;
  const match = Object.keys(SERVICE_RADIUS_CONFIG).find(
    k => k.toLowerCase() === serviceName.toLowerCase()
  );
  return match ? SERVICE_RADIUS_CONFIG[match] : SERVICE_RADIUS_CONFIG.default;
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return Infinity;
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return Infinity;

  const R = 6371; // Earth radius in kilometers
  const dLat = ((numLat2 - numLat1) * Math.PI) / 180;
  const dLon = ((numLon2 - numLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((numLat1 * Math.PI) / 180) *
      Math.cos((numLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

const SERVICE_SKILL_MAP = {
  Painting: ['painter', 'painting', 'painter worker', 'civil & painting'],
  Electrical: ['electrician', 'electrical', 'wiring'],
};

function isWorkerMatchingService(workerSkill, requestedService) {
  const acceptable = SERVICE_SKILL_MAP[requestedService] || [];
  const skillStr = (workerSkill || '').toLowerCase();
  return acceptable.some(s => skillStr.includes(s));
}

// Client Booking Location: Sector 62, Noida
const clientBooking = {
  service: 'Painting',
  latitude: 28.6273,
  longitude: 77.3725,
  location: 'Sector 62, Noida'
};

const radiusConfig = getServiceRadiusConfig(clientBooking.service);

console.log('========================================================================');
console.log('AUDIT: RADIUS CONFIGURATION & WORKER ELIGIBILITY VERIFICATION');
console.log('========================================================================');
console.log(`Requested Service: "${clientBooking.service}"`);
console.log(`Configured Radii -> Wave 1: ${radiusConfig.wave1Km} km | Wave 2: ${radiusConfig.wave2Km} km | Max: ${radiusConfig.maxRadiusKm} km`);
console.log(`Client Coordinates: (${clientBooking.latitude}, ${clientBooking.longitude}) [${clientBooking.location}]\n`);

const testWorkers = [
  {
    id: 'W1',
    name: 'Ramesh Painter',
    skill: 'Painter',
    latitude: 28.6415,
    longitude: 77.3712,
    location: 'Indirapuram, Ghaziabad'
  },
  {
    id: 'W2',
    name: 'Suresh Master Painter',
    skill: 'Painting Contractor',
    latitude: 28.6315,
    longitude: 77.2167,
    location: 'Connaught Place, Delhi'
  },
  {
    id: 'W3',
    name: 'Anil Painter (Far)',
    skill: 'Painter',
    latitude: 28.4950,
    longitude: 77.0895,
    location: 'Cyber City, Gurugram'
  },
  {
    id: 'W4',
    name: 'Vijay Painter (Distant City)',
    skill: 'Painter',
    latitude: 19.0178,
    longitude: 72.8478,
    location: 'Dadar, Mumbai'
  },
  {
    id: 'W5',
    name: 'Deepak Electrician (Nearby Non-Painter)',
    skill: 'Electrician',
    latitude: 28.6415,
    longitude: 77.3712,
    location: 'Indirapuram, Ghaziabad'
  }
];

testWorkers.forEach(w => {
  const dist = calculateDistanceKm(clientBooking.latitude, clientBooking.longitude, w.latitude, w.longitude);
  const tradeMatch = isWorkerMatchingService(w.skill, clientBooking.service);
  
  const inWave1 = tradeMatch && dist <= radiusConfig.wave1Km;
  const inWave2 = tradeMatch && dist <= radiusConfig.wave2Km;
  const inMaxRadius = tradeMatch && dist <= radiusConfig.maxRadiusKm;

  let waveAssigned = 'EXCLUDED (Outside Radius or Trade Mismatch)';
  if (!tradeMatch) {
    waveAssigned = 'EXCLUDED (Skill Mismatch: ' + w.skill + ')';
  } else if (inWave1) {
    waveAssigned = `ELIGIBLE in Wave 1 (${dist} km <= ${radiusConfig.wave1Km} km)`;
  } else if (inWave2) {
    waveAssigned = `ELIGIBLE in Wave 2 (${dist} km <= ${radiusConfig.wave2Km} km)`;
  } else if (inMaxRadius) {
    waveAssigned = `ELIGIBLE in Wave 3 / Max (${dist} km <= ${radiusConfig.maxRadiusKm} km)`;
  } else {
    waveAssigned = `BLOCKED (Distance ${dist} km > Max ${radiusConfig.maxRadiusKm} km)`;
  }

  console.log(`Worker: ${w.name} (${w.skill})`);
  console.log(`  Location: ${w.location} (${w.latitude}, ${w.longitude})`);
  console.log(`  Haversine Distance: ${dist} km`);
  console.log(`  Status: ${waveAssigned}\n`);
});
