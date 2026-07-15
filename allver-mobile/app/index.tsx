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
      console.log('[StartupGuard] [Checkpoint 1] checkAuthAndRouting started.');
      try {
        // Yield to the next tick to ensure navigation container is fully mounted and ready
        console.log('[StartupGuard] [Checkpoint 2] Deferring execution for navigation mount...');
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('[StartupGuard] [Checkpoint 3] Deferral completed. Performing auth check.');

        // 1. Check synchronous memory cache first for instant routing
        let userObj = (global as any).currentUser;
        let token = userObj ? 'cached_token_placeholder' : null;
        console.log('[StartupGuard] [Checkpoint 4] In-memory user object:', userObj ? 'Found' : 'Not Found');

        if (!userObj) {
          console.log('[StartupGuard] [Checkpoint 5] No user in memory. Querying storage.');
          token = await getToken();
          const storedUserStr = await getStoredUser();
          console.log('[StartupGuard] [Checkpoint 6] Storage lookup - Token:', token ? 'Found' : 'Not Found', 'User String:', storedUserStr ? 'Found' : 'Not Found');
          
          if (token && storedUserStr) {
            try {
              userObj = JSON.parse(storedUserStr);
              (global as any).currentUser = userObj;
              console.log('[StartupGuard] [Checkpoint 7] Successfully parsed and cached stored user.');
            } catch (e) {
              console.error('[StartupGuard] [Checkpoint 7-Error] Stored user parsing failed:', e);
              await removeToken();
              await removeStoredUser();
              (global as any).currentUser = null;
              console.log('[StartupGuard] [Checkpoint 8-Fallback] Routing to /login after parse failure.');
              router.replace('/login');
              return;
            }
          }
        }

        if (userObj) {
          console.log('[StartupGuard] [Checkpoint 9] Found valid user session. Setting up locale & routing.');
          // Apply saved language
          const userLang = userObj.language || (global as any).localLanguage || (await getStoredLanguage()) || 'en';
          console.log('[StartupGuard] [Checkpoint 10] Applying language:', userLang);
          i18n.changeLanguage(userLang);

          // Role-based Navigation logic
          console.log('[StartupGuard] [Checkpoint 11] User role:', userObj.role);
          if (userObj.role === 'Architect') {
            const isProfileComplete =
              userObj.experience ||
              userObj.firmName ||
              (userObj.specialization && userObj.specialization.length > 0) ||
              (userObj.portfolioImages && userObj.portfolioImages.length > 0);
            
            const target = isProfileComplete ? '/(tabs)' : '/architect-profile';
            console.log('[StartupGuard] [Checkpoint 12] Routing Architect to:', target);
            router.replace(target as any);
          } else if (userObj.role === 'Contractor') {
            const isProfileComplete =
              userObj.contractorType ||
              userObj.teamSize ||
              (userObj.workCategory && userObj.workCategory.length > 0) ||
              (userObj.serviceLocation && userObj.serviceLocation.length > 0) ||
              userObj.experience;

            const target = isProfileComplete ? '/(tabs)' : '/contractor-profile';
            console.log('[StartupGuard] [Checkpoint 12] Routing Contractor to:', target);
            router.replace(target as any);
          } else {
            console.log('[StartupGuard] [Checkpoint 12] Routing general user to /(tabs)');
            router.replace('/(tabs)');
          }
          return;
        }

        // 2. If no valid session, route to Choose Language screen
        console.log('[StartupGuard] [Checkpoint 13] No active session. Routing to /choose-language.');
        router.replace('/choose-language');

      } catch (error) {
        console.error('[StartupGuard] [Checkpoint Error] Unexpected error during startup check:', error);
        try {
          router.replace('/login');
        } catch (navError) {
          console.error('[StartupGuard] [Checkpoint Error-Fallback] Failed to fall back to login screen:', navError);
        }
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
