import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useSegments, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Linking, ActivityIndicator, AppState, Platform, Alert, Modal, Animated, Dimensions, LogBox } from 'react-native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { BACKEND_URL } from '@/constants/Config';
import { I18nProvider } from '../utils/i18n';
import { getStoredUser, getStoredLanguage, getToken, removeToken, removeStoredUser, saveStoredUser } from '@/constants/Auth';
import { UnreadMessageProvider } from '../context/UnreadMessageContext';
import { UnreadActivityProvider } from '../context/UnreadActivityContext';
import { CallProvider } from '../context/CallContext';
import CallKeepService from '../utils/CallKeepService';
import AIAssistantFloatingButton from '../components/AIAssistantFloatingButton';
import IncomingJobModal from '../components/IncomingJobModal';

// Ignore specific warning logs in Expo Go / Development
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Notifications.removeNotificationSubscription',
]);



// Keep the splash screen visible until we hide it
console.log('[BOOT] [Step 8] app/_layout.tsx evaluation started.');
SplashScreen.preventAutoHideAsync().catch(() => {});

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const activeChatRoomId = (global as any).activeChatRoomId;
    const incomingConvoId = notification.request.content.data?.conversationId;
    // Suppress push alerts only if the user is actively viewing the same chat room
    if (activeChatRoomId && incomingConvoId && activeChatRoomId === incomingConvoId) {
      return {
        shouldShowAlert: false,
        shouldShowBanner: false,
        shouldList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }
    return {
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export default function RootLayout() {
  console.log('[BOOT] [Step 9] RootLayout component execution/rendering started.');
  const colorScheme = useColorScheme();
  const [stage, setStage] = useState<'splash' | 'ready'>('splash');
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const segments = useSegments();

  // Load user from local/global state on boot and route changes
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

  const checkLocationPermission = async (shouldRequest = false) => {
    try {
      const user = getCurrentUser();
      
      // Location is optional for Client. Only mandatory for Contractor, Labour, Architect
      if (!user || user.role === 'Client') {
        setLocationPermissionGranted(true);
        setCheckingLocation(false);
        return;
      }

      if (shouldRequest) {
        setCheckingLocation(true);
      }
      const { status } = await Location.getForegroundPermissionsAsync();
      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (status === 'granted' && servicesEnabled) {
        setLocationPermissionGranted(true);
      } else if (shouldRequest) {
        if (!servicesEnabled) {
          Alert.alert(
            'GPS Services Off',
            'Please turn on GPS / Location Services in your system settings to use the Allver platform.'
          );
        }
        
        if (status !== 'granted') {
          const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
          if (newStatus === 'granted' && servicesEnabled) {
            setLocationPermissionGranted(true);
          } else {
            setLocationPermissionGranted(false);
          }
        } else {
          // Permission is granted, but system GPS services are still disabled
          setLocationPermissionGranted(false);
        }
      } else {
        // Silent check: just verify if we have access, don't show full-screen loading spinner
        if (status === 'granted' && servicesEnabled) {
          setLocationPermissionGranted(true);
        } else {
          setLocationPermissionGranted(false);
        }
      }
    } catch (error) {
      console.warn('Error checking location permission:', error);
      setLocationPermissionGranted(false);
    } finally {
      setCheckingLocation(false);
    }
  };

  useEffect(() => {
    if (stage === 'ready') {
      checkLocationPermission(false);
    }
  }, [stage]);

  // Sockets, CallKeep, and Push Notification initializations have been moved
  // to app/(tabs)/_layout.tsx to execute only after successful authentication,
  // preventing native call permission prompts from stalling early navigation.

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && stage === 'ready') {
        checkLocationPermission(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [stage]);

  useEffect(() => {
    console.log('[BOOT] [Step 10] RootLayout prepare Effect triggered.');
    
    // Failsafe timer: Force transition to ready and hide splash screen after 3 seconds
    // in case any SecureStore or native splash hiding process hangs.
    const failsafeTimer = setTimeout(() => {
      console.warn('[BOOT] [Failsafe Warning] prepare took too long. Forcing ready stage...');
      try {
        SplashScreen.hideAsync().catch((e) => {
          console.warn('[BOOT] [Failsafe Warning] SplashScreen.hideAsync failed during failsafe:', e);
        });
      } catch (e) {}
      setStage((prev) => {
        if (prev !== 'ready') {
          console.log('[BOOT] [Failsafe] Transitioned stage to ready via failsafe.');
          return 'ready';
        }
        return prev;
      });
    }, 3000);

    const prepare = async () => {
      console.log('[BOOT] [Step 11] prepare() execution started.');
      try {
        // Load stored language asynchronously before hiding splash screen
        console.log('[BOOT] [Step 12] Querying stored language...');
        const storedLanguage = await getStoredLanguage();
        if (storedLanguage) {
          (global as any).localLanguage = storedLanguage;
          console.log('[BOOT] [Step 13] Loaded stored language:', storedLanguage);
        } else {
          console.log('[BOOT] [Step 13] No stored language found.');
        }

        // Load stored user asynchronously before hiding splash screen
        console.log('[BOOT] [Step 14] Querying stored user session...');
        const storedUserStr = await getStoredUser();
        if (storedUserStr) {
          (global as any).currentUser = JSON.parse(storedUserStr);
          console.log('[BOOT] [Step 15] Loaded stored user session:', (global as any).currentUser?.fullName);
        } else {
          console.log('[BOOT] [Step 15] No stored user session found.');
        }
      } catch (error) {
        console.error('[BOOT] [Step 15 Error] Failed to load stored user session or language:', error);
      } finally {
        // Clear failsafe timer since preparation completed successfully
        clearTimeout(failsafeTimer);
        
        try {
          console.log('[BOOT] [Step 16] Hiding native splash screen...');
          // Trigger splash screen hiding asynchronously without awaiting it
          // to prevent potential native UI hang from blocking React state updates
          SplashScreen.hideAsync()
            .then(() => console.log('[BOOT] [Step 17] Native splash screen hidden successfully.'))
            .catch((e) => console.warn('[BOOT] [Step 17 Warning] SplashScreen.hideAsync failed:', e));
        } catch (e) {
          console.warn('[BOOT] [Step 17 Warning] Synchronous hideAsync wrapper error:', e);
        }
        
        console.log('[BOOT] [Step 18] Transitioning stage to ready.');
        setStage('ready');
      }
    };
    
    // Allow a minimum visual splash delay of 200ms
    const timer = setTimeout(prepare, 200);
    return () => {
      clearTimeout(timer);
      clearTimeout(failsafeTimer);
    };
  }, []);

  // Notifee Foreground & Initial Notification Deep-Link Handler
  useEffect(() => {
    if (Platform.OS === 'web') return;
    try {
      const notifeeModule = require('@notifee/react-native');
      const notifee = notifeeModule?.default || notifeeModule;
      if (!notifee || typeof notifee.getInitialNotification !== 'function') return;
      
      // Handle Initial Notification on App Launch (Tapped while app was killed)
      notifee.getInitialNotification().then((initialNotification: any) => {
        if (initialNotification) {
          const data = initialNotification.notification?.data;
          console.log('[Notifee Initial Notification Tapped]', data);
          if (data?.conversationId) {
            router.push({ pathname: '/chat-room', params: { conversationId: data.conversationId, receiverId: data.senderId } });
          } else if (data?.jobId) {
            router.push('/jobs');
          } else if (data?.workspaceId) {
            router.push('/labours');
          }
        }
      }).catch(() => {});

      // Handle Foreground Notification Events (Tapped while app is active)
      const unsubscribe = notifee.onForegroundEvent(({ type, detail }: any) => {
        const data = detail.notification?.data;
        const pressAction = detail.pressAction;

        console.log(`[Notifee Foreground Event] Type: ${type} | Action: ${pressAction?.id}`);

        if (pressAction?.id === 'default' || type === 1) { // EventType.PRESS
          if (data?.conversationId) {
            router.push({ pathname: '/chat-room', params: { conversationId: data.conversationId, receiverId: data.senderId } });
          } else if (data?.jobId) {
            router.push('/jobs');
          } else if (data?.workspaceId) {
            router.push('/labours');
          }
        }
      });

      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    } catch (e) {
      // Notifee native module not available in current environment (e.g. Expo Go)
    }
  }, []);

  if (stage === 'splash') {
    console.log('[BOOT] [Step 19a] stage is splash. Rendering null (native splash active)...');
    return null; // Let the native splash screen show
  }

  console.log('[BOOT] [Step 19b] stage is ready. Rendering context providers & router Stack...');

  const currentSegment = segments[0];
  const currentUser = getCurrentUser();
  const showAIAssistant = false; // Hidden for now: currentUser && currentSegment && currentSegment !== 'login' && currentSegment !== 'signup' && currentSegment !== 'choose-language' && currentSegment !== 'index';

  return (
    <I18nProvider>
      <UnreadMessageProvider>
        <UnreadActivityProvider>
          <CallProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <View style={{ flex: 1 }}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="choose-language" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="portfolio-highlights" options={{ headerShown: false }} />
            <Stack.Screen name="architect-profile" options={{ headerShown: false }} />
            <Stack.Screen name="contractor-profile" options={{ headerShown: false }} />
            <Stack.Screen name="chat-room" options={{ headerShown: false }} />
            <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
            <Stack.Screen name="architects" options={{ headerShown: false }} />
            <Stack.Screen name="architect-detail" options={{ headerShown: false }} />
            <Stack.Screen name="design-detail" options={{ headerShown: false }} />
            <Stack.Screen name="contractors" options={{ headerShown: false }} />
            <Stack.Screen name="contractor-detail" options={{ headerShown: false }} />
            <Stack.Screen name="labour-detail" options={{ headerShown: false }} />
            <Stack.Screen name="labours" options={{ headerShown: false }} />
            <Stack.Screen name="book-worker" options={{ headerShown: false }} />
            <Stack.Screen name="booking-flow" options={{ headerShown: false }} />
            <Stack.Screen name="project-detail" options={{ headerShown: false }} />
            <Stack.Screen name="project-applications" options={{ headerShown: false }} />
            <Stack.Screen name="project-compare" options={{ headerShown: false }} />
            <Stack.Screen name="project-progress" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="about" options={{ headerShown: false }} />
            <Stack.Screen name="contact" options={{ headerShown: false }} />
            <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
            <Stack.Screen name="terms" options={{ headerShown: false }} />
            <Stack.Screen name="jobs" options={{ headerShown: false, title: 'Opportunity' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />

          {/* AI Floating Assistant */}
          {showAIAssistant && (
            <AIAssistantFloatingButton
              userRole={currentUser?.role || 'Client'}
              userName={currentUser?.fullName || 'User'}
              userId={currentUser?._id}
            />
          )}

          {/* Real-time Worker Incoming Job Request Modal */}
          <IncomingJobModal
            currentUserId={currentUser?._id}
            currentUserRole={currentUser?.role}
          />

          {/* Loading Spinner Overlay */}
          {stage === 'ready' && checkingLocation && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', zIndex: 99999 }]}>
              <ActivityIndicator size="large" color="#16A34A" />
              <Text style={{ marginTop: 12, fontSize: 14, color: '#6B7280', fontWeight: '500' }}>Verifying location services...</Text>
            </View>
          )}

          {/* Location Permission Blocking Overlay */}
          {stage === 'ready' && locationPermissionGranted === false && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 99999 }]}>
              <View style={styles.permissionContainer}>
                <View style={styles.permissionCard}>
                  <View style={styles.iconCircle}>
                    <Feather name="map-pin" size={38} color="#16A34A" />
                  </View>
                  <Text style={styles.permissionTitle}>Location Access Required</Text>
                  <Text style={styles.permissionDescription}>
                    Allver requires GPS location permissions to match you with relevant construction requests, design portfolios, and check-in services.
                  </Text>
                  <Text style={styles.permissionWarning}>
                    Please enable location services in your system settings to use the Allver platform.
                  </Text>
                  
                  <TouchableOpacity style={styles.permissionBtn} activeOpacity={0.8} onPress={() => checkLocationPermission(true)}>
                    <Text style={styles.permissionBtnText}>Enable Location</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.8} onPress={() => Linking.openSettings()}>
                    <Text style={styles.settingsBtnText}>Open Settings</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}



              </View>
            </ThemeProvider>
          </CallProvider>
        </UnreadActivityProvider>
      </UnreadMessageProvider>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  permissionContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8FBF3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  permissionWarning: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  permissionBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#16A34A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  settingsBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  settingsBtnText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
});

