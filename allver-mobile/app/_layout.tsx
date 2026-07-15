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
import AIAssistantFloatingButton from '../components/AIAssistantFloatingButton';

// Ignore specific warning logs in Expo Go / Development
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Notifications.removeNotificationSubscription',
]);



// Keep the splash screen visible until we hide it
SplashScreen.preventAutoHideAsync().catch(() => {});

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const activeChatRoomId = (global as any).activeChatRoomId;
    const incomingConvoId = notification.request.content.data?.conversationId;
    // Suppress push alerts only if the user is actively viewing the same chat room
    if (activeChatRoomId && incomingConvoId && activeChatRoomId === incomingConvoId) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export default function RootLayout() {
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
  }, [stage, segments]);

  const responseListener = useRef<any>();

  useEffect(() => {
    if (stage !== 'ready') return;
    console.log('[RootLayout] [Checkpoint J] stage is ready. Starting post-ready initializations.');

    const user = getCurrentUser();
    if (!user || !user._id) {
      console.log('[RootLayout] [Checkpoint K] No logged in user session. Ensuring socket is disconnected.');
      import('@/utils/SocketService')
        .then(({ default: SocketService }) => {
          SocketService.disconnect();
          console.log('[RootLayout] [Checkpoint L] Socket disconnected successfully.');
        })
        .catch(err => console.log('[RootLayout] [Checkpoint Error] Socket disconnect error:', err));
      return;
    }

    // Initialize/re-verify global socket connection
    console.log('[RootLayout] [Checkpoint K] Found active user session. Loading SocketService...');
    import('@/utils/SocketService')
      .then(({ default: SocketService }) => {
        console.log('[RootLayout] [Checkpoint L] SocketService imported. Initializing...');
        SocketService.initialize(user._id);
        console.log('[RootLayout] [Checkpoint M] SocketService initialization command sent.');
      })
      .catch(err => console.error('[RootLayout] [Checkpoint Error] SocketService import error:', err));

    // Background validation of session (non-blocking)
    const validateSession = async () => {
      const token = await getToken();
      if (token && user._id) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/user/${user._id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              await saveStoredUser(data.user);
              (global as any).currentUser = data.user;
            }
          } else if (res.status === 404 || res.status === 401) {
            console.log('[RootLayout] Session validation failed on background check. Logging out...');
            await removeToken();
            await removeStoredUser();
            (global as any).currentUser = null;
            import('@/utils/SocketService').then(({ default: s }) => s.disconnect());
            router.replace('/login');
          }
        } catch (err) {
          console.warn('[RootLayout] Background session validation failed (offline fallback):', err);
        }
      }
    };
    validateSession();

    // 1. Setup Push Notifications
    const setupPush = async () => {
      console.log('[RootLayout] [Checkpoint N] setupPush executing.');
      try {
        let token;
        if (Platform.OS === 'android') {
          console.log('[RootLayout] [Checkpoint O] Configuring default notification channel...');
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
          console.log('[RootLayout] [Checkpoint P] Default notification channel configured.');
        }

        if (Constants.executionEnvironment === 'storeClient') {
          console.log('[RootLayout] [Checkpoint Q] Skipping push token setup inside Expo Go (not supported in SDK 53)');
          return;
        }

        if (Device.isDevice) {
          console.log('[RootLayout] [Checkpoint R] Physical device detected. Requesting/checking permissions...');
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          if (finalStatus !== 'granted') {
            console.log('[RootLayout] [Checkpoint S] Failed to get permission for push notifications');
            return;
          }
          console.log('[RootLayout] [Checkpoint S] Push notification permissions granted.');

          const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
          console.log('[RootLayout] [Checkpoint T] Requesting Expo Push Token with ProjectId:', projectId);
          token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
          console.log('[RootLayout] [Checkpoint U] Retrieved Expo Push Token:', token);

          // Send token securely to the backend
          console.log('[RootLayout] [Checkpoint V] Sending push token to backend...');
          const response = await fetch(`${BACKEND_URL}/api/user/push-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user._id, token })
          });

          if (response.ok) {
            console.log('[RootLayout] [Checkpoint W] Registered push token with backend successfully.');
            (global as any).currentPushToken = token;
          } else {
            console.warn('[RootLayout] [Checkpoint W-Warning] Backend push token registration failed:', await response.text());
          }
        } else {
          console.log('[RootLayout] [Checkpoint R] Must use a physical device for push notifications (Simulator/Emulator detected).');
        }
      } catch (err) {
        console.error('[RootLayout] [Checkpoint Error] Error setting up notifications:', err);
      }
    };

    setupPush();

    // 2. Handle Responding to notifications (terminated, background, or foreground states)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data || {};
      console.log('[Push Notification] Notification tapped by user:', data);

      // Reset badge count on notification tap
      Notifications.setBadgeCountAsync(0).catch(err => console.log('Error resetting badge:', err));

      const category = data.category || '';
      if (category === 'messages' || data.conversationId) {
        router.push({
          pathname: '/chat-room',
          params: {
            receiverId: data.senderId,
            conversationId: data.conversationId,
            name: data.senderName || 'Chat',
            avatar: data.senderAvatar || ''
          }
        });
      } else if (category === 'contracts' || category === 'payments' || category === 'attendance' || data.workspaceId) {
        router.push({
          pathname: '/project-progress',
          params: { workspaceId: data.workspaceId }
        });
      } else if (category === 'projectUpdates' || data.projectId) {
        router.push({
          pathname: '/project-detail',
          params: { id: data.projectId }
        });
      } else if (data.senderId) {
        router.push({
          pathname: '/architect-detail',
          params: { id: data.senderId }
        });
      } else {
        router.push('/notifications');
      }
    });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [stage, segments]);

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
    console.log('[RootLayout] [Checkpoint A] prepare Effect triggered.');
    const prepare = async () => {
      console.log('[RootLayout] [Checkpoint B] prepare execution started.');
      try {
        // Load stored language asynchronously before hiding splash screen
        console.log('[RootLayout] [Checkpoint C] Querying stored language...');
        const storedLanguage = await getStoredLanguage();
        if (storedLanguage) {
          (global as any).localLanguage = storedLanguage;
          console.log('[RootLayout] [Checkpoint D] Loaded stored language:', storedLanguage);
        } else {
          console.log('[RootLayout] [Checkpoint D] No stored language found.');
        }

        // Load stored user asynchronously before hiding splash screen
        console.log('[RootLayout] [Checkpoint E] Querying stored user session...');
        const storedUserStr = await getStoredUser();
        if (storedUserStr) {
          (global as any).currentUser = JSON.parse(storedUserStr);
          console.log('[RootLayout] [Checkpoint F] Loaded stored user session:', (global as any).currentUser?.fullName);
        } else {
          console.log('[RootLayout] [Checkpoint F] No stored user session found.');
        }
      } catch (error) {
        console.error('[RootLayout] [Checkpoint Error] Failed to load stored user session or language:', error);
      } finally {
        try {
          console.log('[RootLayout] [Checkpoint G] Hiding native splash screen...');
          await SplashScreen.hideAsync();
          console.log('[RootLayout] [Checkpoint H] Native splash screen hidden successfully.');
        } catch (e) {
          console.warn('[RootLayout] [Checkpoint Warning] SplashScreen.hideAsync failed:', e);
        }
        console.log('[RootLayout] [Checkpoint I] Transitioning stage to ready.');
        setStage('ready');
      }
    };
    
    // Allow a minimum visual splash delay of 200ms
    const timer = setTimeout(prepare, 200);
    return () => clearTimeout(timer);
  }, []);

  if (stage === 'splash') {
    return null; // Let the native splash screen show
  }

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
            <Stack.Screen name="project-detail" options={{ headerShown: false }} />
            <Stack.Screen name="project-applications" options={{ headerShown: false }} />
            <Stack.Screen name="project-compare" options={{ headerShown: false }} />
            <Stack.Screen name="project-progress" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
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

