import * as Location from 'expo-location';
import { GOOGLE_MAPS_API_KEY, BACKEND_URL } from '../constants/Config';

// Major Indian locations and coordinates for accurate fallback
export const INDIAN_CITIES_COORDINATES: Record<
  string,
  { lat: number; lng: number; state?: string; placeId?: string }
> = {
  'Sector 62, Noida': { lat: 28.6273, lng: 77.3725, state: 'Uttar Pradesh', placeId: 'ChIJz2x0_TnlDDkR9HkQ_o26kGE' },
  'Indirapuram, Ghaziabad': { lat: 28.6415, lng: 77.3712, state: 'Uttar Pradesh', placeId: 'ChIJ79K_6M7kDDkRsV0wTqU6hE8' },
  'Connaught Place, Delhi': { lat: 28.6315, lng: 77.2167, state: 'Delhi', placeId: 'ChIJq6d8s4X9DDkRkK5rC3wz1uE' },
  'Cyber City, Gurugram': { lat: 28.4950, lng: 77.0895, state: 'Haryana', placeId: 'ChIJk_Jq76kZDTkR9-g_d73rO60' },
  'Sector 18, Noida': { lat: 28.5708, lng: 77.3261, state: 'Uttar Pradesh', placeId: 'ChIJ6a33RjXjDDkRw4oZ_jL5dGI' },
  'Andheri West, Mumbai': { lat: 19.1363, lng: 72.8277, state: 'Maharashtra', placeId: 'ChIJG66B3tS35zsR9y79m4N5u0I' },
  'Bandra Kurla Complex, Mumbai': { lat: 19.0657, lng: 72.8683, state: 'Maharashtra', placeId: 'ChIJyV9n8nLF5zsRPyS4e488Xf0' },
  'Koramangala, Bengaluru': { lat: 12.9352, lng: 77.6245, state: 'Karnataka', placeId: 'ChIJp2XU97QUrjsRu_tS82q9dG8' },
  'Indiranagar, Bengaluru': { lat: 12.9784, lng: 77.6408, state: 'Karnataka', placeId: 'ChIJd4Z4nZkUrjsR8z3_U243dEI' },
  'Hitec City, Hyderabad': { lat: 17.4474, lng: 78.3762, state: 'Telangana', placeId: 'ChIJGZ-6vGKUyzsRF4-9_P0r6t0' },
  'Gachibowli, Hyderabad': { lat: 17.4401, lng: 78.3489, state: 'Telangana', placeId: 'ChIJq87vY6-UyzsRzYp4dF59h18' },
  'Kothrud, Pune': { lat: 18.5074, lng: 73.8077, state: 'Maharashtra', placeId: 'ChIJw1v9r6_AwjsR4uP-Q243dEI' },
  'Salt Lake, Kolkata': { lat: 22.5867, lng: 88.4178, state: 'West Bengal', placeId: 'ChIJz2x0_TnlDDkR9HkQ_o26kGE' },
  'T. Nagar, Chennai': { lat: 13.0418, lng: 80.2341, state: 'Tamil Nadu', placeId: 'ChIJN-Z-z7hZqDsR8z3_U243dEI' },
  'Navrangpura, Ahmedabad': { lat: 23.0365, lng: 72.5611, state: 'Gujarat', placeId: 'ChIJj79_6M7kDDkRsV0wTqU6hE8' },
  'Vaishali Nagar, Jaipur': { lat: 26.9048, lng: 75.7480, state: 'Rajasthan', placeId: 'ChIJk_Jq76kZDTkR9-g_d73rO60' },
  'Kalwa, Thane': { lat: 19.1982, lng: 72.9968, state: 'Maharashtra', placeId: 'ChIJz2x0_TnlDDkR9HkQ_o26kGE' },
  'Kalwa East': { lat: 19.1982, lng: 72.9968, state: 'Maharashtra', placeId: 'ChIJ79K_6M7kDDkRsV0wTqU6hE8' },
  'Kalwa West': { lat: 19.1995, lng: 72.9920, state: 'Maharashtra', placeId: 'ChIJ79K_6M7kDDkRsV0wTqU6hE8' },
  'Kalwa': { lat: 19.1982, lng: 72.9968, state: 'Maharashtra', placeId: 'ChIJz2x0_TnlDDkR9HkQ_o26kGE' },
  'Thane West, Maharashtra': { lat: 19.2183, lng: 72.9781, state: 'Maharashtra', placeId: 'ChIJG66B3tS35zsR9y79m4N5u0I' },
  'Thane': { lat: 19.2183, lng: 72.9781, state: 'Maharashtra', placeId: 'ChIJG66B3tS35zsR9y79m4N5u0I' },
};

