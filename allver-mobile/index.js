import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import { Platform } from 'react-native';

const logStep = (step, detail = '') => {
  console.log(`[BOOT] [${new Date().toISOString()}] ${step}: ${detail}`);
};

// Register global error handler
if (typeof ErrorUtils !== 'undefined') {
  const defaultHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    logStep('FATAL EXCEPTION', `isFatal=${isFatal} | ${error?.message || error}\nStack: ${error?.stack}`);
    if (defaultHandler) {
      defaultHandler(error, isFatal);
    }
  });
}

logStep('Step 1', 'index.js evaluation started');

// Register FCM background message handler BEFORE React tree initializes.
// This requires @react-native-firebase/messaging which is only available
// in custom dev builds (EAS Build / prebuild), NOT in Expo Go.
if (Platform.OS !== 'web') {
  try {
    logStep('Step 2', 'Importing @react-native-firebase/messaging...');
    const messaging = require('@react-native-firebase/messaging').default;
    logStep('Step 3', 'Registering background message handler...');
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('[FCM Background] Received background wakeup data message:', remoteMessage);
      if (remoteMessage.data && remoteMessage.data.category === 'voice_call') {
        const data = remoteMessage.data;
        const callId = data.callId || data.callUUID || `call_${data.callerId}_${Date.now()}`;
        const callerName = data.callerName || 'Someone';

        try {
          logStep('FCM Background Incoming Call', `Launching native fullscreen UI for call: ${callId}`);
          const IncomingCallService = require('./utils/IncomingCallService').default;
          IncomingCallService.showIncomingCall(callId, callerName);
        } catch (err) {
          console.error('[FCM Background] Error displaying native Fullscreen Intent UI, falling back to banner:', err);
          try {
            const Notifications = require('expo-notifications');
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `📞 Incoming Voice Call`,
                body: `${callerName} is calling you...`,
                data: data,
                sound: 'default',
                priority: 'high',
              },
              trigger: null, // deliver immediately
            });
            console.log('[FCM Background] Local notification scheduled successfully for incoming call fallback.');
          } catch (notifErr) {
            console.error('[FCM Background] Error scheduling local notification fallback:', notifErr);
          }
        }
      }
    });
    logStep('Step 4', 'FCM Background message handler registered successfully.');
  } catch (e) {
    // @react-native-firebase not available (Expo Go). Voice call wakeup
    // will fall back to Socket.IO while developing in Expo Go.
    logStep('Step 4 Fallback', `@react-native-firebase not available or failed: ${e?.message || e}`);
  }
}

// Export the main component booting expo-router context
export function App() {
  logStep('Step 5', 'App root component rendering start...');
  const ctx = require.context('./app');
  const root = <ExpoRoot context={ctx} />;
  logStep('Step 5', 'App root component rendering end.');
  return root;
}

logStep('Step 6', 'Registering root component...');
registerRootComponent(App);
logStep('Step 7', 'Root component registered.');
