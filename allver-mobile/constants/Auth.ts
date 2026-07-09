import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'userToken';
const USER_KEY = 'currentUser';

export const saveToken = async (token: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token);
      }
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
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
      return await SecureStore.getItemAsync(TOKEN_KEY);
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
      language: user.language
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
      return await SecureStore.getItemAsync(USER_KEY);
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

const LANG_KEY = 'userLanguage';

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
      return null;
    } else {
      return await SecureStore.getItemAsync(LANG_KEY);
    }
  } catch (error) {
    console.error('Error getting language:', error);
    return null;
  }
};
