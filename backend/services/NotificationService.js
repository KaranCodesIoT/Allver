// backend/services/NotificationService.js
// Authoritative, Production-Grade Notification Service for Allver
// MongoDB = Source of Truth | Socket.IO = Realtime In-App | Expo Push = Background/Closed App

const mongoose = require('mongoose');
const Notification = require('../models/Notification');

class NotificationService {
  /**
   * Idempotent, authoritative notification creation and multi-channel dispatch.
   *
   * @param {Object} params
   * @param {string} params.type - Enum event type (e.g. 'BOOKING_REQUEST', 'BOOKING_ACCEPTED', etc.)
   * @param {string} params.bookingId - Associated booking/jobId
   * @param {string|ObjectId} params.userId - Recipient user ID (provider or customer)
   * @param {string|ObjectId} [params.senderId] - Optional sender ID (e.g. customer ID for provider alerts)
   * @param {string} params.title - Notification title
   * @param {string} params.body - Notification body / message text
   * @param {Object} [params.metadata] - Extra context (pricing, location, service, clientInfo, etc.)
   * @param {string} [params.idempotencyKey] - Unique key to prevent duplicates on retries
   * @param {Object} [params.io] - Socket.IO instance for real-time delivery
   * @returns {Promise<Object>} Created or existing Notification document
   */
  static async sendBookingNotification({
    type,
    bookingId,
    userId,
    senderId = null,
    title,
    body,
    metadata = {},
    idempotencyKey = null,
    io = null
  }) {
    try {
      if (!userId || !type) {
        console.warn('[NotificationService] Missing required parameters (userId or type)');
        return null;
      }

      const recipientIdStr = userId.toString();
      const bookingIdStr = bookingId ? bookingId.toString() : '';

      // 1. Idempotency Check: Prevent duplicate notifications on network/client retry
      const dedupKey = idempotencyKey || (bookingIdStr ? `${type}_${bookingIdStr}_${recipientIdStr}` : null);
      if (dedupKey) {
        const recentDuplicate = await Notification.findOne({
          $or: [
            { idempotencyKey: dedupKey },
            {
              type,
              bookingId: bookingIdStr,
              recipientId: recipientIdStr,
              createdAt: { $gte: new Date(Date.now() - 30 * 1000) } // within last 30 seconds
            }
          ]
        });

        if (recentDuplicate) {
          console.log(`[NotificationService] Deduplicated notification [${dedupKey}] for user ${recipientIdStr}. Returning existing record.`);
          return recentDuplicate;
        }
      }

      // 2. Persist to MongoDB — Source of Truth
      const notificationDoc = new Notification({
        recipientId: recipientIdStr,
        senderId: senderId && mongoose.Types.ObjectId.isValid(senderId) ? senderId : null,
        type,
        bookingId: bookingIdStr,
        title: title || 'Allver',
        body: body || '',
        text: body || '',
        metadata: metadata || {},
        idempotencyKey: dedupKey,
        isRead: false,
        createdAt: new Date()
      });

      const savedNotification = await notificationDoc.save();
      console.log(`[NotificationService] Saved Notification [${type}] ID: ${savedNotification._id} for User: ${recipientIdStr} (Booking: ${bookingIdStr})`);

      // 3. Real-Time Delivery via Socket.IO (if recipient currently connected)
      const socketServer = io || global.bookingDispatchEngine?.io;
      if (socketServer) {
        const plainPayload = {
          _id: savedNotification._id.toString(),
          id: savedNotification._id.toString(),
          type: savedNotification.type,
          bookingId: savedNotification.bookingId,
          jobId: savedNotification.bookingId,
          title: savedNotification.title,
          body: savedNotification.body,
          text: savedNotification.text,
          metadata: savedNotification.metadata,
          isRead: false,
          read: false,
          createdAt: savedNotification.createdAt
        };

        // Emit both general 'new_notification' (for notifications tray) and specific 'booking_notification'
        socketServer.to(recipientIdStr).emit('new_notification', plainPayload);
        socketServer.to(`user:${recipientIdStr}`).emit('new_notification', plainPayload);

        socketServer.to(recipientIdStr).emit('booking_notification', plainPayload);
        socketServer.to(`user:${recipientIdStr}`).emit('booking_notification', plainPayload);

        console.log(`[NotificationService] Emitted real-time socket notification to user room: ${recipientIdStr}`);
      }

      // 4. Push Notification to registered mobile devices (Expo Push)
      // Automatically triggered by NotificationSchema post('save') hook!

      return savedNotification;
    } catch (err) {
      console.error('[NotificationService] Error sending booking notification:', err);
      return null;
    }
  }

  /**
   * Fetches unread booking notifications for a user (for sync on app launch / reconnect)
   */
  static async getUnreadBookingNotifications(userId) {
    try {
      if (!userId) return [];
      return await Notification.find({
        recipientId: userId,
        isRead: false,
        type: { $ne: 'SYSTEM_ALERT' }
      })
        .sort({ createdAt: -1 })
        .lean();
    } catch (err) {
      console.error('[NotificationService] Error getting unread booking notifications:', err);
      return [];
    }
  }

  /**
   * Marks a specific notification as read and emits sync event
   */
  static async markAsRead(notificationId, userId, io = null) {
    try {
      const updated = await Notification.findOneAndUpdate(
        { _id: notificationId, recipientId: userId },
        { $set: { isRead: true } },
        { new: true }
      );

      const socketServer = io || global.bookingDispatchEngine?.io;
      if (socketServer && userId) {
        socketServer.to(userId.toString()).emit('notifications_read', {
          userId: userId.toString(),
          notificationId: notificationId.toString()
        });
      }

      return updated;
    } catch (err) {
      console.error('[NotificationService] Error marking notification as read:', err);
      return null;
    }
  }
}

module.exports = NotificationService;
