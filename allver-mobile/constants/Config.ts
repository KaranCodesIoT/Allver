import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getLocalBackendUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }

  let ip = '';
  
  // 1. Try hostUri
  const hostUri = 
    Constants.expoConfig?.hostUri || 
    (Constants as any).manifest?.debuggerHost || 
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    ip = hostUri.split(':')[0];
  }

  // 2. Try experienceUrl (highly reliable in Expo Go)
  if (!ip) {
    const experienceUrl = (Constants as any).experienceUrl || '';
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

  // 4. If we successfully resolved a local IP, use it
  if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
    return `http://${ip}:5000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }
  return 'http://localhost:5000';
};

export const BACKEND_URL = __DEV__ ? getLocalBackendUrl() : 'https://allver.onrender.com';
console.log('[Config] Resolved BACKEND_URL:', BACKEND_URL);

export const resolveAvatarUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  
  // Replace http://<ip-or-host>:5000/ with BACKEND_URL/ to dynamically handle dev machine IP changes
  const regex = /^http:\/\/[a-zA-Z0-9.-]+:5000/;
  if (regex.test(url)) {
    return url.replace(regex, BACKEND_URL);
  }
  
  if (url.startsWith('/uploads')) {
    return `${BACKEND_URL}${url}`;
  }
  return url;
};



