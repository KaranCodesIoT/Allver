import React, { createContext, useContext, useState, useEffect } from 'react';
import { NativeModules, Platform } from 'react-native';

import en from '../locales/en.json';
import hi from '../locales/hi.json';
import mr from '../locales/mr.json';
import ta from '../locales/ta.json';
import te from '../locales/te.json';
import kn from '../locales/kn.json';
import ml from '../locales/ml.json';
import bn from '../locales/bn.json';
import gu from '../locales/gu.json';
import pa from '../locales/pa.json';

const translations: Record<string, any> = {
  en, hi, mr, ta, te, kn, ml, bn, gu, pa
};

// Supported languages list
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' }
];

// Helper to get device language
export const getDeviceLanguage = (): string => {
  try {
    let locale = '';
    if (Platform.OS === 'ios') {
      const settings = NativeModules.SettingsManager?.settings;
      locale = settings?.AppleLocale || settings?.AppleLanguages?.[0] || '';
    } else if (Platform.OS === 'android') {
      locale = NativeModules.I18nManager?.localeIdentifier || '';
    } else if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      locale = navigator.language || (navigator.languages && navigator.languages[0]) || '';
    }
    
    const code = locale.split('_')[0].split('-')[0].toLowerCase();
    const codes = SUPPORTED_LANGUAGES.map(l => l.code);
    return codes.includes(code) ? code : 'en';
  } catch (e) {
    console.warn('Error detecting device language:', e);
    return 'en';
  }
};

import { saveStoredLanguage } from '../constants/Auth';

// Local storage helpers
export const getLocalLanguage = (): string | null => {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem('user_language') || localStorage.getItem('userLanguage');
  }
  return (global as any).localLanguage || null;
};

export const setLocalLanguage = (lang: string) => {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem('user_language', lang);
    localStorage.setItem('userLanguage', lang);
  }
  (global as any).localLanguage = lang;
  if (Platform.OS !== 'web') {
    saveStoredLanguage(lang).catch(err => console.warn('Error saving stored language:', err));
  }
};

export const getCurrentUser = () => {
  let user = (global as any).currentUser;
  if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        user = JSON.parse(stored);
        (global as any).currentUser = user;
      } catch (e) {
        console.error(e);
      }
    }
  }
  return user;
};

// Translate function
const translate = (locale: string, key: string): string => {
  const dictionary = translations[locale] || translations['en'];
  const keys = key.split('.');
  let current: any = dictionary;
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      // Fallback to English dictionary
      let fallback: any = translations['en'];
      for (const fk of keys) {
        if (fallback && typeof fallback === 'object' && fk in fallback) {
          fallback = fallback[fk];
        } else {
          return key;
        }
      }
      return typeof fallback === 'string' ? fallback : key;
    }
  }
  
  return typeof current === 'string' ? current : key;
};

// I18n Context
interface I18nContextType {
  locale: string;
  t: (key: string) => string;
  changeLanguage: (lang: string) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  t: (key: string) => key,
  changeLanguage: () => {}
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<string>('en');

  useEffect(() => {
    // 1. Check logged-in user profile language
    const user = getCurrentUser();
    if (user?.language) {
      setLocaleState(user.language);
      setLocalLanguage(user.language);
      return;
    }

    // 2. Check local storage
    const stored = getLocalLanguage();
    if (stored) {
      setLocaleState(stored);
      return;
    }

    // 3. Fall back to device language
    const deviceLang = getDeviceLanguage();
    setLocaleState(deviceLang);
    setLocalLanguage(deviceLang);
  }, []);

  const changeLanguage = (lang: string) => {
    setLocaleState(lang);
    setLocalLanguage(lang);
    
    // If user is logged in, sync to backend profile
    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try { user = JSON.parse(stored); } catch (_) {}
      }
    }
    
    if (user && user._id) {
      user.language = lang;
      (global as any).currentUser = user;
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
      
      const { BACKEND_URL } = require('../constants/Config');
      fetch(`${BACKEND_URL}/api/user/profile/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang })
      }).catch(err => console.error('Error syncing language to backend:', err));
    }
  };

  const t = (key: string) => translate(locale, key);

  return React.createElement(
    I18nContext.Provider,
    { value: { locale, t, changeLanguage } },
    children
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  return {
    t: context.t,
    i18n: {
      language: context.locale,
      changeLanguage: context.changeLanguage
    }
  };
};
