import { Platform } from 'react-native';
import { BACKEND_URL } from '../constants/Config';

// Safely lazy-load Notifee to prevent crashes if running in unsupported web/dev runtime
let notifee: any = null;
let AndroidStyle: any = null;
let AndroidImportance: any = null;
let AndroidCategory: any = null;

if (Platform.OS !== 'web') {
  try {
    const notifeeModule = require('@notifee/react-native');
    notifee = notifeeModule?.default || notifeeModule;
    if (notifeeModule) {
      AndroidStyle = notifeeModule.AndroidStyle;
      AndroidImportance = notifeeModule.AndroidImportance;
      AndroidCategory = notifeeModule.AndroidCategory;
    }
  } catch (e) {
    // Notifee native module not available in current environment (e.g. Expo Go)
  }
}

// In-memory cache of conversation message history for WhatsApp-like MessagingStyle threads
const conversationMessageStore: Record<string, Array<{ text: string; timestamp: number; person?: any }>> = {};

export class NotifeeNotificationService {
  private static isInitialized = false;

  /**
   * Initialize Android Notification Channels with proper priority & vibration
   */
  public static async initChannels() {
    if (!notifee || Platform.OS !== 'android') return;
    if (this.isInitialized) return;

    try {
      // 1. Chat Messages Channel
      await notifee.createChannel({
        id: 'chat_messages',
        name: 'Chat Messages',
        description: 'Notifications for incoming direct messages and group chats',
        importance: AndroidImportance?.HIGH || 4,
        vibration: true,
        sound: 'default',
      });

      // 2. Voice Calls Channel
      await notifee.createChannel({
        id: 'voice_calls',
        name: 'Incoming Calls',
        description: 'High-priority ringtone notifications for incoming voice calls',
        importance: AndroidImportance?.HIGH || 4,
        vibration: true,
        sound: 'default',
      });

      // 3. Job Invitations Channel
      await notifee.createChannel({
        id: 'job_invitations',
        name: 'Job Invitations',
        description: 'Notifications for job offers and contractor invites',
        importance: AndroidImportance?.HIGH || 4,
        vibration: true,
        sound: 'default',
      });


      // 5. Payment Channel
      await notifee.createChannel({
        id: 'payments',
        name: 'Payment Alerts',
        description: 'Notifications for wages, payouts, and financial transactions',
        importance: AndroidImportance?.HIGH || 4,
        vibration: true,
        sound: 'default',
      });

      this.isInitialized = true;
      console.log('[NotifeeService] Android Notification Channels initialized successfully.');
    } catch (err) {
      console.error('[NotifeeService] Error initializing channels:', err);
    }
  }

