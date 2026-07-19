import { Tabs, router } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Platform, View, Text, TouchableOpacity, AppState, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../../utils/i18n';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { BACKEND_URL } from '../../constants/Config';
import { getToken, saveStoredUser, removeToken, removeStoredUser } from '../../constants/Auth';
import CallKeepService from '../../utils/CallKeepService';

const COLORS = {
  green: '#16A34A',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
};

const CustomPostButton = ({ onPress, accessibilityState, style, label }: any) => {
  const isFocused = accessibilityState?.selected;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[style, { overflow: 'visible', justifyContent: 'center', alignItems: 'center' }]}
    >
      <View style={{
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#FBBF24', // Lighter Yellow/Gold matching the mockup
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        position: 'absolute',
        top: -14, // Elevate above the tab bar top border
        ...Platform.select({
          ios: {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
          },
          android: {
            elevation: 4,
          },
          web: {
            boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.16)',
          }
        }),
      }}>
        <Feather name="plus" size={24} color="#FFFFFF" />
      </View>
      <Text 
        numberOfLines={1}
        adjustsFontSizeToFit={true}
        minimumFontScale={0.8}
        style={{
          fontSize: 10,
          fontWeight: '600',
          color: isFocused ? COLORS.green : COLORS.textMuted,
          position: 'absolute',
          bottom: 2, // Horizontally align with default tab labels
          textAlign: 'center',
          width: 85,
        }}
      >
        {label || 'Post Project'}
      </Text>
    </TouchableOpacity>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  const [userRole, setUserRole] = useState<string>('');
  const responseListener = useRef<any>();

  useEffect(() => {
    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try { user = JSON.parse(stored); } catch (e) {}
      }
    }
    if (user?.role) {
      setUserRole(user.role);
    }
  }, []);

  // POC: Listen to CallIntent actions from our custom native IncomingCallActivity
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const checkCallIntent = async () => {
      try {
        const IncomingCallService = require('../../utils/IncomingCallService').default;
        const pendingCall = await IncomingCallService.getPendingCallAction();
        if (pendingCall) {
          console.log('[POC] Detected pending call intent action:', pendingCall);
          const { action, callId, callerName } = pendingCall;
          if (action === 'accept_call') {
            Alert.alert(
              '📞 Call Accepted (POC)',
              `Successfully caught Accept event!\nCallID: ${callId}\nCaller: ${callerName || 'Unknown'}`
            );
          } else if (action === 'decline_call') {
            Alert.alert(
              '❌ Call Declined (POC)',
              `Successfully caught Decline event!\nCallID: ${callId}`
            );
          }
        }
      } catch (err) {
        console.error('[POC Error] Error checking call intent:', err);
      }
    };

    // Check on initial load
    checkCallIntent();

    // Check again when the app comes back to the foreground
    const subscription = AppState.addEventListener('change', (nextAppState: string) => {
      if (nextAppState === 'active') {
        checkCallIntent();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    console.log('[BOOT] [TabLayout] mounted. Initializing authenticated services...');

    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try { user = JSON.parse(stored); } catch (e) {}
      }
    }

    if (!user || !user._id) {
      console.log('[BOOT] [TabLayout Warning] No authenticated user found during TabLayout initialization.');
      return;
    }

    const userId = user._id;

    // 1. Initialize CallKeep (temporarily disabled to isolate navigation freeze)
    /*
    if (Platform.OS !== 'web') {
      console.log('[BOOT] [TabLayout] Calling CallKeepService.setupCallKeep()...');
      CallKeepService.setupCallKeep()
        .then((res) => console.log('[BOOT] [TabLayout] CallKeepService.setupCallKeep() completed. Native module active:', res))
        .catch(err => console.error('[BOOT] [TabLayout Error] CallKeep setup error:', err));
    }
    */
    console.log('[BOOT] [TabLayout] CallKeep setup bypassed.');

    // 2. Initialize Socket.IO connection
    console.log('[BOOT] [TabLayout] Importing SocketService...');
    import('../../utils/SocketService')
      .then(({ default: SocketService }) => {
        console.log('[BOOT] [TabLayout] SocketService imported. Initializing for user:', userId);
        SocketService.initialize(userId);
        console.log('[BOOT] [TabLayout] SocketService.initialize() finished.');
      })
      .catch(err => console.error('[BOOT] [TabLayout Error] SocketService import error:', err));

    // 3. Background validation of session (non-blocking)
    const validateSession = async () => {
      console.log('[BOOT] [TabLayout] validateSession: getting token...');
      const token = await getToken();
      console.log('[BOOT] [TabLayout] validateSession: token retrieved:', token ? 'Found' : 'Null');
      if (token && userId) {
        try {
          console.log('[BOOT] [TabLayout] validateSession: fetching user profile from backend...');
          const res = await fetch(`${BACKEND_URL}/api/user/${userId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          console.log('[BOOT] [TabLayout] validateSession: backend response status:', res.status);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              console.log('[BOOT] [TabLayout] validateSession: user data fresh, saving to storage...');
              await saveStoredUser(data.user);
              (global as any).currentUser = data.user;
              console.log('[BOOT] [TabLayout] validateSession: user data saved.');
            }
          } else if (res.status === 404 || res.status === 401) {
            console.log('[BOOT] [TabLayout] validateSession: Session validation failed (unauthorized). Logging out...');
            await removeToken();
            await removeStoredUser();
            (global as any).currentUser = null;
            import('../../utils/SocketService').then(({ default: s }) => s.disconnect());
            router.replace('/login');
          }
        } catch (err) {
          console.warn('[BOOT] [TabLayout Warning] Background session validation failed (offline fallback):', err);
        }
      }
    };
    validateSession();

    // 4. Setup Push Notifications
    const setupPush = async () => {
      console.log('[BOOT] [TabLayout] setupPush starting...');
      try {
        let token;
        if (Platform.OS === 'android') {
          console.log('[BOOT] [TabLayout] Configuring default notification channel...');
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
          console.log('[BOOT] [TabLayout] Default notification channel configured.');
        }

        if (Constants.executionEnvironment === 'storeClient') {
          console.log('[BOOT] [TabLayout] Skipping push token setup inside Expo Go.');
          return;
        }

        if (Device.isDevice) {
          console.log('[BOOT] [TabLayout] Requesting notification permissions...');
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          if (existingStatus !== 'granted') {
            console.log('[BOOT] [TabLayout] Requesting foreground permissions...');
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          console.log('[BOOT] [TabLayout] Notification permissions status:', finalStatus);
          if (finalStatus !== 'granted') {
            console.log('[BOOT] [TabLayout Warning] Push notification permissions denied.');
            return;
          }

          // A. Expo Push Token Setup (Wrapped in try-catch so failures don't block FCM Setup)
          try {
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId ?? "b344fb16-eb64-4279-8dc7-88dcd752db27";
            console.log('[BOOT] [TabLayout] Requesting Expo Push Token with ProjectId:', projectId);
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            console.log('[BOOT] [TabLayout] Retrieved Expo Push Token:', token);

            // Send token securely to the backend
            const payload = { userId, token };
            console.log('[BOOT] [TabLayout] POST /api/user/push-token payload:', JSON.stringify(payload));
            const response = await fetch(`${BACKEND_URL}/api/user/push-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            const responseText = await response.text();
            console.log('[BOOT] [TabLayout] Backend Expo push-token response status:', response.status, 'body:', responseText);
            if (response.ok) {
              console.log('[BOOT] [TabLayout] Registered push token with backend.');
              (global as any).currentPushToken = token;
            } else {
              console.warn('[BOOT] [TabLayout Warning] Backend push token registration failed.');
            }
          } catch (expoPushErr) {
            console.warn('[BOOT] [TabLayout Warning] Expo push token registration failed (skipping to FCM):', expoPushErr);
          }

          // Direct FCM Token Setup
          try {
            console.log('[BOOT] [TabLayout] Requiring firebase messaging module...');
            const messaging = require('@react-native-firebase/messaging').default;
            console.log('[BOOT] [TabLayout] Fetching FCM token...');
            const fcmToken = await messaging().getToken();
            console.log('[BOOT] [TabLayout] Retrieved FCM Token:', fcmToken);
            
            const fcmPayload = { userId, token: fcmToken };
            console.log('[BOOT] [TabLayout] POST /api/user/fcm-token payload:', JSON.stringify(fcmPayload));
            const fcmResponse = await fetch(`${BACKEND_URL}/api/user/fcm-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fcmPayload)
            });
            const fcmResponseText = await fcmResponse.text();
            console.log('[BOOT] [TabLayout] Backend FCM fcm-token response status:', fcmResponse.status, 'body:', fcmResponseText);
            if (fcmResponse.ok) {
              console.log('[BOOT] [TabLayout] Registered FCM token with backend.');
              (global as any).currentFcmToken = fcmToken;
            } else {
              console.warn('[BOOT] [TabLayout Warning] Backend FCM token registration failed.');
            }
          } catch (fcmErr) {
            console.error('[BOOT] [TabLayout Error] Error retrieving/registering FCM Token:', fcmErr);
          }
        } else {
          console.log('[BOOT] [TabLayout Warning] Physical device not detected, skipping push token lookup.');
        }
      } catch (err) {
        console.error('[BOOT] [TabLayout Error] Error setting up notifications:', err);
      }
    };

    setupPush();

    // 5. Handle Responding to notifications (terminated, background, or foreground states)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data || {};
      console.log('[Push Notification] Notification tapped by user:', data);

      // Reset badge count on notification tap
      Notifications.setBadgeCountAsync(0).catch(err => console.log('Error resetting badge:', err));

      const category = data.category || '';
      if (category === 'voice_call' || (data.text && data.text.includes('voice call'))) {
        console.log('[Push Notification] Tapped incoming voice call notification. Launching call screen...');
        router.push({
          pathname: '/chat-room',
          params: {
            receiverId: data.senderId,
            conversationId: data.conversationId,
            name: data.senderName || 'Voice Call',
            avatar: data.senderAvatar || '',
            autoAcceptCall: 'true'
          }
        });
      } else if (category === 'messages' || data.conversationId) {
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

    // 6. Monitor AppState for active socket verification
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[BOOT] [TabLayout] App active. Verifying socket connection...');
        import('../../utils/SocketService')
          .then(({ default: SocketService }) => {
            SocketService.initialize(userId);
          })
          .catch(e => console.error(e));
      }
    });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
      subscription.remove();
      console.log('[BOOT] [TabLayout] unmounted. Cleaning up listeners.');
    };
  }, []);

  const postLabel = userRole === 'Labour' ? t('addWork') : userRole === 'Client' ? 'Post Contract' : t('postProject');

  // Calculate dynamic bottom padding and height based on system safe area bottom insets
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  const tabHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.green,
        tabBarInactiveTintColor: COLORS.textMuted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          paddingHorizontal: 2,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: t('discover'),
          tabBarIcon: ({ color }) => <Feather name="compass" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="post-project"
        options={{
          title: postLabel,
          tabBarButton: (props) => <CustomPostButton {...props} label={postLabel} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('explore'),
          tabBarIcon: ({ color }) => <Feather name="globe" size={22} color={color} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="design"
        options={{
          title: t('design'),
          tabBarIcon: ({ color }) => <FontAwesome5 name="pencil-ruler" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: t('chats'),
          tabBarIcon: ({ color }) => <FontAwesome5 name="comment-dots" size={22} color={color} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
