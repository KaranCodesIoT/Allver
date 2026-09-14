const KNOWN_COORDINATES_MAP = {
  'kalwa east': { lat: 19.1982, lng: 72.9968 },
  'kalwa west': { lat: 19.1995, lng: 72.9920 },
  'kalwa, thane': { lat: 19.1982, lng: 72.9968 },
  'kalwa': { lat: 19.1982, lng: 72.9968 },
  'thane west, maharashtra': { lat: 19.2183, lng: 72.9781 },
  'thane': { lat: 19.2183, lng: 72.9781 },
  'dadar, mumbai': { lat: 19.0178, lng: 72.8478 },
  'dadar': { lat: 19.0178, lng: 72.8478 },
  'mumbai': { lat: 19.0760, lng: 72.8777 }
};

function resolveWorkerCoordinates(workerObj) {
  if (!workerObj) return null;
  if (workerObj.latitude && workerObj.longitude && !isNaN(Number(workerObj.latitude)) && !isNaN(Number(workerObj.longitude))) {
    return { lat: Number(workerObj.latitude), lng: Number(workerObj.longitude) };
  }
  const locText = [
    workerObj.workArea,
    workerObj.location,
    workerObj.city,
    workerObj.formattedAddress,
    workerObj.address
  ].filter(Boolean).join(' ').toLowerCase().trim();

  if (locText) {
    const sortedKeys = Object.keys(KNOWN_COORDINATES_MAP).sort((a, b) => b.length - a.length);
    for (const name of sortedKeys) {
      if (locText.includes(name)) {
        return KNOWN_COORDINATES_MAP[name];
      }
    }
  }
  return null;
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

// 1. Worker entered custom text in Work Area: "parshik nagar, kalwa west"
const workerInput = {
  fullName: 'Akash Chauhan',
  workArea: 'parshik nagar, kalwa west',
  serviceRadiusKm: 15
};

const resolvedWorkerCoords = resolveWorkerCoordinates(workerInput);
console.log('Worker Typed Area:', workerInput.workArea);
console.log('Resolved Worker Coordinates:', resolvedWorkerCoords);

// 2. Client requested at "Kalwa"
const clientInput = {
  location: 'Kalwa',
  formattedAddress: 'Kalwa, Thane'
};
const resolvedClientCoords = resolveWorkerCoordinates(clientInput);
console.log('Client Request Location:', clientInput.location);
console.log('Resolved Client Coordinates:', resolvedClientCoords);

// 3. Distance
const distanceKm = calculateDistanceKm(
  resolvedClientCoords.lat,
  resolvedClientCoords.lng,
  resolvedWorkerCoords.lat,
  resolvedWorkerCoords.lng
);

console.log(`\nCalculated Geographic Distance: ${distanceKm} km`);
console.log(`Wave 1 Threshold: <= 10 km -> ${distanceKm <= 10 ? 'MATCHED IN WAVE 1 (SUCCESS)' : 'FAILED'}`);
console.log(`Worker Service Radius: <= 15 km -> ${distanceKm <= 15 ? 'WITHIN WORKER TRAVEL LIMIT (SUCCESS)' : 'FAILED'}`);
