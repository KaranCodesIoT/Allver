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
    if (recipient && recipient.expoPushToken) {
      const expoPushToken = recipient.expoPushToken;
      if (!expoPushToken.startsWith('ExponentPushToken')) {
        console.log(`[Push Notification] Invalid Expo token for ${recipient.fullName}: ${expoPushToken}`);
        return;
      }

      // Determine a nice title and body based on notification text
      let title = 'Allver';
      let cleanBody = doc.text;

      if (doc.text.includes('New Message') || doc.text.includes('💬')) {
        title = '💬 New Message';
      } else if (doc.text.includes('Project Invitation') || doc.text.includes('📩')) {
        title = '📩 Project Invitation';
      } else if (doc.text.includes('Team Invitation') || doc.text.includes('💼')) {
        title = '💼 Team Invitation';
      } else if (doc.text.includes('Applied') || doc.text.includes('Applied')) {
        title = '👥 New Application';
      } else if (doc.text.includes('Accepted') || doc.text.includes('accepted')) {
        title = '✅ Application Accepted';
      } else if (doc.text.includes('Rejected') || doc.text.includes('rejected')) {
        title = '❌ Application Update';
      } else if (doc.text.includes('attendance') || doc.text.includes('Attendance')) {
        title = '📋 Attendance Update';
      } else if (doc.text.includes('payment') || doc.text.includes('Payment')) {
        title = '💰 Payment Update';
      } else if (doc.text.includes('Milestone') || doc.text.includes('milestone')) {
        title = '🏗 Milestone Update';
      }

      const message = {
        to: expoPushToken,
        sound: 'default',
        title: title,
        body: cleanBody,
        data: {
          notificationId: doc._id.toString(),
          text: doc.text,
          workspaceId: doc.workspaceId || '',
          conversationId: doc.conversationId || '',
          projectId: doc.projectId || '',
          postId: doc.postId || '',
          postType: doc.postType || '',
          senderId: doc.senderId ? doc.senderId.toString() : ''
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
        console.log(`[Push Notification] Successfully sent to ${recipient.fullName}:`, resData);
      } catch (sendErr) {
        console.error('[Push Notification] Fetch send error:', sendErr);
      }
    }
  } catch (error) {
    console.error('[Push Notification] Error in post-save hook:', error);
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
