import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Linking, ActivityIndicator, AppState, Platform, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { BACKEND_URL } from '@/constants/Config';

// Keep the splash screen visible until we hide it
SplashScreen.preventAutoHideAsync().catch(() => {});

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // If the active chat room is set (user is viewing a conversation), do not show push notifications
    const activeChatRoomId = (global as any).activeChatRoomId;
    if (activeChatRoomId) {
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
  const [checkingLocation, setCheckingLocation] = useState(true);
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

      setCheckingLocation(true);
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
        setLocationPermissionGranted(false);
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

    const user = getCurrentUser();
    if (!user || !user._id) return;

    // 1. Setup Push Notifications
    const setupPush = async () => {
      try {
        let token;
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        if (Device.isDevice) {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          if (finalStatus !== 'granted') {
            console.log('[Push Notification] Failed to get permission for push notifications');
            return;
          }

          const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
          token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
          console.log('[Push Notification] Retrieved Expo Push Token:', token);

          // Send token securely to the backend
          const response = await fetch(`${BACKEND_URL}/api/user/push-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user._id, token })
          });

          if (response.ok) {
            console.log('[Push Notification] Registered push token with backend successfully.');
          } else {
            console.warn('[Push Notification] Backend push token registration failed:', await response.text());
          }
        } else {
          console.log('[Push Notification] Must use a physical device for push notifications');
        }
      } catch (err) {
        console.error('[Push Notification] Error setting up notifications:', err);
      }
    };

    setupPush();

    // 2. Handle Responding to notifications (terminated, background, or foreground states)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data || {};
      const text = data.text || '';
      console.log('[Push Notification] Notification tapped by user:', data);

      // Route the user to correct screen based on notification content
      if (text.includes('New Message') || text.includes('💬')) {
        router.push('/(tabs)/messages');
      } else if (text.includes('Project Invitation') || text.includes('📩')) {
        router.push('/(tabs)');
      } else if (text.includes('Team Invitation') || text.includes('💼')) {
        router.push('/(tabs)');
      } else if (text.includes('Applied') || text.includes('Application')) {
        router.push('/(tabs)');
      } else {
        router.push('/(tabs)');
      }
    });

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
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
    // Stage 1: Keep native splash screen visible for 500ms
    const splashTimer = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn(e);
      }
      setStage('ready');
    }, 500);

    return () => clearTimeout(splashTimer);
  }, []);

  if (stage === 'splash') {
    return null; // Let the native splash screen show
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
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
          <Stack.Screen name="project-detail" options={{ headerShown: false }} />
          <Stack.Screen name="project-applications" options={{ headerShown: false }} />
          <Stack.Screen name="project-compare" options={{ headerShown: false }} />
          <Stack.Screen name="project-progress" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />

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
