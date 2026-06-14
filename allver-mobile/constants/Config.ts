import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getLocalBackendUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }

  // Get the IP address of the machine running the packager
  const hostUri = 
    Constants.expoConfig?.hostUri || 
    (Constants as any).manifest?.debuggerHost || 
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) {
      return `http://${ip}:5000`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }
  return 'http://localhost:5000';
};

export const BACKEND_URL = __DEV__ ? getLocalBackendUrl() : 'https://allver.onrender.com';
