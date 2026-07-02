import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Platform } from 'react-native';
import { getLocalLanguage } from '../utils/i18n';

export default function Index() {
  const router = useRouter();

  const getCurrentUser = () => {
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

  useEffect(() => {
    const user = getCurrentUser();
    const lang = getLocalLanguage();
    const profileLang = user?.language;

    if (!lang && !profileLang) {
      // First Launch or No Language Preference Set
      router.replace('/choose-language');
    } else {
      // Language exists
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/signup');
      }
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="small" color="#16A34A" />
    </View>
  );
}
