import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Platform } from 'react-native';
import { getLocalLanguage } from '../utils/i18n';
import { getToken, getStoredUser } from '../constants/Auth';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkSessionAndLanguage = async () => {
      try {
        const lang = getLocalLanguage();
        
        // 1. Check language first
        if (!lang) {
          router.replace('/choose-language');
          return;
        }

        // 2. Check session
        const token = await getToken();
        const storedUserStr = await getStoredUser();

        if (token && storedUserStr) {
          const user = JSON.parse(storedUserStr);
          (global as any).currentUser = user;

          console.log('[Splash] Found active session. Redirecting...');
          
          if (user?.role === 'Architect') {
            const done =
              user.experience ||
              user.firmName ||
              (user.specialization?.length > 0) ||
              (user.portfolioImages?.length > 0);
            router.replace(done ? '/(tabs)' : '/architect-profile');
          } else if (user?.role === 'Contractor') {
            const done =
              user.contractorType ||
              user.teamSize ||
              (user.workCategory?.length > 0) ||
              (user.serviceLocation?.length > 0) ||
              user.experience;
            router.replace(done ? '/(tabs)' : '/contractor-profile');
          } else {
            router.replace('/(tabs)');
          }
        } else {
          console.log('[Splash] No active session. Redirecting to signup...');
          router.replace('/signup');
        }
      } catch (error) {
        console.error('[Splash] Auth session check failed:', error);
        router.replace('/signup');
      }
    };

    const timer = setTimeout(checkSessionAndLanguage, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="small" color="#16A34A" />
    </View>
  );
}
