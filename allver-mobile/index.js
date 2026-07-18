import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import { Platform } from 'react-native';

// Register FCM background message handler BEFORE React tree initializes.
// This requires @react-native-firebase/messaging which is only available
// in custom dev builds (EAS Build / prebuild), NOT in Expo Go.
if (Platform.OS !== 'web') {
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('[FCM Background] Received background wakeup data message:', remoteMessage);
      if (remoteMessage.data && remoteMessage.data.category === 'voice_call') {
        const data = remoteMessage.data;
        const callUUID = data.callUUID || `call_${data.callerId}_${Date.now()}`;

        try {
          const CallKeepManager = require('./utils/CallKeepService').default;
          await CallKeepManager.setupCallKeep();
          CallKeepManager.displayIncomingCall(callUUID, data.callerName, data.callerName, data);
          console.log('[FCM Background] CallKeep displayIncomingCall triggered successfully.');
        } catch (err) {
          console.error('[FCM Background] Error displaying CallKeep UI:', err);
        }
      }
    });
    console.log('[FCM] Background message handler registered successfully.');
  } catch (e) {
    // @react-native-firebase not available (Expo Go). Voice call wakeup
    // will fall back to Socket.IO while developing in Expo Go.
    console.log('[FCM] @react-native-firebase not available (Expo Go). Background call handler skipped.');
  }
}

// Export the main component booting expo-router context
export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