export interface PlacePrediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
}

export interface GeocodedLocationDetails {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId: string;
  city?: string;
  state?: string;
  postalCode?: string;
  shortAddress?: string;
}

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
 * Finds coordinates for location name or address from known Indian cities map (longest prefix match)
 */
export function findCoordinatesForLocationText(text: string): { lat: number; lng: number } | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  const sortedKeys = Object.keys(INDIAN_CITIES_COORDINATES).sort((a, b) => b.length - a.length);
  for (const name of sortedKeys) {
    const cityName = name.toLowerCase();
    if (lower.includes(cityName) || cityName.includes(lower)) {
      return { lat: INDIAN_CITIES_COORDINATES[name].lat, lng: INDIAN_CITIES_COORDINATES[name].lng };
    }
  }
  return null;
}

/**
 * Forward geocodes address text to coordinates using known landmarks, Google Geocoding, or Expo Location
 */
export async function forwardGeocodeAddress(addressText: string): Promise<{ lat: number; lng: number } | null> {
  if (!addressText || !addressText.trim()) return null;
  const trimmed = addressText.trim();

  // 1. Fast local Indian cities / areas dictionary
  const localMatch = findCoordinatesForLocationText(trimmed);
  if (localMatch) return localMatch;

  // 2. Google Geocoding API
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed + ', India')}&key=${GOOGLE_MAPS_API_KEY}&components=country:in&language=en`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
          const loc = data.results[0].geometry?.location;
          if (loc && loc.lat && loc.lng) {
            return { lat: loc.lat, lng: loc.lng };
          }
        }
      }
    } catch (e) {
      console.warn('Google forward geocode error:', e);
    }
  }

  // 3. Expo Location fallback
  try {
    const results = await Location.geocodeAsync(trimmed + ', India');
    if (Array.isArray(results) && results.length > 0) {
      return { lat: results[0].latitude, lng: results[0].longitude };
    }
  } catch (e) {}

  return null;
}

/**
 * Fetch real live Google Places Autocomplete predictions using Places API (New) with fallbacks
 */
export async function getGooglePlacePredictions(input: string): Promise<PlacePrediction[]> {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length < 2) return [];

  // 1. Try Google Places API (New): https://places.googleapis.com/v1/places:autocomplete
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        },
        body: JSON.stringify({
          input: trimmed,
          includedRegionCodes: ['IN'],
          languageCode: 'en',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          return data.suggestions
            .filter((s: any) => s.placePrediction)
            .map((s: any) => {
              const p = s.placePrediction;
              return {
                placeId: p.placeId || (p.place ? p.place.replace('places/', '') : ''),
                description: p.text?.text || '',
                mainText: p.structuredFormat?.mainText?.text || p.text?.text?.split(',')[0] || '',
                secondaryText:
                  p.structuredFormat?.secondaryText?.text ||
                  p.text?.text?.split(',').slice(1).join(', ').trim() ||
                  '',
              };
            });
        }
      }
    } catch (newApiErr) {
      console.warn('Google Places API (New) autocomplete error:', newApiErr);
    }

    // 2. Try Google Places Legacy Autocomplete endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const legacyUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        trimmed
      )}&key=${GOOGLE_MAPS_API_KEY}&components=country:in&language=en`;

      const res = await fetch(legacyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && Array.isArray(data.predictions) && data.predictions.length > 0) {
          return data.predictions.map((p: any) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting?.main_text || p.description.split(',')[0],
            secondaryText:
              p.structured_formatting?.secondary_text ||
              p.description.split(',').slice(1).join(', ').trim(),
          }));
        }
      }
    } catch (legacyErr) {
      console.warn('Google Places Legacy autocomplete error:', legacyErr);
    }
  }

  // 3. Fallback: Search OpenStreetMap Nominatim for real live Indian addresses
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      trimmed
    )}&format=json&countrycodes=in&limit=6&addressdetails=1`;

    const res = await fetch(osmUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Allver-App/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => {
          const parts = (item.display_name || '').split(',').map((s: string) => s.trim());
          return {
            placeId: `osm_${item.place_id || item.osm_id}`,
            mainText: parts[0] || item.name || trimmed,
            secondaryText: parts.slice(1, 3).join(', ') || 'India',
            description: item.display_name,
          };
        });
      }
    }
  } catch (osmErr) {}

  // 4. Local Known Cities Fallback
  const fallbackResults: PlacePrediction[] = [];
  const lower = trimmed.toLowerCase();
  for (const [name, info] of Object.entries(INDIAN_CITIES_COORDINATES)) {
    if (name.toLowerCase().includes(lower) || (info.state && info.state.toLowerCase().includes(lower))) {
      const parts = name.split(',');
      fallbackResults.push({
        placeId: info.placeId || `loc_${name}`,
        mainText: parts[0].trim(),
        secondaryText: parts.slice(1).join(', ').trim() || info.state || 'India',
        description: `${name}, India`,
      });
    }
  }

  return fallbackResults;
}

/**
 * Fetch details (coordinates & formatted address) for a Place ID using Places API (New) and fallbacks
 */
export async function getGooglePlaceDetails(placeId: string): Promise<GeocodedLocationDetails | null> {
  if (!placeId) return null;

  // 1. Google Places API (New): https://places.googleapis.com/v1/places/{placeId}
  if (GOOGLE_MAPS_API_KEY && !placeId.startsWith('osm_') && !placeId.startsWith('loc_')) {
    const cleanId = placeId.replace('places/', '');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`https://places.googleapis.com/v1/places/${cleanId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,addressComponents',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.location) {
          const lat = data.location.latitude;
          const lng = data.location.longitude;
          const formattedAddress = data.formattedAddress || data.displayName?.text || 'Selected Location';
          const segments = formattedAddress.split(',').map((s: string) => s.trim());
          const shortAddress = segments.slice(0, 3).join(', ');

          return {
            lat,
            lng,
            formattedAddress,
            shortAddress: shortAddress || formattedAddress,
            placeId: cleanId,
          };
        }
      }
    } catch (newErr) {
      console.warn('Places API (New) details error:', newErr);
    }

    // 2. Google Place Details Legacy
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${cleanId}&key=${GOOGLE_MAPS_API_KEY}&fields=geometry,formatted_address,name`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.result) {
          const r = data.result;
          const lat = r.geometry?.location?.lat || 0;
          const lng = r.geometry?.location?.lng || 0;
          const formattedAddress = r.formatted_address || r.name || 'Selected Location';
          const segments = formattedAddress.split(',').map((s: string) => s.trim());
          const shortAddress = segments.slice(0, 3).join(', ');

          return {
            lat,
            lng,
            formattedAddress,
            shortAddress,
            placeId: cleanId,
          };
        }
      }
    } catch (legacyErr) {}
  }

  // 3. Fallback to Known Landmark coordinates
  for (const [name, coords] of Object.entries(INDIAN_CITIES_COORDINATES)) {
    if (coords.placeId === placeId || name.toLowerCase().includes(placeId.toLowerCase())) {
      return {
        lat: coords.lat,
        lng: coords.lng,
        formattedAddress: `${name}, India`,
        shortAddress: name,
        placeId: coords.placeId || placeId,
        state: coords.state,
      };
    }
  }

  return null;
}

/**
 * Detailed Reverse Geocoding with Google Maps Geocoding API + Nominatim & Native Fallbacks
 */
export async function detailedReverseGeocode(lat: number, lng: number): Promise<GeocodedLocationDetails> {
  // 1. Google Geocoding API
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=en`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
          const r = data.results[0];
          const formattedAddress = r.formatted_address || '';
          const placeId = r.place_id || `place_${lat.toFixed(4)}_${lng.toFixed(4)}`;

          let city = '';
          let state = '';
          let postalCode = '';

          if (Array.isArray(r.address_components)) {
            for (const c of r.address_components) {
              if (c.types.includes('locality') || c.types.includes('administrative_area_level_2')) {
                city = c.long_name;
              }
              if (c.types.includes('administrative_area_level_1')) {
                state = c.long_name;
              }
              if (c.types.includes('postal_code')) {
                postalCode = c.long_name;
              }
            }
          }

          const segments = formattedAddress.split(',').map((s: string) => s.trim());
          const shortAddress = segments.slice(0, 3).join(', ');

          return {
            lat,
            lng,
            formattedAddress,
            shortAddress: shortAddress || formattedAddress,
            placeId,
            city,
            state,
            postalCode,
          };
        }
      }
    } catch (gErr) {
      console.warn('Google Reverse Geocode error:', gErr);
    }
  }

  // 2. BigDataCloud Fast Client Reverse Geocoding
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const res = await fetch(bdcUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && (data.locality || data.city || data.principalSubdivision)) {
        const locality = data.locality || data.localityInfo?.administrative?.[3]?.name || '';
        const city = data.city || data.localityInfo?.administrative?.[2]?.name || data.localityInfo?.administrative?.[1]?.name || '';
        const state = data.principalSubdivision || '';
        const postalCode = data.postcode || '';
        const country = data.countryName || 'India';

        const parts = [locality, city, state].filter(Boolean);
        const shortAddress = parts.join(', ');
        const formattedAddress = [locality, city, state, postalCode, country].filter(Boolean).join(', ');

        return {
          lat,
          lng,
          formattedAddress: formattedAddress || shortAddress,
          shortAddress: shortAddress || formattedAddress,
          placeId: `bdc_${lat.toFixed(4)}_${lng.toFixed(4)}`,
          city: city || locality,
          state,
          postalCode,
        };
      }
    }
  } catch (bdcErr) {}

  // 3. OpenStreetMap Nominatim Live Reverse Geocoding
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Allver-App/1.0',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && (data.display_name || data.address)) {
        const addr = data.address || {};
        const road = addr.road || addr.suburb || addr.neighbourhood || addr.residential || '';
        const city = addr.city || addr.town || addr.district || addr.county || '';
        const state = addr.state || '';
        const parts = [road, city, state].filter(Boolean);
        const shortAddr = parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 3).join(', ').trim();

        return {
          lat,
          lng,
          formattedAddress: data.display_name,
          shortAddress: shortAddr,
          placeId: `osm_${data.place_id || `${lat.toFixed(4)}_${lng.toFixed(4)}`}`,
          city,
          state,
          postalCode: addr.postcode,
        };
      }
    }
  } catch (osmErr) {}

  // 3. Native Expo Location
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
      return {
        lat,
        lng,
        formattedAddress: resolved,
        shortAddress: resolved,
        placeId: `expo_${lat.toFixed(4)}_${lng.toFixed(4)}`,
        city: g.city || g.district,
        state: g.region,
        postalCode: g.postalCode,
      };
    }
  } catch (err) {}

  // 4. Known Indian Cities List Fallback
  const nearest = getClosestIndianCity(lat, lng);
  return {
    lat,
    lng,
    formattedAddress: nearest || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    shortAddress: nearest || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    placeId: `fallback_${lat.toFixed(4)}_${lng.toFixed(4)}`,
  };
}