  /**
   * Display a WhatsApp-like Grouped MessagingStyle Notification with Inline Reply
   */
  public static async displayChatMessagingNotification(data: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    text: string;
    timestamp?: number;
    unreadCount?: number;
  }) {
    if (!notifee) return;
    await this.initChannels();

    const { conversationId, senderId, senderName, senderAvatar, text, timestamp = Date.now() } = data;

    // Maintain thread history for conversation
    if (!conversationMessageStore[conversationId]) {
      conversationMessageStore[conversationId] = [];
    }

    const resolveAvatar = (url?: string) => {
      if (!url) return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop';
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const person = {
      name: senderName,
      icon: resolveAvatar(senderAvatar),
    };

    conversationMessageStore[conversationId].push({
      text,
      timestamp,
      person,
    });

    // Limit in-memory thread size to last 10 messages per chat
    if (conversationMessageStore[conversationId].length > 10) {
      conversationMessageStore[conversationId] = conversationMessageStore[conversationId].slice(-10);
    }

    const messages = conversationMessageStore[conversationId].map((m) => ({
      text: m.text,
      timestamp: m.timestamp,
      person: m.person,
    }));

    try {
      await notifee.displayNotification({
        id: `chat_${conversationId}`,
        title: senderName,
        body: text,
        data: {
          conversationId,
          senderId,
          senderName,
          category: 'chat',
        },
        android: {
          channelId: 'chat_messages',
          largeIcon: person.icon,
          groupId: `group_${conversationId}`,
          style: AndroidStyle
            ? {
                type: AndroidStyle.MESSAGING,
                person,
                messages,
              }
            : undefined,
          actions: [
            {
              title: 'REPLY',
              pressAction: { id: 'reply' },
              input: {
                placeholder: 'Type a message...',
              },
            },
            {
              title: 'MARK AS READ',
              pressAction: { id: 'mark_read' },
            },
          ],
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
        },
      });
      console.log(`[NotifeeService] Displayed MessagingStyle notification for chat ${conversationId}`);
    } catch (err) {
      console.error('[NotifeeService] Error displaying chat notification:', err);
    }
  }

  /**
   * Display High-Priority Call Notification with ACCEPT & DECLINE actions
   */
  public static async displayCallNotification(data: {
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar?: string;
  }) {
    if (!notifee) return;
    await this.initChannels();

    const { callId, callerId, callerName, callerAvatar } = data;
    const avatar = callerAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop';

    try {
      await notifee.displayNotification({
        id: `call_${callId}`,
        title: `📞 Incoming Call`,
        body: `${callerName} is calling you...`,
        data: {
          callId,
          callerId,
          callerName,
          category: 'voice_call',
        },
        android: {
          channelId: 'voice_calls',
          category: AndroidCategory?.CALL,
          importance: AndroidImportance?.HIGH,
          largeIcon: avatar,
          fullScreenAction: {
            id: 'default',
            launchActivity: 'default',
          },
          actions: [
            {
              title: 'DECLINE',
              pressAction: { id: 'decline_call' },
            },
            {
              title: 'ACCEPT',
              pressAction: { id: 'accept_call' },
            },
          ],
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
        },
      });
      console.log(`[NotifeeService] Displayed voice call notification for ${callId}`);
    } catch (err) {
      console.error('[NotifeeService] Error displaying call notification:', err);
    }
  }

  /**
   * Display Job Invitation Notification with ACCEPT & DECLINE actions
   */
  public static async displayJobInviteNotification(data: {
    jobId: string;
    jobTitle: string;
    clientName: string;
    salaryText?: string;
  }) {
    if (!notifee) return;
    await this.initChannels();

    const { jobId, jobTitle, clientName, salaryText } = data;

    try {
      await notifee.displayNotification({
        id: `job_${jobId}`,
        title: `💼 Job Offer: ${jobTitle}`,
        body: `${clientName} invited you for a project. ${salaryText || ''}`,
        data: {
          jobId,
          category: 'job_invite',
        },
        android: {
          channelId: 'job_invitations',
          actions: [
            {
              title: 'DECLINE',
              pressAction: { id: 'decline_job' },
            },
            {
              title: 'ACCEPT',
              pressAction: { id: 'accept_job' },
            },
          ],
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
        },
      });
    } catch (err) {
      console.error('[NotifeeService] Error displaying job invitation:', err);
    }
  }


  /**
   * Display Payment Notification with VIEW DETAILS action
   */
  public static async displayPaymentNotification(data: {
    paymentId: string;
    amount: number;
    projectTitle: string;
  }) {
    if (!notifee) return;
    await this.initChannels();

    const { paymentId, amount, projectTitle } = data;

    try {
      await notifee.displayNotification({
        id: `pay_${paymentId}`,
        title: `💳 Payment Received: ₹${amount.toLocaleString('en-IN')}`,
        body: `Payment credited for project ${projectTitle}`,
        data: {
          paymentId,
          category: 'payment',
        },
        android: {
          channelId: 'payments',
          actions: [
            {
              title: 'VIEW DETAILS',
              pressAction: { id: 'view_payment' },
            },
          ],
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
        },
      });
    } catch (err) {
      console.error('[NotifeeService] Error displaying payment notification:', err);
    }
  }

  /**
   * Clear message history & cancel notification when chat is read
   */
  public static async clearConversationNotification(conversationId: string) {
    if (!notifee) return;
    delete conversationMessageStore[conversationId];
    try {
      await notifee.cancelNotification(`chat_${conversationId}`);
    } catch (err) {
      console.log('[NotifeeService] Error cancelling notification:', err);
    }
  }
}

export default NotifeeNotificationService;
