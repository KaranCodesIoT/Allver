import * as Location from 'expo-location';

// Major Indian locations and coordinates for accurate fallback
export const INDIAN_CITIES_COORDINATES: Record<string, { lat: number; lng: number; state?: string }> = {
  'Sector 62, Noida': { lat: 28.6273, lng: 77.3725, state: 'Uttar Pradesh' },
  'Indirapuram, Ghaziabad': { lat: 28.6415, lng: 77.3712, state: 'Uttar Pradesh' },
  'Connaught Place, Delhi': { lat: 28.6315, lng: 77.2167, state: 'Delhi' },
  'Cyber City, Gurugram': { lat: 28.4950, lng: 77.0895, state: 'Haryana' },
  'Sector 18, Noida': { lat: 28.5708, lng: 77.3261, state: 'Uttar Pradesh' },
  'Andheri West, Mumbai': { lat: 19.1363, lng: 72.8277, state: 'Maharashtra' },
  'Bandra Kurla Complex, Mumbai': { lat: 19.0657, lng: 72.8683, state: 'Maharashtra' },
  'Koramangala, Bengaluru': { lat: 12.9352, lng: 77.6245, state: 'Karnataka' },
  'Indiranagar, Bengaluru': { lat: 12.9784, lng: 77.6408, state: 'Karnataka' },
  'Hitec City, Hyderabad': { lat: 17.4474, lng: 78.3762, state: 'Telangana' },
  'Gachibowli, Hyderabad': { lat: 17.4401, lng: 78.3489, state: 'Telangana' },
  'Kothrud, Pune': { lat: 18.5074, lng: 73.8077, state: 'Maharashtra' },
  'Salt Lake, Kolkata': { lat: 22.5867, lng: 88.4178, state: 'West Bengal' },
  'T. Nagar, Chennai': { lat: 13.0418, lng: 80.2341, state: 'Tamil Nadu' },
  'Navrangpura, Ahmedabad': { lat: 23.0365, lng: 72.5611, state: 'Gujarat' },
  'Vaishali Nagar, Jaipur': { lat: 26.9048, lng: 75.7480, state: 'Rajasthan' },
  'Gomti Nagar, Lucknow': { lat: 26.8525, lng: 81.0003, state: 'Uttar Pradesh' },
  'Thane West, Maharashtra': { lat: 19.2183, lng: 72.9781, state: 'Maharashtra' },
};

/**
 * Finds the closest Indian landmark or city from coordinates
 */
export function getClosestIndianCity(lat: number, lng: number): string {
  let closestCity = 'Sector 62, Noida';
  let minDistance = Infinity;

  for (const [name, coords] of Object.entries(INDIAN_CITIES_COORDINATES)) {
    const d = Math.sqrt(Math.pow(coords.lat - lat, 2) + Math.pow(coords.lng - lng, 2));
    if (d < minDistance) {
      minDistance = d;
      closestCity = name;
    }
  }

  return closestCity;
}

/**
 * Safe Reverse Geocoding with Native Timeout & Nominatim Fallback
 */
export async function safeReverseGeocode(lat: number, lng: number): Promise<string> {
  // 1. Try native Expo Location with a 2.5s strict timeout to prevent Android OS hang
  try {
    const nativePromise = Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Native reverseGeocode timeout')), 2500)
    );

    const geocode = (await Promise.race([nativePromise, timeoutPromise])) as any[];
    if (geocode && geocode.length > 0) {
      const g = geocode[0];
      const parts = [
        g.name || g.streetNumber || g.street,
        g.district || g.subregion || g.city,
        g.region || g.postalCode,
      ].filter(Boolean);

      const resolved = parts.join(', ');
      if (resolved && resolved.trim().length > 0) {
        return resolved;
      }
    }
  } catch (err) {
    // Native timed out or failed; silently continue to web fallback
  }

  // 2. HTTP Fallback using OpenStreetMap Nominatim for Indian Coordinates
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Allver-India-App/1.0 (contact@allver.in)',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const street = addr.road || addr.suburb || addr.neighbourhood || addr.residential || '';
        const city = addr.city || addr.town || addr.district || addr.county || addr.state_district || '';
        const state = addr.state || '';
        const parts = [street, city, state].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(', ');
        }
        if (data.display_name) {
          return data.display_name.split(',').slice(0, 3).join(', ').trim();
        }
      }
    }
  } catch (fallbackErr) {
    // Fallback network failure
  }

  // 3. Fallback: match nearest city from known Indian coordinates list
  const nearest = getClosestIndianCity(lat, lng);
  return nearest || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

/**
 * Safe Forward Geocoding
 */
export async function safeGeocode(text: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Exact match from known cities
  if (INDIAN_CITIES_COORDINATES[trimmed]) {
    return INDIAN_CITIES_COORDINATES[trimmed];
  }

  // Check partial key match
  for (const [name, coords] of Object.entries(INDIAN_CITIES_COORDINATES)) {
    if (name.toLowerCase().includes(trimmed.toLowerCase()) || trimmed.toLowerCase().includes(name.toLowerCase())) {
      return coords;
    }
  }

  try {
    const geocoded = await Location.geocodeAsync(text);
    if (geocoded && geocoded.length > 0) {
      return { lat: geocoded[0].latitude, lng: geocoded[0].longitude };
    }
  } catch (e) {
    // Native geocode failed
  }

  return null;
}

/**
 * Returns dynamic live map URL for India view
 */
export function getIndiaMapImageUrl(lat: number, lng: number, zoom = 15): string {
  // Live OpenStreetMap Static rendering centered on India coordinates
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=800x500&maptype=mapnik`;
}
