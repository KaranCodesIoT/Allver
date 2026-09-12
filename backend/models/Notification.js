const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
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
    enum: ['messages', 'projectUpdates', 'contracts', 'payments', 'marketing', 'systemAlerts', 'voice_call'],
    default: 'systemAlerts'
  },
  isSuppressed: {
    type: Boolean,
    default: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isMarked: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

notificationSchema.index({ recipientId: 1, createdAt: -1 });

// Pre-save hook to check settings and suppress if disabled
notificationSchema.pre('save', async function() {
  try {
    const User = mongoose.model('User');
    const recipient = await User.findById(this.recipientId);
    if (!recipient) return;

    // 1. Resolve notification category
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
      } else if (textLower.includes('marketing') || textLower.includes('promotional') || textLower.includes('recommendation')) {
        resolvedCategory = 'marketing';
      }
      this.category = resolvedCategory;
    }

    // 2. Check recipient's notification settings preferences
    if (recipient.notificationSettings) {
      const isEnabled = recipient.notificationSettings[resolvedCategory];
      if (isEnabled === false) {
        this.isSuppressed = true;
        this.isRead = true; // Mark as read so it doesn't count towards badges
      }
    }
  } catch (error) {
    throw error;
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
      const textLower = doc.text.toLowerCase();
      if (textLower.includes('new message') || textLower.includes('💬') || doc.conversationId) {
        resolvedCategory = 'messages';
      } else if (textLower.includes('project invitation') || textLower.includes('📩') || textLower.includes('applied') || textLower.includes('application') || textLower.includes('accepted') || textLower.includes('rejected') || textLower.includes('proposal')) {
        resolvedCategory = 'projectUpdates';
      } else if (textLower.includes('assigned') || textLower.includes('contract')) {
        resolvedCategory = 'contracts';
      } else if (textLower.includes('payment') || textLower.includes('milestone') || textLower.includes('released')) {
        resolvedCategory = 'payments';
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
        const senderUser = await User.findById(doc.senderId);
        if (senderUser) {
          senderName = senderUser.fullName;
          senderAvatar = senderUser.avatarUrl || '';
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
            console.error(`[FCM Call Push Error] Error sending to token ${fToken}: Code = ${fcmErr.code || 'N/A'} | Message = ${fcmErr.message}`);
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

    // Filter out invalid/empty tokens
    // Validate Expo Push Token in a future-proof manner
    const isExpoPushToken = (token) => {
      if (typeof token !== 'string') return false;
      return /^[a-zA-Z0-9]+PushToken\[.+\]$/.test(token) || token.startsWith('ExpoPushToken') || token.startsWith('ExponentPushToken');
    };

    targetTokens = targetTokens.filter(isExpoPushToken);

    // Resolve target FCM Tokens
    const fcmTokens = recipient.fcmTokens || [];

    if (targetTokens.length === 0 && fcmTokens.length === 0) {
      console.log(`[Push Notification] No valid Expo or FCM push tokens found for ${recipient.fullName}.`);
      return;
    }

    console.log(`[Push Notification Log] Recipient: ${recipient.fullName}. Found ${targetTokens.length} Expo tokens and ${fcmTokens.length} FCM tokens.`);

    // 4. Compute unread notifications count (badge)
    const badgeCount = await mongoose.model('Notification').countDocuments({
      recipientId: doc.recipientId,
      isRead: false
    });

    // Fetch sender details to assist client-side deep linking
    let senderName = '';
    let senderAvatar = '';
    try {
      const senderUser = await User.findById(doc.senderId);
      if (senderUser) {
        senderName = senderUser.fullName;
        senderAvatar = senderUser.avatarUrl || '';
      }
    } catch (e) {
      console.log('Error fetching sender details:', e);
    }

    // 5. Determine title based on category & text
    let title = 'Allver';
    const textLower = doc.text.toLowerCase();
    if (resolvedCategory === 'voice_call' || textLower.includes('incoming voice call') || textLower.includes('📞')) {
      title = '📞 Incoming Voice Call';
    } else if (resolvedCategory === 'messages') {
      title = '💬 New Message';
    } else if (resolvedCategory === 'projectUpdates') {
      title = textLower.includes('applied') || textLower.includes('application') ? '👥 New Application' : '📩 Project Invitation';
    } else if (resolvedCategory === 'contracts') {
      title = '🏗 New Contract Assigned';
    } else if (resolvedCategory === 'payments') {
      title = '💰 Payment Received';
    }

    // A. Send to Expo Push Tokens (via Expo Push API)
    if (targetTokens.length > 0) {
      for (const token of targetTokens) {
        const message = {
          to: token,
          sound: 'default',
          priority: 'high',
          channelId: 'default',
          title: title,
          body: doc.text,
          badge: badgeCount,
          data: {
            notificationId: doc._id.toString(),
            text: doc.text,
            workspaceId: doc.workspaceId || '',
            conversationId: doc.conversationId || '',
            projectId: doc.projectId || '',
            postId: doc.postId || '',
            postType: doc.postType || '',
            senderId: doc.senderId ? doc.senderId.toString() : '',
            senderName,
            senderAvatar,
            category: resolvedCategory
          },
          android: {
            channelId: 'default',
            importance: 'high',
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          }
        };

        try {
          console.log(`[Push Notification - Expo Send] Sending payload to ${recipient.fullName}:`, JSON.stringify(message));
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
            console.log(`[Push Notification - Expo Response] Successfully sent to ${recipient.fullName} (${token}) [Ticket ID: ${ticket.id}]`);
          } else if (ticket && ticket.status === 'error') {
            console.error(`[Push Notification - Expo Response] Expo Push API Error Ticket for ${recipient.fullName} (${token}):`, ticket.message, ticket.details);
          } else if (resData?.errors && resData.errors.length > 0) {
            console.error(`[Push Notification - Expo Response] Expo Push API Top-Level Error for ${recipient.fullName} (${token}):`, resData.errors);
          } else {
            console.log(`[Push Notification - Expo Response] Sent to ${recipient.fullName} (${token}):`, resData);
          }
        } catch (sendErr) {
          console.error(`[Push Notification - Expo Error] Error sending to ${token}:`, sendErr);
        }
      }
    }

    // B. Send to FCM Tokens (via Firebase Admin SDK)
    if (fcmTokens.length > 0) {
      let admin = null;
      try {
        admin = require('firebase-admin');
      } catch (e) {
        console.warn('[Push Notification - FCM Error] firebase-admin package not available.');
      }

      if (admin && admin.apps && admin.apps.length > 0) {
        for (const fToken of fcmTokens) {
          const fcmPayload = {
            token: fToken,
            notification: {
              title: title,
              body: doc.text
            },
            data: {
              notificationId: doc._id.toString(),
              text: doc.text || '',
              workspaceId: doc.workspaceId || '',
              conversationId: doc.conversationId || '',
              projectId: doc.projectId || '',
              postId: doc.postId || '',
              postType: doc.postType || '',
              senderId: doc.senderId ? doc.senderId.toString() : '',
              senderName: senderName || '',
              senderAvatar: senderAvatar || '',
              category: resolvedCategory || ''
            },
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                channelId: 'default'
              }
            }
          };

          try {
            console.log(`[Push Notification - FCM Send] Sending to ${recipient.fullName} (${fToken}) payload:`, JSON.stringify(fcmPayload));
            const responseMessageId = await admin.messaging().send(fcmPayload);
            console.log(`[Push Notification - FCM Response] Successfully sent FCM message to ${recipient.fullName} (${fToken}). MessageID: ${responseMessageId}`);
          } catch (fcmErr) {
            console.error(`[Push Notification - FCM Error] Error sending to FCM token ${fToken}: Code = ${fcmErr.code || 'N/A'} | Message = ${fcmErr.message}`);
          }
        }
      } else {
        console.warn('[Push Notification - FCM Error] Firebase Admin SDK is not initialized. Skipping FCM notification send.');
      }
    }
  } catch (error) {
    console.error('[Push Notification] Error in post-save hook:', error);
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
