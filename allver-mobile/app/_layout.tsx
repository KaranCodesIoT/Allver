import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useSegments, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Linking, ActivityIndicator, AppState, Platform, Alert, Modal, Animated, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { BACKEND_URL } from '@/constants/Config';
import { I18nProvider } from '../utils/i18n';
import { getStoredUser, getStoredLanguage, getToken, removeToken, removeStoredUser, saveStoredUser } from '@/constants/Auth';
import { UnreadMessageProvider } from '../context/UnreadMessageContext';
import { UnreadActivityProvider } from '../context/UnreadActivityContext';

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

  // Incoming video call state
  const [incomingVideoCall, setIncomingVideoCall] = useState<{
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar: string;
  } | null>(null);
  const incomingCallTimeoutRef = useRef<any>(null);
  const ringPulseAnim = useRef(new Animated.Value(1)).current;
  const ringtoneSoundRef = useRef<Audio.Sound | null>(null);

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

  const stopRingtone = async () => {
    try {
      if (ringtoneSoundRef.current) {
        await ringtoneSoundRef.current.stopAsync();
        await ringtoneSoundRef.current.unloadAsync();
        ringtoneSoundRef.current = null;
      }
    } catch (e) {}
  };

  const handleAcceptVideoCall = useCallback(() => {
    if (!incomingVideoCall) return;
    const callData = { ...incomingVideoCall };
    
    if (incomingCallTimeoutRef.current) clearTimeout(incomingCallTimeoutRef.current);
    setIncomingVideoCall(null);
    stopRingtone();

    router.push({
      pathname: '/video-call',
      params: {
        receiverId: callData.callerId,
        receiverName: callData.callerName,
        receiverAvatar: callData.callerAvatar,
        callType: 'incoming',
        callId: callData.callId,
        callerId: callData.callerId,
      },
    });
  }, [incomingVideoCall, router]);

  const handleDeclineVideoCall = useCallback(() => {
    if (!incomingVideoCall) return;
    
    if (incomingCallTimeoutRef.current) clearTimeout(incomingCallTimeoutRef.current);

    import('@/utils/SocketService')
      .then(({ default: SocketService }) => {
        const user = getCurrentUser();
        SocketService.emit('reject_video_call', {
          callId: incomingVideoCall.callId,
          callerId: incomingVideoCall.callerId,
          receiverId: user?._id,
        });
      });

    setIncomingVideoCall(null);
    stopRingtone();
  }, [incomingVideoCall]);

  // Pulse animation for incoming call
  useEffect(() => {
    if (incomingVideoCall) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(ringPulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(ringPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [incomingVideoCall]);

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

    const user = getCurrentUser();
    if (!user || !user._id) {
      import('@/utils/SocketService')
        .then(({ default: SocketService }) => {
          SocketService.disconnect();
        })
        .catch(err => console.log('[RootLayout] Socket disconnect error:', err));
      return;
    }

    // Initialize/re-verify global socket connection + incoming video call listener
    import('@/utils/SocketService')
      .then(({ default: SocketService }) => {
        SocketService.initialize(user._id);

        // Listen for incoming video calls globally
        const handleIncomingVideoCall = (data: any) => {
          console.log('[RootLayout] Incoming video call from:', data.callerName);
          setIncomingVideoCall({
            callId: data.callId,
            callerId: data.callerId,
            callerName: data.callerName,
            callerAvatar: data.callerAvatar,
          });

          // Play ringtone
          Audio.Sound.createAsync(
            require('../assets/sounds/ringtone.mp3'),
            { shouldPlay: true, isLooping: true }
          ).then(({ sound }) => {
            ringtoneSoundRef.current = sound;
          }).catch(() => {
            // Fallback: no ringtone asset, just vibrate
          });

          // Auto-timeout after 30 seconds (missed call)
          if (incomingCallTimeoutRef.current) clearTimeout(incomingCallTimeoutRef.current);
          incomingCallTimeoutRef.current = setTimeout(() => {
            SocketService.emit('video_call_missed', {
              callId: data.callId,
              callerId: data.callerId,
              receiverId: user._id,
            });
            setIncomingVideoCall(null);
            stopRingtone();
          }, 30000);
        };

        SocketService.on('incoming_video_call', handleIncomingVideoCall);
      })
      .catch(err => console.error('[RootLayout] SocketService import error:', err));

    // Background validation of session (non-blocking)
    const validateSession = async () => {
      const token = await getToken();
      if (token && user._id) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/user/${user._id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
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
            (global as any).currentPushToken = token;
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
    const prepare = async () => {
      try {
        // Load stored language asynchronously before hiding splash screen
        const storedLanguage = await getStoredLanguage();
        if (storedLanguage) {
          (global as any).localLanguage = storedLanguage;
          console.log('[RootLayout] Loaded stored language:', storedLanguage);
        }

        // Load stored user asynchronously before hiding splash screen
        const storedUserStr = await getStoredUser();
        if (storedUserStr) {
          (global as any).currentUser = JSON.parse(storedUserStr);
          console.log('[RootLayout] Loaded stored user session:', (global as any).currentUser?.fullName);
        }
      } catch (error) {
        console.error('[RootLayout] Failed to load stored user session or language:', error);
      } finally {
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          console.warn(e);
        }
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

  return (
    <I18nProvider>
      <UnreadMessageProvider>
        <UnreadActivityProvider>
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
            <Stack.Screen name="project-detail" options={{ headerShown: false }} />
            <Stack.Screen name="project-applications" options={{ headerShown: false }} />
            <Stack.Screen name="project-compare" options={{ headerShown: false }} />
            <Stack.Screen name="project-progress" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="jobs" options={{ headerShown: false, title: 'Opportunity' }} />
            <Stack.Screen name="video-call" options={{ headerShown: false, animation: 'fade' }} />
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

          {/* ===== INCOMING VIDEO CALL OVERLAY ===== */}
          <Modal
            visible={!!incomingVideoCall}
            animationType="fade"
            transparent={false}
            onRequestClose={() => handleDeclineVideoCall()}
          >
            <View style={styles.incomingCallContainer}>
              <View style={styles.incomingCallBg} />

              {/* Encryption badge */}
              <View style={styles.incomingCallEncrypted}>
                <Feather name="shield" size={12} color="rgba(255,255,255,0.5)" />
                <Text style={styles.incomingCallEncryptedText}>End-To-End Encrypted</Text>
              </View>

              {/* Caller info */}
              <View style={styles.incomingCallProfile}>
                <View style={styles.incomingCallAvatarContainer}>
                  <Animated.View style={[styles.incomingCallPulse, { transform: [{ scale: ringPulseAnim }] }]} />
                  <Animated.View style={[styles.incomingCallPulseOuter, { transform: [{ scale: ringPulseAnim }], opacity: 0.3 }]} />
                  <Image
                    source={{ uri: incomingVideoCall?.callerAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200' }}
                    style={styles.incomingCallAvatar}
                  />
                </View>
                <Text style={styles.incomingCallName}>{incomingVideoCall?.callerName || 'Unknown'}</Text>
                <Text style={styles.incomingCallLabel}>Incoming Video Call</Text>
              </View>

              {/* Action buttons */}
              <View style={styles.incomingCallActions}>
                <View style={styles.incomingCallBtnContainer}>
                  <TouchableOpacity
                    style={[styles.incomingCallBtnCircle, styles.incomingDeclineBtn]}
                    onPress={() => handleDeclineVideoCall()}
                    activeOpacity={0.8}
                  >
                    <Feather name="phone-off" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.incomingCallBtnLabel}>Decline</Text>
                </View>

                <View style={styles.incomingCallBtnContainer}>
                  <TouchableOpacity
                    style={[styles.incomingCallBtnCircle, styles.incomingAcceptBtn]}
                    onPress={() => handleAcceptVideoCall()}
                    activeOpacity={0.8}
                  >
                    <Feather name="video" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.incomingCallBtnLabel}>Accept</Text>
                </View>
              </View>
            </View>
          </Modal>

        </View>
      </ThemeProvider>
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

  // Incoming Video Call Overlay
  incomingCallContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incomingCallBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
  },
  incomingCallEncrypted: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  incomingCallEncryptedText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  incomingCallProfile: {
    alignItems: 'center',
  },
  incomingCallAvatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  incomingCallPulse: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: '#22C55E',
  },
  incomingCallPulseOuter: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  incomingCallAvatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  incomingCallName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  incomingCallLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  incomingCallActions: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 60,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 60,
    width: '100%',
  },
  incomingCallBtnContainer: {
    alignItems: 'center',
    gap: 8,
  },
  incomingCallBtnCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  incomingDeclineBtn: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  incomingAcceptBtn: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
  },
  incomingCallBtnLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
});

