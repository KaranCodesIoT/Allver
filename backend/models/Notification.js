const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },
  type: {
    type: String,
    enum: [
      'BOOKING_REQUEST',
      'BOOKING_ACCEPTED',
      'BOOKING_REJECTED',
      'BOOKING_CANCELLED',
      'BOOKING_RESCHEDULED',
      'BOOKING_REMINDER',
      'PROVIDER_ON_THE_WAY',
      'PROVIDER_ARRIVED',
      'JOB_STARTED',
      'JOB_COMPLETED',
      'PAYMENT_SUCCESS',
      'PAYMENT_FAILED',
      'PAYMENT_REFUNDED',
      'REVIEW_REQUEST',
      'NEW_CHAT_MESSAGE',
      'SYSTEM_ALERT'
    ],
    default: 'SYSTEM_ALERT',
    index: true
  },
  title: {
    type: String,
    default: 'Allver'
  },
  body: {
    type: String,
    default: ''
  },
  bookingId: {
    type: String,
    default: '',
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
  idempotencyKey: {
    type: String,
    default: null,
    index: true
  },
  text: {
    type: String,
    default: ''
  },
  workspaceId: {
    type: String,
    default: ''
  },
  conversationId: {
    type: String,
    default: ''
  },
  projectId: {
    type: String,
    default: ''
  },
  postId: {
    type: String,
    default: ''
  },
  postType: {
    type: String,
    default: ''
  },
  callUUID: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['messages', 'projectUpdates', 'contracts', 'payments', 'attendance', 'marketing', 'systemAlerts', 'voice_call'],
    default: 'systemAlerts'
  },
  isSuppressed: {
    type: Boolean,
    default: false
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  isMarked: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

notificationSchema.virtual('userId')
  .get(function() { return this.recipientId; })
  .set(function(v) { this.recipientId = v; });

notificationSchema.virtual('read')
  .get(function() { return this.isRead; })
  .set(function(v) { this.isRead = v; });

notificationSchema.index({ recipientId: 1, createdAt: -1 });

// Pre-save hook to check settings and suppress if disabled
notificationSchema.pre('save', async function() {
  try {
    // 1. Sync body and text
    if (this.body && !this.text) {
      this.text = this.body;
    } else if (this.text && !this.body) {
      this.body = this.text;
    }

    // 2. Auto-map category if booking event
    if (this.type && this.type !== 'SYSTEM_ALERT') {
      if (this.type.startsWith('PAYMENT_')) {
        this.category = 'payments';
      } else if (this.type === 'NEW_CHAT_MESSAGE') {
        this.category = 'messages';
      } else {
        this.category = 'projectUpdates';
      }
    }

    const User = mongoose.model('User');
    const recipient = await User.findById(this.recipientId);
    if (!recipient) return;

    // 3. Resolve notification category
    let resolvedCategory = this.category || 'systemAlerts';
    if (!this.category) {
      const textLower = this.text ? this.text.toLowerCase() : '';
      if (textLower.includes('new message') || textLower.includes('💬') || this.conversationId) {
        resolvedCategory = 'messages';
      } else if (textLower.includes('project invitation') || textLower.includes('applied') || textLower.includes('application') || textLower.includes('accepted') || textLower.includes('rejected') || textLower.includes('proposal') || textLower.includes('invitation')) {
        resolvedCategory = 'projectUpdates';
      } else if (textLower.includes('assigned') || textLower.includes('contract')) {
        resolvedCategory = 'contracts';
      } else if (textLower.includes('payment') || textLower.includes('milestone') || textLower.includes('released')) {
        resolvedCategory = 'payments';
      } else if (textLower.includes('attendance') || textLower.includes('present')) {
        resolvedCategory = 'attendance';
      } else if (textLower.includes('marketing') || textLower.includes('promotional') || textLower.includes('recommendation')) {
        resolvedCategory = 'marketing';
      }
      this.category = resolvedCategory;
    }

    // 4. Check recipient's notification settings preferences
    if (recipient.notificationSettings) {
      const isEnabled = recipient.notificationSettings[resolvedCategory];
      if (isEnabled === false) {
        this.isSuppressed = true;
        this.isRead = true; // Mark as read so it doesn't count towards badges
      }
    }
  } catch (error) {
    console.warn('[Notification] pre-save hook warning:', error.message);
  }
});

notificationSchema.post('save', async function(doc) {
  if (doc.isSuppressed) {
    console.log(`[Push Notification] Suppressed push for ${doc.recipientId}: category "${doc.category}" is disabled in settings.`);
    return;
  }
  try {
    const User = mongoose.model('User');
    const recipient = await User.findById(doc.recipientId);
    if (!recipient) return;

    // 1. Resolve notification category
    let resolvedCategory = doc.category || 'systemAlerts';
    if (!doc.category) {
      const textLower = (doc.text || doc.body || '').toLowerCase();
      if (textLower.includes('new message') || textLower.includes('💬') || doc.conversationId) {
        resolvedCategory = 'messages';
      } else if (textLower.includes('project invitation') || textLower.includes('📩') || textLower.includes('applied') || textLower.includes('application') || textLower.includes('accepted') || textLower.includes('rejected') || textLower.includes('proposal')) {
        resolvedCategory = 'projectUpdates';
      } else if (textLower.includes('assigned') || textLower.includes('contract')) {
        resolvedCategory = 'contracts';
      } else if (textLower.includes('payment') || textLower.includes('milestone') || textLower.includes('released')) {
        resolvedCategory = 'payments';
      } else if (textLower.includes('attendance') || textLower.includes('present')) {
        resolvedCategory = 'attendance';
      } else if (textLower.includes('marketing')) {
        resolvedCategory = 'marketing';
      }
    }

    // 2. Check recipient's notification settings preferences
    if (recipient.notificationSettings) {
      const isEnabled = recipient.notificationSettings[resolvedCategory];
      if (isEnabled === false) {
        console.log(`[Push Notification] Suppressed push for ${recipient.fullName}: category "${resolvedCategory}" is disabled in settings.`);
        return;
      }
    }

    // Direct FCM Data-Only push wakeup for voice calls
    if (resolvedCategory === 'voice_call' || doc.category === 'voice_call') {
      const fcmTokens = recipient.fcmTokens || [];
      if (fcmTokens.length === 0) {
        console.log(`[FCM Call Push] No FCM tokens registered for user ${recipient.fullName}. Cannot send background wakeup.`);
        return;
      }

      let senderName = 'Allver User';
      let senderAvatar = '';
      try {
        if (doc.senderId) {
          const senderUser = await User.findById(doc.senderId);
          if (senderUser) {
            senderName = senderUser.fullName;
            senderAvatar = senderUser.avatarUrl || '';
          }
        }
      } catch (e) {
        console.error('[FCM Call Push] Error fetching sender details:', e);
      }

      let admin = null;
      try {
        admin = require('firebase-admin');
      } catch (e) {
        console.warn('[FCM Call Push] firebase-admin not installed. Skipping FCM dispatch.');
      }

      if (admin && admin.apps && admin.apps.length > 0) {
        const payload = {
          data: {
            notificationId: doc._id.toString(),
            category: 'voice_call',
            callerId: doc.senderId ? doc.senderId.toString() : '',
            callerName: senderName,
            callerAvatar: senderAvatar,
            conversationId: doc.conversationId || '',
            callUUID: doc.callUUID || `call_${doc.senderId}_${Date.now()}`,
            timestamp: Date.now().toString()
          }
        };

        for (const fToken of fcmTokens) {
          try {
            await admin.messaging().send({
              token: fToken,
              ...payload,
              android: {
                priority: 'high',
                ttl: 0
              }
            });
            console.log(`[FCM Call Push] Successfully sent direct FCM background wakeup call message to token ${fToken}`);
          } catch (fcmErr) {
            console.error(`[FCM Call Push] Error sending to token ${fToken}:`, fcmErr.message);
          }
        }
      } else {
        console.warn('[FCM Call Push] Firebase Admin SDK not available or not initialized. FCM call push skipped.');
      }
      return; // Skip Expo Push logic for voice calls!
    }

    // 3. Resolve target Expo Push Tokens
    let targetTokens = [];
    if (recipient.expoPushTokens && recipient.expoPushTokens.length > 0) {
      targetTokens = [...recipient.expoPushTokens];
    } else if (recipient.expoPushToken) {
      targetTokens = [recipient.expoPushToken];
    }

    // Validate Expo Push Token in a future-proof manner
    const isExpoPushToken = (token) => {
      if (typeof token !== 'string') return false;
      return /^[a-zA-Z0-9]+PushToken\[.+\]$/.test(token) || token.startsWith('ExpoPushToken') || token.startsWith('ExponentPushToken');
    };

    targetTokens = targetTokens.filter(isExpoPushToken);
    if (targetTokens.length === 0) {
      console.log(`[Push Notification] No valid push tokens found for ${recipient.fullName}.`);
      return;
    }

    // 4. Compute unread notifications count (badge)
    const badgeCount = await mongoose.model('Notification').countDocuments({
      recipientId: doc.recipientId,
      isRead: false
    });

    // Fetch sender details to assist client-side deep linking
    let senderName = '';
    let senderAvatar = '';
    try {
      if (doc.senderId) {
        const senderUser = await User.findById(doc.senderId);
        if (senderUser) {
          senderName = senderUser.fullName;
          senderAvatar = senderUser.avatarUrl || '';
        }
      }
    } catch (e) {
      console.log('Error fetching sender details:', e);
    }

    // 5. Determine title based on type, explicit title, category & text
    let title = doc.title && doc.title !== 'Allver' ? doc.title : 'Allver';
    const textLower = (doc.text || doc.body || '').toLowerCase();
    if (title === 'Allver') {
      if (doc.type === 'BOOKING_REQUEST') {
        title = '⚡ New Booking Request';
      } else if (doc.type === 'BOOKING_ACCEPTED') {
        title = '✅ Booking Accepted';
      } else if (doc.type === 'BOOKING_REJECTED') {
        title = '❌ Booking Rejected';
      } else if (doc.type === 'BOOKING_CANCELLED') {
        title = '🚫 Booking Cancelled';
      } else if (doc.type === 'BOOKING_RESCHEDULED') {
        title = '📅 Booking Rescheduled';
      } else if (doc.type === 'BOOKING_REMINDER') {
        title = '⏰ Booking Reminder';
      } else if (doc.type === 'PROVIDER_ON_THE_WAY') {
        title = '🚗 Provider On The Way';
      } else if (doc.type === 'PROVIDER_ARRIVED') {
        title = '📍 Provider Arrived';
      } else if (doc.type === 'JOB_STARTED') {
        title = '🛠 Work Started';
      } else if (doc.type === 'JOB_COMPLETED') {
        title = '🎉 Job Completed';
      } else if (doc.type === 'PAYMENT_SUCCESS') {
        title = '💰 Payment Received';
      } else if (doc.type === 'PAYMENT_FAILED') {
        title = '⚠️ Payment Failed';
      } else if (doc.type === 'PAYMENT_REFUNDED') {
        title = '💸 Payment Refunded';
      } else if (doc.type === 'REVIEW_REQUEST') {
        title = '⭐ Rate Your Service';
      } else if (doc.type === 'NEW_CHAT_MESSAGE') {
        title = '💬 New Message';
      } else if (resolvedCategory === 'voice_call' || textLower.includes('incoming voice call') || textLower.includes('📞')) {
        title = '📞 Incoming Voice Call';
      } else if (resolvedCategory === 'messages') {
        title = '💬 New Message';
      } else if (resolvedCategory === 'projectUpdates') {
        title = textLower.includes('applied') || textLower.includes('application') ? '👥 New Application' : '📩 Project Invitation';
      } else if (resolvedCategory === 'contracts') {
        title = '🏗 New Contract Assigned';
      } else if (resolvedCategory === 'payments') {
        title = '💰 Payment Received';
      } else if (resolvedCategory === 'attendance') {
        title = '📋 Attendance Marked';
      }
    }

    const notificationBody = doc.body || doc.text || '';

    // Send push payload to all registered device tokens
    for (const token of targetTokens) {
      const message = {
        to: token,
        sound: 'default',
        priority: 'high',
        channelId: 'default',
        title: title,
        body: notificationBody,
        badge: badgeCount,
        data: {
          notificationId: doc._id.toString(),
          type: doc.type || 'SYSTEM_ALERT',
          bookingId: doc.bookingId || '',
          jobId: doc.bookingId || doc.projectId || '',
          title: title,
          body: notificationBody,
          text: notificationBody,
          workspaceId: doc.workspaceId || '',
          conversationId: doc.conversationId || '',
          projectId: doc.projectId || '',
          postId: doc.postId || '',
          postType: doc.postType || '',
          senderId: doc.senderId ? doc.senderId.toString() : '',
          senderName,
          senderAvatar,
          category: resolvedCategory,
          metadata: doc.metadata || {}
        },
        android: {
          channelId: 'default',
          importance: 'high',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        }
      };

      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });
        const resData = await response.json();
        const ticket = resData?.data?.[0];

        if (ticket && ticket.status === 'ok') {
          console.log(`[Push Notification] Successfully sent to ${recipient.fullName} (${token}) [Ticket ID: ${ticket.id}]`);
        } else if (ticket && ticket.status === 'error') {
          console.error(`[Push Notification] Expo Push API Error Ticket for ${recipient.fullName} (${token}):`, ticket.message, ticket.details);
          if (ticket.details?.error === 'DeviceNotRegistered') {
            console.log(`[Push Notification] Cleaning up invalid/unregistered token ${token} for user ${recipient._id}`);
            User.findByIdAndUpdate(recipient._id, {
              $pull: { expoPushTokens: token }
            }).catch(e => console.warn('Error pulling invalid token:', e.message));
          }
        } else if (resData?.errors && resData.errors.length > 0) {
          console.error(`[Push Notification] Expo Push API Top-Level Error for ${recipient.fullName} (${token}):`, resData.errors);
        } else {
          console.log(`[Push Notification] Sent to ${recipient.fullName} (${token}):`, resData);
        }
      } catch (sendErr) {
        console.error(`[Push Notification] Error sending to ${token}:`, sendErr);
      }
    }
  } catch (error) {
    console.error('[Push Notification] Error in post-save hook:', error);
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