/**
 * Safe Reverse Geocoding string helper
 */
export async function safeReverseGeocode(lat: number, lng: number): Promise<string> {
  const details = await detailedReverseGeocode(lat, lng);
  return details.shortAddress || details.formattedAddress;
}

/**
 * Safe Forward Geocoding helper
 */
export async function safeGeocode(text: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (INDIAN_CITIES_COORDINATES[trimmed]) {
    return INDIAN_CITIES_COORDINATES[trimmed];
  }

  if (GOOGLE_MAPS_API_KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        text
      )}&key=${GOOGLE_MAPS_API_KEY}&components=country:IN`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          return { lat: loc.lat, lng: loc.lng };
        }
      }
    } catch (e) {}
  }

  try {
    const geocoded = await Location.geocodeAsync(text);
    if (geocoded && geocoded.length > 0) {
      return { lat: geocoded[0].latitude, lng: geocoded[0].longitude };
    }
  } catch (e) {}

  return null;
}

/**
 * Returns dynamic live map URL with reliable static map renderer (works globally & in India without restricted keys)
 */
export function getIndiaMapImageUrl(lat: number, lng: number, zoom = 15): string {
  const safeLat = (!lat || isNaN(lat)) ? 19.1982 : lat;
  const safeLng = (!lng || isNaN(lng)) ? 72.9968 : lng;
  return `${BACKEND_URL}/api/map/static?lat=${safeLat}&lng=${safeLng}&zoom=${zoom}`;
}

