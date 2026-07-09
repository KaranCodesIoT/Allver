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
  category: {
    type: String,
    enum: ['messages', 'projectUpdates', 'contracts', 'payments', 'attendance', 'marketing', 'systemAlerts'],
    default: 'systemAlerts'
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

notificationSchema.post('save', async function(doc) {
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
    if (resolvedCategory === 'messages') {
      title = '💬 New Message';
    } else if (textLower.includes('incoming voice call') || textLower.includes('📞')) {
      title = '📞 Incoming Call';
    } else if (resolvedCategory === 'projectUpdates') {
      title = textLower.includes('applied') || textLower.includes('application') ? '👥 New Application' : '📩 Project Invitation';
    } else if (resolvedCategory === 'contracts') {
      title = '🏗 New Contract Assigned';
    } else if (resolvedCategory === 'payments') {
      title = '💰 Payment Received';
    } else if (resolvedCategory === 'attendance') {
      title = '📋 Attendance Marked';
    }

    // Send push payload to all registered device tokens
    for (const token of targetTokens) {
      const message = {
        to: token,
        sound: 'default',
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
        console.log(`[Push Notification] Successfully sent to ${recipient.fullName} (${token}):`, resData);
      } catch (sendErr) {
        console.error(`[Push Notification] Error sending to ${token}:`, sendErr);
      }
    }
  } catch (error) {
    console.error('[Push Notification] Error in post-save hook:', error);
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
