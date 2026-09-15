import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'userToken';
const USER_KEY = 'currentUser';

const withTimeout = <T>(promise: Promise<T>, timeoutMs = 2000, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) =>
      setTimeout(() => {
        console.warn(`[Auth SecureStore] Timeout reached (${timeoutMs}ms). Returning fallback.`);
        resolve(fallback);
      }, timeoutMs)
    ),
  ]);
};

export const saveToken = async (token: string): Promise<void> => {
  try {
    (global as any).isGuestMode = false;
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(GUEST_KEY, 'false');
      }
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(GUEST_KEY, 'false');
    }
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(TOKEN_KEY);
      }
      return null;
    } else {
      return await withTimeout(SecureStore.getItemAsync(TOKEN_KEY), 2000, null);
    }
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
      }
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

export const saveStoredUser = async (user: any): Promise<void> => {
  try {
    if (!user) return;
    const strippedUser = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      avatarUrl: user.avatarUrl,
      city: user.city,
      language: user.language,
      // Profile completion validation fields:
      experience: user.experience,
      firmName: user.firmName,
      specialization: user.specialization,
      portfolioImages: user.portfolioImages,
      contractorType: user.contractorType,
      teamSize: user.teamSize,
      workCategory: user.workCategory,
      serviceLocation: user.serviceLocation
    };
    const userStr = JSON.stringify(strippedUser);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(USER_KEY, userStr);
      }
    } else {
      await SecureStore.setItemAsync(USER_KEY, userStr);
    }
  } catch (error) {
    console.error('Error saving stored user:', error);
  }
};

export const getStoredUser = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(USER_KEY);
      }
      return null;
    } else {
      return await withTimeout(SecureStore.getItemAsync(USER_KEY), 2000, null);
    }
  } catch (error) {
    console.error('Error getting stored user:', error);
    return null;
  }
};

export const removeStoredUser = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(USER_KEY);
      }
    } else {
      await SecureStore.deleteItemAsync(USER_KEY);
    }
  } catch (error) {
    console.error('Error removing stored user:', error);
  }
};

/**
 * Completely clears the authentication session, active-job memory, and active sockets.
 * Guarantees no state leakage across user logins.
 */
export const clearAuthSession = async (): Promise<void> => {
  try {
    // 1. Immediately wipe active-job state in memory across the frontend
    try {
      const { notifyClearActiveJob } = require('../context/ActiveJobContext');
      if (typeof notifyClearActiveJob === 'function') {
        notifyClearActiveJob();
      }
    } catch (e) {}

    // 2. Disconnect and stop any active-job socket subscriptions
    try {
      const socketModule = require('../utils/SocketService');
      const socketService = socketModule?.default || socketModule;
      if (socketService && typeof socketService.disconnect === 'function') {
        socketService.disconnect();
      }
    } catch (e) {}

    // 3. Remove tokens and stored user session from SecureStore & localStorage
    await removeToken();
    await removeStoredUser();

    // 4. Wipe global references
    (global as any).currentUser = null;
    (global as any).currentPushToken = null;
    (global as any).currentFcmToken = null;

    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('currentUser');
      localStorage.removeItem('userToken');
    }
    console.log('[Auth] Auth session, active job memory, and sockets fully cleared.');
  } catch (error) {
    console.error('Error clearing auth session:', error);
  }
};

const LANG_KEY = 'userLanguage';
const GUEST_KEY = 'isGuestMode';

export const setGuestMode = async (isGuest: boolean): Promise<void> => {
  try {
    (global as any).isGuestMode = isGuest;
    const val = isGuest ? 'true' : 'false';
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(GUEST_KEY, val);
      }
    } else {
      await SecureStore.setItemAsync(GUEST_KEY, val);
    }
  } catch (error) {
    console.error('Error saving guest mode:', error);
  }
};

export const isGuestSession = async (): Promise<boolean> => {
  try {
    if ((global as any).isGuestMode === true) return true;
    let stored: string | null = null;
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        stored = localStorage.getItem(GUEST_KEY);
      }
    } else {
      stored = await withTimeout(SecureStore.getItemAsync(GUEST_KEY), 2000, null);
    }
    const isGuest = stored === 'true';
    (global as any).isGuestMode = isGuest;
    return isGuest;
  } catch (error) {
    return false;
  }
};

/**
 * Fast synchronous check whether an active user context is a guest.
 * Returns true if no user object or user._id exists, or if isGuestMode is flagged.
 */
export const isGuestUser = (user?: any): boolean => {
  if ((global as any).isGuestMode === true) return true;
  const activeUser = user || (global as any).currentUser;
  return !activeUser || !activeUser._id;
};

/**
 * Enters unauthenticated Guest Mode:
 * Wipes any stale tokens, clears user session, and flags guest mode.
 */
export const enterGuestMode = async (): Promise<void> => {
  await clearAuthSession();
  await setGuestMode(true);
};

export const saveStoredLanguage = async (lang: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LANG_KEY, lang);
      }
    } else {
      await SecureStore.setItemAsync(LANG_KEY, lang);
    }
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

export const getStoredLanguage = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(LANG_KEY);
      }
    } else {
      return await withTimeout(SecureStore.getItemAsync(LANG_KEY), 2000, null);
    }
  } catch (error) {
    console.error('Error getting language:', error);
    return null;
  }
};
