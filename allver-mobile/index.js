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
    // 4. Register Notifee Background Event Handler for Inline Reply & Action Buttons
    try {
      const notifeeModule = require('@notifee/react-native');
      const notifee = notifeeModule?.default || notifeeModule;
      if (notifee && typeof notifee.onBackgroundEvent === 'function') {
        const NotifeeNotificationService = require('./utils/NotifeeNotificationService').default;
        const { BACKEND_URL } = require('./constants/Config');

      notifee.onBackgroundEvent(async ({ type, detail }) => {
        const { notification, pressAction, input } = detail;
        const data = notification?.data;

        console.log(`[Notifee Background Event] Action ID: ${pressAction?.id} | Input: ${input}`);

        if (pressAction?.id === 'reply' && input && data?.conversationId) {
          const conversationId = data.conversationId;
          const senderId = data.senderId;

          try {
            console.log(`[Inline Reply] Sending message to conversation ${conversationId}: ${input}`);
            await fetch(`${BACKEND_URL}/api/conversations/${conversationId}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                senderId: senderId || 'current_user',
                text: input,
              }),
            });

            // Update thread notification locally with sent message
            await NotifeeNotificationService.displayChatMessagingNotification({
              conversationId,
              senderId: 'user_me',
              senderName: 'You',
              text: input,
              timestamp: Date.now(),
            });
          } catch (err) {
            console.error('[Inline Reply Error]', err);
          }
        } else if (pressAction?.id === 'mark_read' && data?.conversationId) {
          const conversationId = data.conversationId;
          try {
            console.log(`[Notifee Background] Marking conversation ${conversationId} as read`);
            await fetch(`${BACKEND_URL}/api/conversations/${conversationId}/read`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: data.senderId }),
            });
            await NotifeeNotificationService.clearConversationNotification(conversationId);
          } catch (err) {
            console.error('[Mark Read Error]', err);
          }
        } else if (pressAction?.id === 'decline_call' || pressAction?.id === 'accept_call') {
          if (notification?.id) {
            await notifee.cancelNotification(notification.id);
          }
        }
      });
      }

      // FCM Background Message Handler with Rich Notifee Dispatch
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log('[FCM Background] Received background payload:', remoteMessage);
        const data = remoteMessage.data || {};
        const category = data.category || data.type;

        if (category === 'chat' || category === 'chat_message') {
          await NotifeeNotificationService.displayChatMessagingNotification({
            conversationId: data.conversationId || data.roomId,
            senderId: data.senderId,
            senderName: data.senderName || 'Sender',
            senderAvatar: data.senderAvatar,
            text: data.text || data.body || remoteMessage.notification?.body || '',
            unreadCount: data.unreadCount ? parseInt(data.unreadCount, 10) : 1,
          });
        } else if (category === 'voice_call') {
          const callId = data.callId || `call_${data.callerId}_${Date.now()}`;
          const callerName = data.callerName || 'Someone';

          await NotifeeNotificationService.displayCallNotification({
            callId,
            callerId: data.callerId,
            callerName,
            callerAvatar: data.callerAvatar,
          });
        } else if (category === 'job_invite') {
          await NotifeeNotificationService.displayJobInviteNotification({
            jobId: data.jobId,
            jobTitle: data.jobTitle || 'New Job Invitation',
            clientName: data.clientName || 'Client',
            salaryText: data.salaryText,
          });
        } else if (category === 'payment') {
          await NotifeeNotificationService.displayPaymentNotification({
            paymentId: data.paymentId,
            amount: parseFloat(data.amount) || 0,
            projectTitle: data.projectTitle || 'Project',
          });
        }
      });
      logStep('Step 4', 'FCM & Notifee Background message handlers registered successfully.');
    } catch (notifErr) {
      logStep('Notifee Setup Info', `Notifee or Firebase background handling skipped in current build: ${notifErr?.message}`);
    }
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
