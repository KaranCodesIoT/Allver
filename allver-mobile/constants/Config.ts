import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getLocalBackendUrl = () => {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      return `http://${window.location.hostname}:5000`;
    }
    return 'http://localhost:5000';
  }

  let ip = '';
  
  // 1. Try hostUri & debuggerHost locations in Expo SDK
  const hostUri = 
    Constants.expoConfig?.hostUri || 
    (Constants as any).expoGoConfig?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost || 
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    ip = hostUri.split(':')[0];
  }

  // 2. Try experienceUrl (highly reliable in Expo Go)
  if (!ip) {
    const experienceUrl = (Constants as any).experienceUrl || (Constants as any).expoGoConfig?.experienceUrl || '';
    if (experienceUrl) {
      const match = experienceUrl.match(/:\/\/([a-zA-Z0-9.-]+)/);
      if (match && match[1]) {
        ip = match[1];
      }
    }
  }

  // 3. Try linkingUri as another fallback
  if (!ip) {
    const linkingUri = Constants.linkingUri || '';
    if (linkingUri) {
      const match = linkingUri.match(/:\/\/([a-zA-Z0-9.-]+)/);
      if (match && match[1]) {
        ip = match[1];
      }
    }
  }

  // 4. Filter out VirtualBox host-only adapter IPs (e.g. 192.168.56.x) which mobile devices cannot reach
  const isVirtualAdapter = (addr: string) => addr.startsWith('192.168.56.') || addr === '127.0.0.1' || addr === 'localhost';

  if (ip && isVirtualAdapter(ip)) {
    console.warn(`[Config] Detected virtual/host-only adapter IP (${ip}). Falling back to local Wi-Fi LAN...`);
    ip = '10.108.3.241';
  }

  if (ip && !isVirtualAdapter(ip)) {
    return `http://${ip}:5000`;
  }

  if (Platform.OS === 'android') {
    // If running on a physical Android phone on Wi-Fi, try LAN IP before emulator alias
    return 'http://10.108.3.241:5000';
  }
  return 'http://10.108.3.241:5000';
};

export const BACKEND_URL = __DEV__ ? getLocalBackendUrl() : 'https://allver.onrender.com';
console.log('[Config] Resolved BACKEND_URL:', BACKEND_URL);

export const resolveAvatarUrl = (url?: string, updatedAt?: string | number | Date): string | undefined => {
  if (!url) return undefined;
  
  // Replace http://<ip-or-host>:5000/ with BACKEND_URL/ to dynamically handle dev machine IP changes
  const regex = /^http:\/\/[a-zA-Z0-9.-]+:5000/;
  let resolved = url;
  if (regex.test(url)) {
    resolved = url.replace(regex, BACKEND_URL);
  } else if (url.startsWith('/uploads')) {
    resolved = `${BACKEND_URL}${url}`;
  }
  
  if (updatedAt) {
    const ts = updatedAt instanceof Date ? updatedAt.getTime() : updatedAt;
    const separator = resolved.includes('?') ? '&' : '?';
    return `${resolved}${separator}v=${ts}`;
  }
  return resolved;
};

export const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  (Constants.expoConfig as any)?.extra?.googleMapsApiKey ||
  (Constants.expoConfig as any)?.android?.config?.googleMaps?.apiKey ||
  '';

export const SERVICE_RADIUS_CONFIG: Record<string, { wave1Km: number; wave2Km: number; maxRadiusKm: number }> = {
  default: { wave1Km: 5, wave2Km: 12, maxRadiusKm: 25 },
  Painting: { wave1Km: 10, wave2Km: 20, maxRadiusKm: 30 },
  Masonry: { wave1Km: 6, wave2Km: 15, maxRadiusKm: 30 },
  Electrical: { wave1Km: 4, wave2Km: 10, maxRadiusKm: 20 },
  Plumbing: { wave1Km: 4, wave2Km: 10, maxRadiusKm: 20 },
  Carpentry: { wave1Km: 5, wave2Km: 12, maxRadiusKm: 25 },
  Tiling: { wave1Km: 5, wave2Km: 12, maxRadiusKm: 25 },
  Cleaning: { wave1Km: 4, wave2Km: 8, maxRadiusKm: 15 },
  'General Work': { wave1Km: 5, wave2Km: 12, maxRadiusKm: 25 },
  Other: { wave1Km: 5, wave2Km: 12, maxRadiusKm: 25 }
};

export function getServiceRadiusConfig(serviceName?: string) {
  if (!serviceName) return SERVICE_RADIUS_CONFIG.default;
  const match = Object.keys(SERVICE_RADIUS_CONFIG).find(
    k => k.toLowerCase() === serviceName.toLowerCase()
  );
  return match ? SERVICE_RADIUS_CONFIG[match] : SERVICE_RADIUS_CONFIG.default;
}

