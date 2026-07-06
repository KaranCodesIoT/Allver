import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { getStoredLanguage, getToken, getStoredUser, removeToken, removeStoredUser, saveStoredUser } from '../constants/Auth';
import { BACKEND_URL } from '../constants/Config';
import { useTranslation } from '../utils/i18n';

export default function Index() {
  const router = useRouter();
  const [loadingMessage, setLoadingMessage] = useState('Starting up...');
  const { i18n } = useTranslation();

  useEffect(() => {
    const checkAuthAndRouting = async () => {
      try {
        const token = await getToken();
        const storedUserStr = await getStoredUser();

        if (token && storedUserStr) {
          let userObj;
          try {
            userObj = JSON.parse(storedUserStr);
          } catch (e) {
            console.error('[StartupGuard] Stored user parsing failed:', e);
            await removeToken();
            await removeStoredUser();
            (global as any).currentUser = null;
            router.replace('/login');
            return;
          }

          // Set global current user immediately from storage
          (global as any).currentUser = userObj;

          // Apply saved language if any
          const userLang = userObj.language || (await getStoredLanguage()) || 'en';
          i18n.changeLanguage(userLang);

          // Role-based Navigation logic
          if (userObj.role === 'Architect') {
            const isProfileComplete =
              userObj.experience ||
              userObj.firmName ||
              (userObj.specialization && userObj.specialization.length > 0) ||
              (userObj.portfolioImages && userObj.portfolioImages.length > 0);
            
            router.replace(isProfileComplete ? '/(tabs)' : '/architect-profile');
          } else if (userObj.role === 'Contractor') {
            const isProfileComplete =
              userObj.contractorType ||
              userObj.teamSize ||
              (userObj.workCategory && userObj.workCategory.length > 0) ||
              (userObj.serviceLocation && userObj.serviceLocation.length > 0) ||
              userObj.experience;

            router.replace(isProfileComplete ? '/(tabs)' : '/contractor-profile');
          } else {
            router.replace('/(tabs)');
          }
          return;
        }

        // 2. If no valid session, check language selection
        const storedLanguage = await getStoredLanguage();
        if (!storedLanguage) {
          console.log('[StartupGuard] No language chosen yet. Routing to Choose Language screen.');
          router.replace('/choose-language');
        } else {
          console.log('[StartupGuard] No session. Routing to Login.');
          router.replace('/login');
        }

      } catch (error) {
        console.error('[StartupGuard] Unexpected error during startup check:', error);
        router.replace('/login');
      }
    };

    checkAuthAndRouting();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#1BC47D" />
      <Text style={styles.loadingText}>{loadingMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});
