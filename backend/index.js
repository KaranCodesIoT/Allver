const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const authenticateJWT = require('./middleware/auth');
let Jimp;
console.log('--- Startup Environment ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('HF_TOKEN Loaded:', process.env.HF_TOKEN ? 'YES (' + process.env.HF_TOKEN.substring(0, 5) + '...)' : 'NO');
console.log('---------------------------'); // Reloaded with new token


// Trim environment variables to prevent CRLF or whitespace issues on Windows / Render
const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

// Configure Cloudinary
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret
});

// Configure Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit to support videos
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.set('io', io);

const onlineUsers = new Set();
const activeCallUsers = new Map();
const socketRateLimitStore = new Map();

io.use(async (socket, next) => {
  // 1. Connection Rate Limiting: Max 20 connection attempts per minute
  const ip = socket.handshake.address || socket.conn.remoteAddress;
  const now = Date.now();
  const limitData = socketRateLimitStore.get(ip) || { count: 0, startTime: now };

  if (now - limitData.startTime > 60000) {
    limitData.count = 1;
    limitData.startTime = now;
  } else {
    limitData.count += 1;
  }

  socketRateLimitStore.set(ip, limitData);

  if (limitData.count > 20) {
    return next(new Error("Too many connection attempts. Please try again later."));
  }

  // 2. Trust client-provided raw user ID as token for now (Stability revert)
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Unauthorized: Token missing"));
  }
  socket.userId = token;
  next();
});

io.on('connection', (socket) => {
  console.log('[Socket] Socket connected and authenticated. User ID:', socket.userId, 'Socket ID:', socket.id);

  // Join a specific room (project workspace or DM conversation) with participant validation
  socket.on('join_room', async ({ roomId }) => {
    if (!roomId) {
      console.warn('[Socket] join_room failed: roomId is empty');
      return;
    }

    const uId = socket.userId;
    if (!uId) {
      console.warn('[Socket] join_room failed: socket.userId is not set.');
      return;
    }

    // Validate ObjectId format
    const isValidId = /^[0-9a-fA-F]{24}$/.test(roomId);
    if (!isValidId) {
      console.warn(`[Socket] join_room failed: Room ID "${roomId}" is not a valid ObjectId`);
      return;
    }

    try {
      const mongoose = require('mongoose');
      const ProjectWorkspace = mongoose.model('ProjectWorkspace');
      const Conversation = mongoose.model('Conversation');

      // 1. Check if it's a ProjectWorkspace
      const workspace = await ProjectWorkspace.findById(roomId).lean();
      if (workspace) {
        const isParticipant = 
          (workspace.client && workspace.client.toString() === uId.toString()) ||
          (workspace.professional && workspace.professional.toString() === uId.toString()) ||
          (workspace.contractor && workspace.contractor.toString() === uId.toString()) ||
          (workspace.architect && workspace.architect.toString() === uId.toString()) ||
          (workspace.labourTeam && workspace.labourTeam.some(l => l.toString() === uId.toString()));

        if (isParticipant) {
          socket.join(roomId);
          console.log(`[Socket] User ${uId} joined Workspace room: ${roomId}`);
          return;
        } else {
          console.warn(`[Socket] Security Block: User ${uId} tried to join Workspace ${roomId} without permission.`);
          return;
        }
      }

      // 2. Check if it's a Conversation (one-to-one DM)
      const conversation = await Conversation.findById(roomId).lean();
      if (conversation) {
        const isParticipant = conversation.participants && conversation.participants.some(p => p.toString() === uId.toString());
        if (isParticipant) {
          socket.join(roomId);
          console.log(`[Socket] User ${uId} joined Conversation room: ${roomId}`);
          return;
        } else {
          console.warn(`[Socket] Security Block: User ${uId} tried to join Conversation ${roomId} without permission.`);
          return;
        }
      }

      console.warn(`[Socket] join_room failed: Room ${roomId} not found in database.`);
    } catch (err) {
      console.error(`[Socket] Error validating room join for user ${uId} and room ${roomId}:`, err);
    }
  });

  // Leave a specific room when exiting a chat
  socket.on('leave_room', ({ roomId }) => {
    if (roomId) {
      socket.leave(roomId);
      console.log(`[Socket] Socket ${socket.id} left room: ${roomId}`);
    }
  });

  // Direct message — broadcast with validation
  socket.on('send_message', async ({ roomId, message }) => {
    const userId = socket.userId;
    if (!userId || !roomId) return;

    try {
      const mongoose = require('mongoose');
      const ProjectWorkspace = mongoose.model('ProjectWorkspace');
      const Conversation = mongoose.model('Conversation');

      // Validate workspace/convo participant before emitting
      const workspace = await ProjectWorkspace.findById(roomId).lean();
      if (workspace) {
        const isPart = 
          (workspace.client && workspace.client.toString() === userId.toString()) ||
          (workspace.professional && workspace.professional.toString() === userId.toString()) ||
          (workspace.contractor && workspace.contractor.toString() === userId.toString()) ||
          (workspace.architect && workspace.architect.toString() === userId.toString()) ||
          (workspace.labourTeam && workspace.labourTeam.some(l => l.toString() === userId.toString()));
        if (!isPart) {
          console.warn(`[Socket] Blocked send_message from unauthorized user ${userId} in room ${roomId}`);
          return;
        }
      } else {
        const conversation = await Conversation.findById(roomId).lean();
        if (conversation) {
          const isPart = conversation.participants && conversation.participants.some(p => p.toString() === userId.toString());
          if (!isPart) {
            console.warn(`[Socket] Blocked send_message from unauthorized user ${userId} in room ${roomId}`);
            return;
          }
        } else {
          return;
        }
      }

      io.to(roomId).emit('receive_message', {
        workspaceId: roomId,
        message: message
      });
      console.log(`[Socket] Message broadcast to room ${roomId}:`, message.text?.substring(0, 50));
    } catch (err) {
      console.error('Error on socket send_message:', err);
    }
  });

  // Typing indicator
  socket.on('typing', ({ roomId, userName }) => {
    const userId = socket.userId;
    if (!userId || !roomId) return;
    socket.to(roomId).emit('user_typing', { userId, userName });
    console.log(`[Socket] User ${userName} (${userId}) is typing in room ${roomId}`);
  });

  socket.on('stop_typing', ({ roomId }) => {
    const userId = socket.userId;
    if (!userId || !roomId) return;
    socket.to(roomId).emit('user_stop_typing', { userId });
    console.log(`[Socket] User (${userId}) stopped typing in room ${roomId}`);
  });

  // Track online status and join personal rooms
  socket.on('go_online', () => {
    const userId = socket.userId;
    if (!userId) return;
    onlineUsers.add(userId);

    // Join personal rooms for notifications and DMs
    socket.join(userId.toString());
    socket.join(`user:${userId}`);

    console.log(`[Socket] User ${userId} went online. Joined rooms: "${userId}" and "user:${userId}"`);
    socket.broadcast.emit('user_online', { userId });
  });

  socket.on('check_online', ({ userId }, callback) => {
    const isOnline = onlineUsers.has(userId);
    console.log(`[Socket] Checking online status for user ${userId}:`, isOnline);
    if (typeof callback === 'function') {
      callback({ isOnline });
    }
  });
  
  socket.on('message_delivered', ({ roomId, messageId, userId }) => {
    io.to(roomId).emit('message_delivered', { roomId, messageId, userId });
    console.log(`[Socket] Message ${messageId} marked delivered by user ${userId} in room ${roomId}`);
  });

  socket.on('message_read', ({ roomId, messageId, userId }) => {
    io.to(roomId).emit('message_read', { roomId, messageId, userId });
    console.log(`[Socket] Message ${messageId} marked read by user ${userId} in room ${roomId}`);
  });

  // In-app calling events
  socket.on('initiate_call', async ({ receiverId }) => {
    const callerId = socket.userId;
    if (!callerId || !receiverId) return;

    try {
      const callerUser = await User.findById(callerId);
      if (!callerUser) {
        console.warn(`[Call] Caller user not found in database: ${callerId}`);
        return;
      }

      const callerName = callerUser.fullName;
      const callerAvatar = callerUser.avatarUrl || '';

      console.log(`[Call] Initiate call from ${callerId} (${callerName}) to ${receiverId}`);
      io.to(receiverId.toString()).emit('incoming_call', {
        callerId,
        callerName,
        callerAvatar,
        socketId: socket.id
      });

      // Also send a push notification for the call so it alerts them if the app is in background/closed
      const notification = new Notification({
        recipientId: receiverId,
        senderId: callerId,
        text: `📞 Incoming voice call from ${callerName}`,
        category: 'systemAlerts'
      });
      await notification.save();
    } catch (err) {
      console.error('[Call Push] Error creating notification for call:', err);
    }
  });

  socket.on('answer_call', ({ callerId }) => {
    const receiverId = socket.userId;
    if (!callerId || !receiverId) return;
    console.log(`[Call] Call answered by ${receiverId} to ${callerId}`);
    io.to(callerId.toString()).emit('call_answered', { receiverId });
  });

  socket.on('reject_call', ({ callerId }) => {
    const receiverId = socket.userId;
    if (!callerId || !receiverId) return;
    console.log(`[Call] Call rejected by ${receiverId}`);
    io.to(callerId.toString()).emit('call_rejected', { receiverId });
  });

  socket.on('end_call', ({ targetId }) => {
    console.log(`[Call] Call ended. Notifying ${targetId}`);
    io.to(targetId.toString()).emit('call_ended');
  });

  socket.on('busy_call', ({ callerId }) => {
    console.log(`[Call] Target is busy. Notifying ${callerId}`);
    io.to(callerId.toString()).emit('call_busy');
  });

  socket.on('voice_chunk', ({ url, targetId }) => {
    io.to(targetId.toString()).emit('receive_voice_chunk', { url });
  });

  // ========== VIDEO CALL EVENTS (WebRTC signaling) ==========
  socket.on('initiate_video_call', async ({ callerId, receiverId, callerName, callerAvatar }) => {
    console.log(`[VideoCall] Initiate video call from ${callerId} (${callerName}) to ${receiverId}`);
    
    // Check if receiver is online
    if (!onlineUsers.has(receiverId)) {
      console.log(`[VideoCall] Receiver ${receiverId} is offline`);
      socket.emit('video_call_unavailable', { receiverId });
      try {
        const CallHistory = require('./models/CallHistory');
        await CallHistory.create({ caller: callerId, receiver: receiverId, callType: 'video', status: 'unavailable', startedAt: new Date() });
      } catch (e) { console.error('[VideoCall] Failed to save unavailable call:', e); }
      return;
    }

    // Check if receiver is already in a call
    if (activeCallUsers.has(receiverId)) {
      console.log(`[VideoCall] Receiver ${receiverId} is busy`);
      socket.emit('video_call_busy', { receiverId });
      try {
        const CallHistory = require('./models/CallHistory');
        await CallHistory.create({ caller: callerId, receiver: receiverId, callType: 'video', status: 'busy', startedAt: new Date() });
      } catch (e) { console.error('[VideoCall] Failed to save busy call:', e); }
      return;
    }

    const callId = `vc_${callerId}_${receiverId}_${Date.now()}`;
    activeCallUsers.set(callerId, { callId, peerId: receiverId });

    io.to(receiverId.toString()).emit('incoming_video_call', {
      callId, callerId, callerName, callerAvatar, socketId: socket.id
    });
    console.log(`[VideoCall] Sent incoming_video_call to ${receiverId}`);
  });

  socket.on('answer_video_call', ({ callId, callerId, receiverId }) => {
    console.log(`[VideoCall] Call ${callId} answered by ${receiverId}`);
    activeCallUsers.set(receiverId, { callId, peerId: callerId });
    io.to(callerId.toString()).emit('video_call_answered', { callId, receiverId });
  });

  socket.on('reject_video_call', async ({ callId, callerId, receiverId }) => {
    console.log(`[VideoCall] Call ${callId} rejected by ${receiverId}`);
    activeCallUsers.delete(callerId);
    io.to(callerId.toString()).emit('video_call_rejected', { callId, receiverId });
    try {
      const CallHistory = require('./models/CallHistory');
      await CallHistory.create({ caller: callerId, receiver: receiverId, callType: 'video', status: 'declined', startedAt: new Date() });
    } catch (e) { console.error('[VideoCall] Failed to save declined call:', e); }
  });

  socket.on('end_video_call', async ({ callId, targetId, duration }) => {
    console.log(`[VideoCall] Call ${callId} ended. Notifying ${targetId}. Duration: ${duration}s`);
    const userId = socket.userId;
    activeCallUsers.delete(userId);
    activeCallUsers.delete(targetId);
    io.to(targetId.toString()).emit('video_call_ended', { callId });

    if (duration && duration > 0) {
      try {
        const CallHistory = require('./models/CallHistory');
        const parts = callId.split('_');
        const caller = parts[1];
        const receiver = parts[2];
        await CallHistory.create({
          caller, receiver, callType: 'video', status: 'completed',
          startedAt: new Date(Date.now() - (duration * 1000)),
          answeredAt: new Date(Date.now() - (duration * 1000)),
          endedAt: new Date(), duration
        });
      } catch (e) { console.error('[VideoCall] Failed to save completed call:', e); }
    }
  });

  socket.on('video_call_missed', async ({ callId, callerId, receiverId }) => {
    console.log(`[VideoCall] Call ${callId} missed by ${receiverId}`);
    activeCallUsers.delete(callerId);
    try {
      const CallHistory = require('./models/CallHistory');
      await CallHistory.create({ caller: callerId, receiver: receiverId, callType: 'video', status: 'missed', startedAt: new Date() });
    } catch (e) { console.error('[VideoCall] Failed to save missed call:', e); }
  });

  // WebRTC SDP + ICE signaling relay
  socket.on('video_call_offer', ({ targetId, offer, callId }) => {
    console.log(`[VideoCall] Relaying SDP offer to ${targetId}`);
    io.to(targetId.toString()).emit('video_call_offer', { offer, callId, fromId: socket.userId });
  });

  socket.on('video_call_answer', ({ targetId, answer, callId }) => {
    console.log(`[VideoCall] Relaying SDP answer to ${targetId}`);
    io.to(targetId.toString()).emit('video_call_answer', { answer, callId, fromId: socket.userId });
  });

  socket.on('video_ice_candidate', ({ targetId, candidate, callId }) => {
    io.to(targetId.toString()).emit('video_ice_candidate', { candidate, callId, fromId: socket.userId });
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      // If user was in an active video call, notify the other party
      const activeCall = activeCallUsers.get(socket.userId);
      if (activeCall) {
        io.to(activeCall.peerId.toString()).emit('video_call_ended', { callId: activeCall.callId });
        activeCallUsers.delete(socket.userId);
        activeCallUsers.delete(activeCall.peerId);
      }

      onlineUsers.delete(socket.userId);
      socket.broadcast.emit('user_offline', { userId: socket.userId });
      console.log(`[Socket] User ${socket.userId} went offline.`);
    }
    console.log('[Socket] Socket disconnected:', socket.id);
  });
});

const emitWorkspaceUpdate = (req, workspaceId, workspaceData) => {
  const io = req.app.get('io');
  if (io && workspaceId && workspaceData) {
    io.to(workspaceId.toString()).emit('workspace_updated', {
      workspaceId: workspaceId.toString(),
      workspace: workspaceData
    });
  }
};

const PORT = process.env.PORT || 5000;

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Lightweight Memory-Based Rate Limiting Middleware
const rateLimitStore = new Map();
const createRateLimiter = ({ windowMs, max, message }) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    const limitData = rateLimitStore.get(ip) || { count: 0, startTime: now };

    if (now - limitData.startTime > windowMs) {
      limitData.count = 1;
      limitData.startTime = now;
    } else {
      limitData.count += 1;
    }

    rateLimitStore.set(ip, limitData);

    if (limitData.count > max) {
      return res.status(429).json({ message: message || 'Too many requests. Please try again later.' });
    }
    next();
  };
};

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many login or OTP attempts from this IP. Please try again after 15 minutes.'
});

const tokenLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 50,
  message: 'Too many token registration requests. Please try again later.'
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

const User = require('./models/User');
const Follow = require('./models/Follow');
const Notification = require('./models/Notification');
const CallHistory = require('./models/CallHistory');

// Define Post model for social posts (media) and blueprint layouts (design)
const postSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  description: { type: String, required: true },
  type: { type: String, enum: ['media', 'design'], required: true }, // 'media' for images/videos, 'design' for designs
  mediaUrls: { type: [String], default: [] },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quotation: { type: mongoose.Schema.Types.Mixed, default: [] },
  likes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  likedBy: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
  dislikedBy: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
  commentsList: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: { type: String, default: 'Anonymous' },
      userAvatar: { type: String, default: '' },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

// Sample Data
const platformStats = {
  activeProjects: 1250,
  verifiedProfessionals: 850,
  happyClients: 3200
};

// Connect to MongoDB Atlas Database
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected successfully');
    
    try {
      const User = require('./models/User');
      
      // Step A: Unset normalizedFirmName for users without a firmName to prevent unique index conflicts
      const unsetResult = await User.updateMany(
        { $or: [ { firmName: { $exists: false } }, { firmName: '' } ] },
        { $unset: { normalizedFirmName: 1 } }
      );
      console.log(`Unset normalizedFirmName for ${unsetResult.modifiedCount} users`);

      // Self-healing Migration: Normalize firmName for all existing users and resolve duplicates
      console.log('Running self-healing firmName normalization migration...');
      const usersToFix = await User.find({ firmName: { $exists: true, $ne: '' } });
      const seenNormalized = new Map();
      
      for (const u of usersToFix) {
        let norm = u.firmName.trim().toLowerCase().replace(/\s+/g, ' ');
        
        if (seenNormalized.has(norm)) {
          let counter = 1;
          let candidate = `${norm}-${counter}`;
          while (seenNormalized.has(candidate)) {
            counter++;
            candidate = `${norm}-${counter}`;
          }
          norm = candidate;
          u.firmName = `${u.firmName} (Duplicate ${counter})`;
          console.log(`Resolved duplicate firmName conflict for user ${u.fullName}. New firm: "${u.firmName}"`);
        }
        
        seenNormalized.set(norm, u._id.toString());
        
        if (u.normalizedFirmName !== norm || u.isModified('firmName')) {
          u.normalizedFirmName = norm;
          await u.save();
          console.log(`Migrated normalizedFirmName for user ${u.fullName}: "${norm}"`);
        }
      }
      
      await User.syncIndexes();
      console.log('Database indexes synchronized successfully');
      
      const Post = mongoose.model('Post');
      
      // Step B: Clean up accidental project/progress update posts in the Post collection
      const deletePostsResult = await Post.deleteMany({
        $or: [
          { title: { $regex: /project update|progress update/i } },
          { description: { $regex: /project update|progress update/i } }
        ]
      });
      console.log(`Deleted ${deletePostsResult.deletedCount} accidental project/progress update posts from Post collection`);
      
      const fs = require('fs');
      
      const allUsers = await User.find({}, 'fullName email role');
      const allDesigns = await Post.find({ type: 'design' }).populate('creator', 'fullName role');
      
      const output = {
        users: allUsers,
        designs: allDesigns.map(d => ({ id: d._id, title: d.title, creator: d.creator }))
      };
      fs.writeFileSync('db_contents.txt', JSON.stringify(output, null, 2));
      console.log('--- DB CONTENTS WRITTEN TO db_contents.txt ---');
    } catch (err) {
      console.error('Error logging DB to file:', err);
    }
    

    // Seed mock recent activity notifications for all users if they have none
    try {
      const User = require('./models/User');
      const allUsers = await User.find({});
      
      for (const u of allUsers) {
        const count = await Notification.countDocuments({ recipientId: u._id });
        if (count < 2) {
          const notifs = [];
          
          if (u.role === 'Architect' || u.role === 'Contractor') {
            notifs.push({
              recipientId: u._id,
              senderId: u._id,
              text: `Invitation to bid received for project "Modern Residential Villa"`,
              isRead: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 30) // 30 mins ago
            });
            notifs.push({
              recipientId: u._id,
              senderId: u._id,
              text: `Milestone 1 payment of ₹25,000 released successfully`,
              isRead: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4) // 4 hours ago
            });
            notifs.push({
              recipientId: u._id,
              senderId: u._id,
              text: `Attendance marked successfully for today's shifts`,
              isRead: true,
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
            });
          } else if (u.role === 'Labour') {
            notifs.push({
              recipientId: u._id,
              senderId: u._id,
              text: `Attendance marked present by Contractor Suraj Sharma`,
              isRead: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 45) // 45 mins ago
            });
            notifs.push({
              recipientId: u._id,
              senderId: u._id,
              text: `Daily wage payment of ₹800 credited to wallet`,
              isRead: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6) // 6 hours ago
            });
          } else {
            // Client / default
            notifs.push({
              recipientId: u._id,
              senderId: u._id,
              text: `Quotation updated by Ar. Rohit Chaudhari for project "Duplex Renovation"`,
              isRead: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 15) // 15 mins ago
            });
            notifs.push({
              recipientId: u._id,
              senderId: u._id,
              text: `Contract agreement signed and finalized successfully`,
              isRead: true,
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12) // 12 hours ago
            });
          }

          // Welcome notification
          notifs.push({
            recipientId: u._id,
            senderId: u._id,
            text: `Welcome to Allver! Start building, connecting, and growing.`,
            isRead: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48) // 2 days ago
          });

          await Notification.insertMany(notifs);
        }
      }
      console.log('Successfully checked and seeded mock notification activities for all users!');
    } catch (seedErr) {
      console.error('Error seeding mock notifications:', seedErr);
    }

    // Clean up existing legacy chat notifications from database
    try {
      const deletedNotificationsCount = await Notification.deleteMany({
        text: { $regex: /New Message|\[View Chat\]/ }
      });
      console.log(`Cleaned up ${deletedNotificationsCount.deletedCount} legacy chat notifications from DB.`);
    } catch (cleanupErr) {
      console.error('Error cleaning up legacy notifications:', cleanupErr);
    }

    // Clean up dummy seeder users and their posts
    try {
      const User = require('./models/User');
      const usersToDelete = await User.find({
        fullName: { $in: ['Rahul Verma', 'Priya Mishra', 'Neha Sharma', 'Ar. Neha Sharma'] }
      });
      const userIds = usersToDelete.map(u => u._id);
      if (userIds.length > 0) {
        const deletedPosts = await mongoose.model('Post').deleteMany({ creator: { $in: userIds } });
        const deletedUsers = await User.deleteMany({ _id: { $in: userIds } });
        console.log(`Successfully deleted ${deletedUsers.deletedCount} dummy users and ${deletedPosts.deletedCount} of their posts from DB.`);
      }
    } catch (dbCleanErr) {
      console.error('Error deleting dummy seeder users:', dbCleanErr);
    }

    try {
      const db = mongoose.connection.db;
      const collection = db.collection('users');
      const indexes = await collection.indexes();
      const hasPhoneIndex = indexes.some(idx => idx.name === 'phoneNumber_1');
      if (hasPhoneIndex) {
        console.log('phoneNumber_1 index found, dropping it...');
        await collection.dropIndex('phoneNumber_1');
        console.log('phoneNumber_1 index dropped successfully!');
      } else {
        console.log('phoneNumber_1 index not found, skipping drop.');
      }
    } catch (indexErr) {
      console.error('Error checking/dropping phoneNumber index on startup:', indexErr);
    }

    // Self-healing seed for mock users to support follow features
    try {

      // Self-healing seed to auto-accept the 5Bhk home renovation contract request
      try {
        const ContractRequestLocal = require('./models/ContractRequest');
        const ProjectWorkspaceLocal = require('./models/ProjectWorkspace');

        const renRequest = await ContractRequestLocal.findOne({ title: '5Bhk home renovation' });
        if (renRequest && renRequest.status === 'Pending') {
          renRequest.status = 'Accepted';
          renRequest.professional = new mongoose.Types.ObjectId('6a2790f42548c9ceb580f1c5'); // Ankit contractor
          await renRequest.save();
          global.seedResult = 'Accepted contract request successfully.';
        } else if (renRequest) {
          global.seedResult = `Contract request found but status is ${renRequest.status}.`;
        } else {
          global.seedResult = 'Contract request "5Bhk home renovation" not found in DB.';
        }

        if (renRequest) {
          const wsExists = await ProjectWorkspaceLocal.findOne({ contractRequest: renRequest._id });
          if (!wsExists) {
            const newWs = new ProjectWorkspaceLocal({
              contractRequest: renRequest._id,
              client: renRequest.client,
              professional: renRequest.professional || new mongoose.Types.ObjectId('6a2790f42548c9ceb580f1c5'),
              contractor: renRequest.professional || new mongoose.Types.ObjectId('6a2790f42548c9ceb580f1c5'),
              architect: null,
              labourTeam: [],
              title: renRequest.title,
              projectType: renRequest.projectType || 'Residential',
              status: 'Active',
              quotation: {
                totalCost: 2000000,
                status: 'Accepted',
                items: []
              },
              updates: [] // Starts fresh from scratch!
            });
            await newWs.save();
            global.seedResult += ' Active ProjectWorkspace created successfully.';
          } else {
            global.seedResult += ' Workspace already existed.';
          }
        }
      } catch (renErr) {
        console.error('Error seeding 5Bhk project workspace:', renErr);
        global.seedResult = `Error during seed: ${renErr.message}`;
      }

    } catch (seedErr) {
      console.error('Error in self-healing mock seeding:', seedErr);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
  res.send('Allver API is running...');
});

app.get('/api/stats', (req, res) => {
  res.json(platformStats);
});

// Create a new post/design
app.post('/api/posts', async (req, res) => {
  try {
    const { title, description, type, mediaUrls, creatorId, quotation } = req.body;
    if (!description || !type || !creatorId) {
      return res.status(400).json({ message: 'Missing required fields: description, type, and creatorId are required.' });
    }
    
    // Validate creator exists
    const user = await User.findById(creatorId);
    if (!user) {
      return res.status(404).json({ message: 'Creator user not found.' });
    }
    
    const newPost = new Post({
      title: title || '',
      description,
      type,
      mediaUrls: mediaUrls || [],
      creator: creatorId,
      quotation: quotation || {},
    });
    
    await newPost.save();
    
    // Return populated post
    const populatedPost = await Post.findById(newPost._id).populate('creator', 'fullName role avatarUrl city rating firmName experience projects');

    // Trigger notification immediately to all followers of the creator
    try {
      if (type === 'design') {
        const creatorUser = populatedPost.creator;
        const titleText = populatedPost.title || 'New Design Project';
        const locationText = creatorUser.city || 'India';
        
        const follows = await Follow.find({ followingId: creatorId });
        const io = req.app.get('io');
        
        for (const follow of follows) {
          const notification = new Notification({
            recipientId: follow.followerId,
            senderId: creatorId,
            text: `🏗 New Project\n${titleText} posted near ${locationText}\n\n[View Project]`
          });
          await notification.save();
          
          if (io) {
            io.to(follow.followerId.toString()).emit('new_notification', {
              _id: notification._id,
              recipientId: follow.followerId,
              senderId: {
                _id: creatorUser._id,
                fullName: creatorUser.fullName,
                avatarUrl: creatorUser.avatarUrl,
                role: creatorUser.role
              },
              text: notification.text,
              isRead: false,
              createdAt: notification.createdAt
            });
          }
        }
      }
    } catch (notifErr) {
      console.error('Error triggering new project notifications:', notifErr);
    }

    // Emit new_post socket event for real-time Discover Feed updating
    const io = req.app.get('io');
    if (io) {
      io.emit('new_post', populatedPost);
      console.log(`[Socket] Emitted new_post for post ID ${populatedPost._id}`);
    }

    res.status(201).json({ message: 'Post created successfully', post: populatedPost });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Error creating post: ' + (error.message || error) });
  }
});

// Update a post/design (description and/or quotation)
app.put('/api/posts/:id', async (req, res) => {
  try {
    const { description, title, quotation } = req.body;
    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (title !== undefined) updateData.title = title;
    if (quotation !== undefined) updateData.quotation = quotation;
    
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).populate('creator', 'fullName role avatarUrl city rating firmName experience projects');
    
    if (!updatedPost) {
      return res.status(404).json({ message: 'Post not found.' });
    }
    
    const io = req.app.get('io');
    if (io) {
      io.emit('post_edited', updatedPost);
      console.log(`[Socket] Emitted post_edited for post ID ${updatedPost._id}`);
    }

    res.status(200).json({ message: 'Post updated successfully', post: updatedPost });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Error updating post: ' + (error.message || error) });
  }
});

// Delete a post/design
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);
    if (!deletedPost) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('post_deleted', { postId: req.params.id });
      console.log(`[Socket] Emitted post_deleted for post ID ${req.params.id}`);
    }

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Error deleting post: ' + (error.message || error) });
  }
});

// Get all feed posts (images/videos)
app.get('/api/posts/feed', async (req, res) => {
  try {
    const posts = await Post.find({ type: 'media' })
      .populate('creator', 'fullName role avatarUrl city rating')
      .sort({ createdAt: -1 });
    res.status(200).json({ posts });
  } catch (error) {
    console.error('Error fetching feed posts:', error);
    res.status(500).json({ message: 'Error fetching feed posts' });
  }
});

// Get all design posts
app.get('/api/posts/design', async (req, res) => {
  try {
    const designs = await Post.find({ type: 'design' })
      .populate('creator', 'fullName role avatarUrl city rating firmName experience projects')
      .sort({ createdAt: -1 });
    res.status(200).json({ designs });
  } catch (error) {
    console.error('Error fetching design posts:', error);
    res.status(500).json({ message: 'Error fetching design posts' });
  }
});

// Get all posts (media + design) uploaded by a specific user
app.get('/api/posts/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const posts = await Post.find({ creator: userId })
      .populate('creator', 'fullName role avatarUrl city rating firmName experience projects')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, posts });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ message: 'Error fetching user posts: ' + error.message });
  }
});

// Get a single post by ID (to fetch latest comments and like states)
app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('creator', 'fullName role avatarUrl city rating firmName experience projects')
      .populate('commentsList.user', 'fullName role avatarUrl');
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(200).json({ post });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Error fetching post: ' + error.message });
  }
});

// Toggle save design for a user
app.post('/api/user/save-design', async (req, res) => {
  try {
    const { userId, designId } = req.body;
    if (!userId || !designId) {
      return res.status(400).json({ message: 'userId and designId are required' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.savedDesigns) {
      user.savedDesigns = [];
    }
    
    const index = user.savedDesigns.indexOf(designId);
    let isSaved = false;
    if (index > -1) {
      // Toggle off save
      user.savedDesigns.splice(index, 1);
    } else {
      // Toggle on save
      user.savedDesigns.push(designId);
      isSaved = true;
    }
    
    await user.save();
    res.status(200).json({ message: 'Save design updated', isSaved, savedDesigns: user.savedDesigns });
  } catch (error) {
    console.error('Error toggling save design:', error);
    res.status(500).json({ message: 'Error toggling save design: ' + error.message });
  }
});

// Get saved designs for a user
app.get('/api/user/saved-designs/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate({
      path: 'savedDesigns',
      populate: {
        path: 'creator',
        select: 'fullName role avatarUrl city rating firmName experience projects phoneNumber'
      }
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ savedDesigns: user.savedDesigns || [] });
  } catch (error) {
    console.error('Error getting saved designs:', error);
    res.status(500).json({ message: 'Error getting saved designs: ' + error.message });
  }
});

// Like/Unlike post endpoint
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'UserId is required' });
    }
    
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    if (!post.likedBy) post.likedBy = [];
    if (!post.dislikedBy) post.dislikedBy = [];
    
    const likedIndex = post.likedBy.indexOf(userId);
    const dislikedIndex = post.dislikedBy.indexOf(userId);
    
    if (likedIndex > -1) {
      // Toggle off like
      post.likedBy.splice(likedIndex, 1);
    } else {
      // Toggle on like, remove dislike if exists
      post.likedBy.push(userId);
      if (dislikedIndex > -1) {
        post.dislikedBy.splice(dislikedIndex, 1);
      }
    }
    
    post.likes = post.likedBy.length;
    await post.save();
    
    // Real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('post_updated', {
        postId: post._id.toString(),
        likes: post.likes,
        likedBy: post.likedBy,
        dislikedBy: post.dislikedBy,
        commentsList: post.commentsList || [],
        comments: post.comments || 0
      });
      console.log(`[Socket] Emitted post_updated for like on post ${post._id}`);
    }
    
    res.status(200).json({ 
      message: 'Like status updated successfully', 
      likes: post.likes, 
      likedBy: post.likedBy, 
      dislikedBy: post.dislikedBy 
    });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ message: 'Error liking post: ' + error.message });
  }
});

// Dislike/Undislike post endpoint
app.post('/api/posts/:id/dislike', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'UserId is required' });
    }
    
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    if (!post.likedBy) post.likedBy = [];
    if (!post.dislikedBy) post.dislikedBy = [];
    
    const likedIndex = post.likedBy.indexOf(userId);
    const dislikedIndex = post.dislikedBy.indexOf(userId);
    
    if (dislikedIndex > -1) {
      // Toggle off dislike
      post.dislikedBy.splice(dislikedIndex, 1);
    } else {
      // Toggle on dislike, remove like if exists
      post.dislikedBy.push(userId);
      if (likedIndex > -1) {
        post.likedBy.splice(likedIndex, 1);
      }
    }
    
    post.likes = post.likedBy.length;
    await post.save();
    
    // Real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('post_updated', {
        postId: post._id.toString(),
        likes: post.likes,
        likedBy: post.likedBy,
        dislikedBy: post.dislikedBy,
        commentsList: post.commentsList || [],
        comments: post.comments || 0
      });
      console.log(`[Socket] Emitted post_updated for dislike on post ${post._id}`);
    }
    
    res.status(200).json({ 
      message: 'Dislike status updated successfully', 
      likes: post.likes, 
      likedBy: post.likedBy, 
      dislikedBy: post.dislikedBy 
    });
  } catch (error) {
    console.error('Error disliking post:', error);
    res.status(500).json({ message: 'Error disliking post: ' + error.message });
  }
});

// Add a comment endpoint
app.post('/api/posts/:id/comment', async (req, res) => {
  try {
    const { userId, userName, userAvatar, text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    if (!post.commentsList) post.commentsList = [];
    
    const newComment = {
      user: userId || null,
      userName: userName || 'Anonymous',
      userAvatar: userAvatar || '',
      text: text.trim(),
      createdAt: new Date()
    };
    
    post.commentsList.push(newComment);
    post.comments = post.commentsList.length;
    await post.save();
    
    // Real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('post_updated', {
        postId: post._id.toString(),
        likes: post.likes,
        likedBy: post.likedBy,
        dislikedBy: post.dislikedBy,
        commentsList: post.commentsList,
        comments: post.comments
      });
      console.log(`[Socket] Emitted post_updated for comment on post ${post._id}`);
    }
    
    res.status(201).json({ 
      message: 'Comment added successfully', 
      comment: newComment,
      commentsCount: post.comments
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Error adding comment: ' + error.message });
  }
});

// Helper to format phone number to E.164 format (+[country][number])
function formatPhoneNumberToE164(phoneNumber) {
  if (!phoneNumber) return '';
  // Remove all characters except digits and plus sign
  let cleaned = phoneNumber.trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';

  // If it already starts with '+', it's in E.164
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If it has 12 digits and starts with 91, assume India country code and prepend +
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return '+' + cleaned;
  }

  // If it is 10 digits, assume India default country code (+91)
  if (cleaned.length === 10) {
    return '+91' + cleaned;
  }

  // Otherwise, prepend '+' to whatever digits are there
  return '+' + cleaned;
}

app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, role, city, language } = req.body;
    
    // Check if user already exists by email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const newUser = new User({ 
      fullName, 
      email, 
      phoneNumber: formatPhoneNumberToE164(phoneNumber), 
      password, 
      role, 
      city,
      language: language || 'en'
    });
    await newUser.save();
    
    res.status(201).json({ 
      message: 'User registered successfully', 
      user: { 
        _id: newUser._id, 
        fullName, 
        email, 
        phoneNumber: newUser.phoneNumber, 
        role, 
        city,
        language: newUser.language 
      } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user: ' + (error.message || error) });
  }
});

// Check Firm Name Availability (Case-insensitive, space-insensitive, regex fallback)
app.get('/api/user/check-firm-name', async (req, res) => {
  try {
    const { name, excludeUserId } = req.query;
    if (!name || !name.trim()) {
      return res.status(200).json({ available: true });
    }
    
    const trimmed = name.trim();
    const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
    
    const escapedPattern = trimmed.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+');
    const query = {
      $or: [
        { normalizedFirmName: normalized },
        { firmName: { $regex: new RegExp('^\\s*' + escapedPattern + '\\s*$', 'i') } }
      ]
    };
    
    if (excludeUserId && mongoose.Types.ObjectId.isValid(excludeUserId)) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeUserId) };
    }
    
    const existing = await User.findOne(query);
    res.status(200).json({ available: !existing });
  } catch (error) {
    console.error('Error checking firm name availability:', error);
    res.status(500).json({ message: 'Error checking firm name availability' });
  }
});

// Update User Profile
app.put('/api/user/profile/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const profileData = req.body;

    const userObj = await User.findById(userId);
    if (!userObj) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isArchitectOrContractor = userObj.role === 'Architect' || userObj.role === 'Contractor';

    if (isArchitectOrContractor) {
      if (profileData.firmName === undefined && !userObj.firmName) {
        return res.status(400).json({ message: 'Company / Firm Name is required.' });
      }
      if (profileData.firmName !== undefined) {
        const trimmedFirmName = (profileData.firmName || '').trim();
        if (!trimmedFirmName) {
          return res.status(400).json({ message: 'Company / Firm Name is required.' });
        }

        // Normalize (trim, lowercase, collapse spaces)
        const normalized = trimmedFirmName.toLowerCase().replace(/\s+/g, ' ');

        // Check for duplicate in database (excluding current user)
        const escapedPattern = trimmedFirmName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+');
        const dupQuery = {
          $or: [
            { normalizedFirmName: normalized },
            { firmName: { $regex: new RegExp('^\\s*' + escapedPattern + '\\s*$', 'i') } }
          ]
        };

        if (mongoose.Types.ObjectId.isValid(userId)) {
          dupQuery._id = { $ne: new mongoose.Types.ObjectId(userId) };
        }

        const duplicate = await User.findOne(dupQuery);

        if (duplicate) {
          return res.status(400).json({
            message: 'This Firm Name is already registered on Allver. Please use a different Firm Name or contact your company administrator if you belong to this firm.'
          });
        }

        profileData.firmName = trimmedFirmName;
        profileData.normalizedFirmName = normalized;
      }
    }
    
    // Format phone numbers to E.164 if they are updated
    if (profileData.phoneNumber !== undefined) {
      profileData.phoneNumber = formatPhoneNumberToE164(profileData.phoneNumber);
    }
    if (profileData.phone !== undefined) {
      profileData.phone = formatPhoneNumberToE164(profileData.phone);
    }
    
    profileData.updatedAt = Date.now();
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: profileData },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedUserObj = updatedUser.toObject();
    updatedUserObj.coverImage = updatedUserObj.cover;
    updatedUserObj.avatar = updatedUserObj.avatarUrl;

    // Emit profile_updated socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('profile_updated', {
        userId,
        user: updatedUserObj
      });
      console.log(`[Socket] Emitted profile_updated for user ${userId}`);
    }
    
    res.status(200).json({ message: 'Profile updated successfully', user: updatedUserObj });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile: ' + (error.message || error) });
  }
});

// Save or Update User Expo Push Token
app.post('/api/user/push-token', tokenLimiter, async (req, res) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) {
      return res.status(400).json({ message: 'userId and token are required' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { expoPushToken: token },
        $addToSet: { expoPushTokens: token }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`[Push Token] Saved for user ${updatedUser.fullName}: ${token}`);
    res.status(200).json({ message: 'Push token updated successfully', user: updatedUser });
  } catch (error) {
    console.error('[Push Token] Error saving token:', error);
    res.status(500).json({ message: 'Error saving push token: ' + error.message });
  }
});

// Delete User Expo Push Token on Logout
app.delete('/api/user/push-token', async (req, res) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) {
      return res.status(400).json({ message: 'userId and token are required' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { expoPushTokens: token } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`[Push Token] Removed for user ${updatedUser.fullName}: ${token}`);
    res.status(200).json({ message: 'Push token removed successfully', user: updatedUser });
  } catch (error) {
    console.error('[Push Token] Error deleting token:', error);
    res.status(500).json({ message: 'Error deleting push token: ' + error.message });
  }
});

// Update User Notification Settings
app.put('/api/user/:id/notification-settings', async (req, res) => {
  try {
    const { id } = req.params;
    const settings = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { notificationSettings: settings } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`[Notification Settings] Updated for user ${updatedUser.fullName}`);
    res.status(200).json({ message: 'Notification settings updated successfully', user: updatedUser });
  } catch (error) {
    console.error('[Notification Settings] Error updating:', error);
    res.status(500).json({ message: 'Error updating settings: ' + error.message });
  }
});

// Get all reviews/ratings for a user from all project workspaces
app.get('/api/user/reviews/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const workspaces = await ProjectWorkspace.find({ 'ratings.to': userId })
      .populate('ratings.from', 'fullName role avatarUrl email');
    
    let reviewsList = [];
    for (const ws of workspaces) {
      for (const r of ws.ratings) {
        if (r.to && r.to.toString() === userId.toString()) {
          reviewsList.push({
            id: r._id,
            workspaceId: ws._id,
            projectTitle: ws.title,
            from: r.from ? {
              id: r.from._id,
              fullName: r.from.fullName,
              role: r.from.role,
              avatarUrl: r.from.avatarUrl,
              email: r.from.email
            } : null,
            rating: r.rating,
            reviewText: r.reviewText,
            createdAt: r.createdAt
          });
        }
      }
    }
    
    // Sort reviews by date descending
    reviewsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.status(200).json({ reviews: reviewsList });
  } catch (error) {
    console.error('Error getting user reviews:', error);
    res.status(500).json({ message: 'Error getting user reviews: ' + error.message });
  }
});


// Get User Profile by ID
app.get('/api/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const userObj = user.toObject();
    delete userObj.password;
    userObj.coverImage = userObj.cover;
    userObj.avatar = userObj.avatarUrl;
    res.status(200).json({ success: true, user: userObj });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ success: false, message: 'Error getting user profile: ' + error.message });
  }
});


// Delete User Account
app.delete('/api/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    // 1. Delete user
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    // 2. Delete posts/designs created by the user
    await Post.deleteMany({ creator: userId });
    // 3. Delete notifications where recipientId or senderId is this user
    await Notification.deleteMany({ $or: [{ recipientId: userId }, { senderId: userId }] });
    // 4. Delete follows where followerId or followingId is this user
    await Follow.deleteMany({ $or: [{ followerId: userId }, { followingId: userId }] });

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Error deleting account: ' + (error.message || error) });
  }
});


// User Login Route (Email + Password)
app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'No account registered with this email.' });
    }
    
    // Validate password
    if (user.password !== password) {
      return res.status(400).json({ message: 'Incorrect password. Please try again.' });
    }
    
    // Update lastActive on successful login
    user.lastActive = new Date();
    await user.save();
    
    // Successful login - return user object and token (which is user._id)
    const userObj = user.toObject();
    delete userObj.password;
    res.status(200).json({ 
      message: 'Login successful', 
      token: user._id,
      user: userObj
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in user: ' + (error.message || error) });
  }
});

// Twilio Verify SMS OTP Configurations
const twilio = require('twilio');
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioVerifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

let twilioClient;
if (twilioAccountSid && twilioAuthToken) {
  twilioClient = twilio(twilioAccountSid, twilioAuthToken);
} else {
  console.warn('[Warning] Twilio credentials are not fully defined in the environment. SMS OTP sending will fail.');
}

// POST /auth/send-email-otp - Generate & Send OTP (reused for SMS OTP via Twilio Verify)
app.post('/auth/send-email-otp', authLimiter, async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;
    if (!email && !phoneNumber) {
      return res.status(400).json({ success: false, message: 'Email or phone number is required.' });
    }

    if (!twilioClient || !twilioVerifyServiceSid) {
      console.error('[Twilio] Twilio is not initialized (missing SID, token, or service SID).');
      return res.status(500).json({ success: false, message: 'SMS service is currently unavailable.' });
    }

    // Find user by either email or phone number
    let user;
    if (email) {
      const trimmedEmail = email.trim().toLowerCase();
      user = await User.findOne({ email: trimmedEmail });
    } else if (phoneNumber) {
      const formattedPhone = formatPhoneNumberToE164(phoneNumber);
      user = await User.findOne({ phoneNumber: formattedPhone });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account registered with this email or phone number.' });
    }

    const userPhone = user.phoneNumber;
    if (!userPhone) {
      return res.status(400).json({ success: false, message: 'No phone number registered for this account.' });
    }

    const formattedPhone = formatPhoneNumberToE164(userPhone);
    if (!formattedPhone) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format stored.' });
    }

    console.log(`[Twilio] Sending SMS OTP to ${formattedPhone}...`);

    // Trigger Twilio Verify OTP SMS
    await twilioClient.verify.v2.services(twilioVerifyServiceSid)
      .verifications
      .create({ to: formattedPhone, channel: 'sms' });

    res.status(200).json({ success: true, message: 'OTP sent to your registered phone number.' });
  } catch (error) {
    console.error('Send SMS OTP error:', error);
    res.status(500).json({ success: false, message: 'Error sending SMS OTP: ' + (error.message || error) });
  }
});

// POST /auth/verify-email-otp - Verify OTP and Login (reused for SMS OTP via Twilio Verify)
app.post('/auth/verify-email-otp', authLimiter, async (req, res) => {
  try {
    const { email, phoneNumber, otp } = req.body;
    if ((!email && !phoneNumber) || !otp) {
      return res.status(400).json({ success: false, message: 'Email/phone and OTP are required.' });
    }

    if (!twilioClient || !twilioVerifyServiceSid) {
      console.error('[Twilio] Twilio is not initialized.');
      return res.status(500).json({ success: false, message: 'SMS service is currently unavailable.' });
    }

    // Find user by either email or phone number
    let user;
    if (email) {
      const trimmedEmail = email.trim().toLowerCase();
      user = await User.findOne({ email: trimmedEmail });
    } else if (phoneNumber) {
      const formattedPhone = formatPhoneNumberToE164(phoneNumber);
      user = await User.findOne({ phoneNumber: formattedPhone });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const userPhone = user.phoneNumber;
    if (!userPhone) {
      return res.status(400).json({ success: false, message: 'No phone number registered for this account.' });
    }

    const formattedPhone = formatPhoneNumberToE164(userPhone);
    if (!formattedPhone) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format stored.' });
    }

    console.log(`[Twilio] Verifying SMS OTP code for ${formattedPhone}...`);

    // Verify code with Twilio Verify
    const verificationCheck = await twilioClient.verify.v2.services(twilioVerifyServiceSid)
      .verificationChecks
      .create({ to: formattedPhone, code: otp.trim() });

    if (verificationCheck.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Incorrect or expired OTP.' });
    }

    // Update lastActive on successful login
    user.lastActive = new Date();
    await user.save();

    // Successful login - return user object and token (which is user._id)
    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({ 
      success: true,
      message: 'Login successful', 
      token: user._id,
      user: userObj
    });
  } catch (error) {
    console.error('Verify SMS OTP error:', error);
    res.status(500).json({ success: false, message: 'Error verifying SMS OTP: ' + (error.message || error) });
  }
});

// Reset Password Route (Email + New Password)
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required.' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account registered with this email.' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({ message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password: ' + (error.message || error) });
  }
});

// Get all professionals by role
app.get('/api/professionals/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const validRoles = ['Architect', 'Contractor', 'Labour'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }
    const professionals = await User.find({ role }, '-password').sort({ createdAt: -1 });
    const mappedProfessionals = professionals.map(p => {
      const obj = p.toObject();
      obj.coverImage = obj.cover;
      obj.avatar = obj.avatarUrl;
      return obj;
    });
    res.status(200).json({ professionals: mappedProfessionals });
  } catch (error) {
    console.error('Error fetching professionals:', error);
    res.status(500).json({ message: 'Error fetching professionals' });
  }
});

// Get single professional by ID
app.get('/api/professional/:id', async (req, res) => {
  try {
    const professional = await User.findById(req.params.id, '-password');
    if (!professional) {
      return res.status(404).json({ message: 'Professional not found' });
    }
    const profObj = professional.toObject();
    profObj.coverImage = profObj.cover;
    profObj.avatar = profObj.avatarUrl;
    res.status(200).json({ professional: profObj });
  } catch (error) {
    console.error('Error fetching professional:', error);
    res.status(500).json({ message: 'Error fetching professional' });
  }
});

// ===================== PORTFOLIO HIGHLIGHTS (Labour) =====================

// Add a project to user's portfolio highlights
app.post('/api/professional/:id/portfolio-highlights', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, projectType, location, budget, timeline, requirements, description, mediaUrls, mediaUrl } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Missing required project title' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.portfolioHighlights) {
      user.portfolioHighlights = [];
    }

    const finalMediaUrls = mediaUrls || (mediaUrl ? [mediaUrl] : []);

    user.portfolioHighlights.unshift({
      title,
      projectType: projectType || 'General',
      location: location || user.city || 'Mumbai',
      budget: budget || '',
      timeline: timeline || '',
      requirements: requirements || [],
      description: description || '',
      mediaUrls: finalMediaUrls,
      status: 'Posted',
      createdAt: new Date()
    });

    await user.save();

    res.status(201).json({ 
      message: 'Project added to portfolio highlights', 
      portfolioHighlights: user.portfolioHighlights 
    });
  } catch (error) {
    console.error('Error adding portfolio highlight:', error);
    res.status(500).json({ message: 'Error adding portfolio highlight: ' + error.message });
  }
});

// Get portfolio highlights for a user
app.get('/api/professional/:id/portfolio-highlights', async (req, res) => {
  try {
    const user = await User.findById(req.params.id, 'portfolioHighlights role fullName');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ portfolioHighlights: user.portfolioHighlights || [] });
  } catch (error) {
    console.error('Error fetching portfolio highlights:', error);
    res.status(500).json({ message: 'Error fetching portfolio highlights: ' + error.message });
  }
});

// Edit a portfolio highlight
app.put('/api/professional/:id/portfolio-highlights/:highlightId', async (req, res) => {
  try {
    const { id, highlightId } = req.params;
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const highlight = user.portfolioHighlights.id(highlightId);
    if (!highlight) {
      return res.status(404).json({ message: 'Highlight not found' });
    }

    highlight.title = title;
    highlight.description = description || '';
    await user.save();

    res.status(200).json({ message: 'Highlight updated successfully', portfolioHighlights: user.portfolioHighlights });
  } catch (error) {
    console.error('Error updating portfolio highlight:', error);
    res.status(500).json({ message: 'Error updating portfolio highlight: ' + error.message });
  }
});

// Delete a portfolio highlight
app.delete('/api/professional/:id/portfolio-highlights/:highlightId', async (req, res) => {
  try {
    const { id, highlightId } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.portfolioHighlights = user.portfolioHighlights.filter(h => h._id.toString() !== highlightId);
    await user.save();

    res.status(200).json({ message: 'Highlight deleted successfully', portfolioHighlights: user.portfolioHighlights });
  } catch (error) {
    console.error('Error deleting portfolio highlight:', error);
    res.status(500).json({ message: 'Error deleting portfolio highlight: ' + error.message });
  }
});

// Like/Unlike a portfolio highlight
app.post('/api/professional/:id/portfolio-highlights/:highlightId/like', async (req, res) => {
  try {
    const { id, highlightId } = req.params;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'UserId is required' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const highlight = user.portfolioHighlights.id(highlightId);
    if (!highlight) {
      return res.status(404).json({ message: 'Highlight not found' });
    }

    if (!highlight.likedBy) highlight.likedBy = [];
    
    const likedIndex = highlight.likedBy.findIndex(uid => uid.toString() === userId.toString());
    let hasLiked = false;

    if (likedIndex > -1) {
      // Toggle off like
      highlight.likedBy.splice(likedIndex, 1);
    } else {
      // Toggle on like
      highlight.likedBy.push(userId);
      hasLiked = true;
    }

    highlight.likes = highlight.likedBy.length;
    await user.save();

    // Send a notification if someone else likes it
    if (hasLiked && userId.toString() !== id.toString()) {
      const senderUser = await User.findById(userId, 'fullName avatarUrl role');
      const senderName = senderUser ? senderUser.fullName : 'Someone';
      
      const notification = new Notification({
        recipientId: id,
        senderId: userId,
        text: `❤️ ${senderName} liked your portfolio highlight "${highlight.title || 'Portfolio Work'}"`
      });
      await notification.save();

      const io = req.app.get('io');
      if (io) {
        io.to(id.toString()).emit('new_notification', {
          _id: notification._id,
          recipientId: id,
          senderId: {
            _id: senderUser ? senderUser._id : userId,
            fullName: senderName,
            avatarUrl: senderUser ? senderUser.avatarUrl : '',
            role: senderUser ? senderUser.role : ''
          },
          text: notification.text,
          createdAt: notification.createdAt,
          isRead: false
        });
      }
    }

    res.status(200).json({ 
      message: 'Like status updated successfully', 
      likes: highlight.likes, 
      likedBy: highlight.likedBy 
    });
  } catch (error) {
    console.error('Error liking portfolio highlight:', error);
    res.status(500).json({ message: 'Error liking portfolio highlight: ' + error.message });
  }
});

// Comment on a portfolio highlight
app.post('/api/professional/:id/portfolio-highlights/:highlightId/comment', async (req, res) => {
  try {
    const { id, highlightId } = req.params;
    const { userId, text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    if (!userId) {
      return res.status(400).json({ message: 'UserId is required' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const highlight = user.portfolioHighlights.id(highlightId);
    if (!highlight) {
      return res.status(404).json({ message: 'Highlight not found' });
    }

    if (!highlight.commentsList) highlight.commentsList = [];

    const commenter = await User.findById(userId, 'fullName avatarUrl role');
    const commenterName = commenter ? commenter.fullName : 'Anonymous';
    const commenterAvatar = commenter ? commenter.avatarUrl : '';

    const newComment = {
      user: userId,
      userName: commenterName,
      userAvatar: commenterAvatar,
      text: text.trim(),
      createdAt: new Date()
    };

    highlight.commentsList.push(newComment);
    highlight.comments = highlight.commentsList.length;
    await user.save();

    // Send a notification if someone else comments
    if (userId.toString() !== id.toString()) {
      const notification = new Notification({
        recipientId: id,
        senderId: userId,
        text: `💬 ${commenterName} commented on your portfolio highlight "${highlight.title || 'Portfolio Work'}": "${text.trim()}"`
      });
      await notification.save();

      const io = req.app.get('io');
      if (io) {
        io.to(id.toString()).emit('new_notification', {
          _id: notification._id,
          recipientId: id,
          senderId: {
            _id: userId,
            fullName: commenterName,
            avatarUrl: commenterAvatar,
            role: commenter ? commenter.role : ''
          },
          text: notification.text,
          createdAt: notification.createdAt,
          isRead: false
        });
      }
    }

    res.status(201).json({ 
      message: 'Comment added successfully', 
      comment: newComment,
      commentsCount: highlight.comments,
      commentsList: highlight.commentsList
    });
  } catch (error) {
    console.error('Error commenting on portfolio highlight:', error);
    res.status(500).json({ message: 'Error commenting on portfolio highlight: ' + error.message });
  }
});

// Professional Team Endpoints
// Get professional's team
app.get('/api/professional/:id/team', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('team', '-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ team: user.team || [] });
  } catch (error) {
    console.error('Error fetching professional team:', error);
    res.status(500).json({ message: 'Error fetching professional team' });
  }
});

// Add member to professional's team
app.post('/api/professional/:id/team', async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;
    
    if (!memberId) {
      return res.status(400).json({ message: 'Member ID is required' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const member = await User.findById(memberId);
    if (!member) {
      return res.status(404).json({ message: 'Team member to add not found' });
    }

    if (!user.team) {
      user.team = [];
    }

    if (user.team.includes(memberId)) {
      return res.status(400).json({ message: 'User is already a team member' });
    }

    user.team.push(memberId);
    await user.save();

    // Trigger notification immediately for Team Invitation
    try {
      const roleLabel = user.role || 'Contractor';
      const notificationText = `💼 Team Invitation\n${user.fullName} (${roleLabel}) has added you to their team on Allver!`;

      const notification = new Notification({
        recipientId: memberId,
        senderId: id,
        text: notificationText
      });
      await notification.save();

      const io = req.app.get('io');
      if (io) {
        io.to(memberId.toString()).emit('new_notification', {
          _id: notification._id,
          recipientId: memberId,
          senderId: {
            _id: user._id,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl || '',
            role: user.role
          },
          text: notificationText,
          isRead: false,
          createdAt: notification.createdAt
        });
      }
    } catch (notifError) {
      console.error('Failed to send notification for team invitation:', notifError);
    }

    const updatedUser = await User.findById(id).populate('team', '-password');
    res.status(200).json({ message: 'Member added to team successfully', team: updatedUser.team });
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({ message: 'Error adding team member' });
  }
});

// Remove member from professional's team
app.delete('/api/professional/:id/team/:memberId', async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.team) {
      user.team = [];
    }

    user.team = user.team.filter(mId => mId.toString() !== memberId);
    await user.save();

    const updatedUser = await User.findById(id).populate('team', '-password');
    res.status(200).json({ message: 'Member removed from team successfully', team: updatedUser.team });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ message: 'Error removing team member' });
  }
});

// ===================== FEATURED PROFESSIONALS (Smart Ranking) =====================
app.get('/api/featured-professionals/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = await User.findById(userId, '-password');
    if (!requestingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userCity = (requestingUser.city || '').toLowerCase().trim();
    const userState = (requestingUser.state || '').toLowerCase().trim();
    const userArea = (requestingUser.area || '').toLowerCase().trim();
    const userSpecializations = (requestingUser.specialization || []).map(s => s.toLowerCase());

    const calculateScore = (user) => {
      const rating = user.rating || 0;
      const projects = user.projects || 0;
      const profileComp = user.profileCompletion || 0;
      const isVerified = user.isVerified ? 1 : 0;
      let recentActivityBonus = 0;
      if (user.lastActive) {
        const days = (Date.now() - new Date(user.lastActive).getTime()) / (1000 * 60 * 60 * 24);
        if (days <= 1) recentActivityBonus = 15;
        else if (days <= 3) recentActivityBonus = 10;
        else if (days <= 7) recentActivityBonus = 5;
      }
      let locationBoost = 0;
      const pc = (user.city || '').toLowerCase().trim();
      const ps = (user.state || '').toLowerCase().trim();
      const pa = (user.area || '').toLowerCase().trim();
      if (userArea && pa && userArea === pa) locationBoost = 20;
      else if (userCity && pc && userCity === pc) locationBoost = 15;
      else if (userState && ps && userState === ps) locationBoost = 8;
      return (rating * 40) + (Math.min(projects, 100) * 0.2 * 20) + (profileComp * 0.15) + recentActivityBonus + (isVerified * 10) + locationBoost;
    };

    const specMap = {
      'residential': ['residential', 'civil', 'general'],
      'commercial': ['commercial', 'civil', 'general'],
      'interior design': ['interior', 'renovation', 'modular'],
      'interior': ['interior', 'renovation', 'modular'],
      'structural': ['civil', 'rcc', 'structural'],
      'landscape': ['landscape', 'civil', 'general'],
    };
    const preferred = new Set();
    for (const spec of userSpecializations) {
      const match = Object.entries(specMap).find(([k]) => spec.includes(k));
      if (match) match[1].forEach(t => preferred.add(t));
    }
    const preferredTypes = [...preferred];

    const allContractors = await User.find({ role: 'Contractor', _id: { $ne: userId } }, '-password').lean();
    const scoredContractors = allContractors.map(c => {
      let score = calculateScore(c);
      if (preferredTypes.length > 0) {
        const tags = [(c.contractorType || ''), ...(c.workCategory || [])].join(' ').toLowerCase();
        if (preferredTypes.some(p => tags.includes(p))) score += 25;
      }
      return { ...c, featuredScore: score, type: 'professional' };
    });
    scoredContractors.sort((a, b) => b.featuredScore - a.featuredScore);
    const topContractors = scoredContractors.slice(0, 6);

    const ContractRequestModel = require('./models/ContractRequest');
    const pendingReqs = await ContractRequestModel.find({ status: 'Pending' }).populate('client', '-password').sort({ createdAt: -1 }).lean();
    const clientMap = new Map();
    for (const cr of pendingReqs) {
      if (!cr.client) continue;
      const cid = cr.client._id.toString();
      if (!clientMap.has(cid)) {
        clientMap.set(cid, { ...cr.client, activeProject: { title: cr.title, projectType: cr.projectType, budget: cr.budget, location: cr.location }, type: 'client' });
      }
    }
    let clientResults = [...clientMap.values()].map(c => ({ ...c, featuredScore: calculateScore(c) }));
    clientResults.sort((a, b) => b.featuredScore - a.featuredScore);
    const topClients = clientResults.slice(0, 3);

    const allArchitects = await User.find({ role: 'Architect', _id: { $ne: userId }, rating: { $gte: 4.5 } }, '-password').lean();
    const nonCompetitors = allArchitects.filter(a => {
      const aSpecs = (a.specialization || []).map(s => s.toLowerCase());
      return !aSpecs.some(s => userSpecializations.includes(s));
    });
    const scoredArchitects = nonCompetitors.map(a => ({ ...a, featuredScore: calculateScore(a), type: 'professional' }));
    scoredArchitects.sort((a, b) => b.featuredScore - a.featuredScore);
    const topArchitects = scoredArchitects.slice(0, 1);

    const featured = [...topContractors, ...topClients, ...topArchitects].slice(0, 10);
    const mappedFeatured = featured.map(item => {
      if (item.type === 'professional' || item.role) {
        return {
          ...item,
          coverImage: item.cover,
          avatar: item.avatarUrl
        };
      }
      return item;
    });

    const contractorCount = await User.countDocuments({ role: 'Contractor' });
    const architectCount = await User.countDocuments({ role: 'Architect' });
    const labourCount = await User.countDocuments({ role: 'Labour' });

    res.status(200).json({
      featured: mappedFeatured,
      counts: { Contractor: contractorCount.toString(), Architect: architectCount.toString(), Labour: labourCount.toString() }
    });
  } catch (error) {
    console.error('Error fetching featured professionals:', error);
    res.status(500).json({ message: 'Error fetching featured professionals: ' + error.message });
  }
});



app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  // Programmatic Jimp resolver
  if (!Jimp) {
    try {
      Jimp = require('jimp');
    } catch (e) {
      console.log('Jimp not found. Programmatically installing jimp...');
      try {
        const execSync = require('child_process').execSync;
        execSync('npm install jimp', { stdio: 'inherit' });
        Jimp = require('jimp');
        console.log('Jimp successfully installed programmatically.');
      } catch (err) {
        console.error('Failed to install jimp programmatically:', err);
      }
    }
  }

  let bufferToUpload = req.file.buffer;

  if (req.file.mimetype && req.file.mimetype.startsWith('image/')) {
    try {
      if (Jimp) {
        const image = await Jimp.read(req.file.buffer);
        
        // Load fonts
        const fontWhite = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
        const fontBlack = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

        // Get body params
        const latitude = req.body.latitude || '';
        const longitude = req.body.longitude || '';
        const address = req.body.address || '';
        
        // Format Timestamp
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';

        // Build Stamp text lines
        const lines = [`Time: ${timestamp}`];
        if (latitude && longitude) {
          lines.push(`GPS: ${latitude}, ${longitude}`);
        }
        if (address) {
          lines.push(`Loc: ${address}`);
        }

        // Draw shadow (black outline) then text (white) for high legibility
        const startX = 20;
        let startY = image.bitmap.height - (lines.length * 22) - 20;
        if (startY < 10) startY = 10;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const yPos = startY + (i * 22);
          
          // Print shadow outline
          image.print(fontBlack, startX + 1, yPos + 1, line);
          image.print(fontBlack, startX - 1, yPos - 1, line);
          image.print(fontBlack, startX + 1, yPos - 1, line);
          image.print(fontBlack, startX - 1, yPos + 1, line);
          
          // Print white text on top
          image.print(fontWhite, startX, yPos, line);
        }

        bufferToUpload = await image.getBufferAsync(req.file.mimetype);
      }
    } catch (err) {
      console.error('Error stamping image:', err);
      // Fallback to original buffer if stamping fails
    }
  }

  const isCloudinaryConfigured = 
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_CLOUD_NAME !== 'Root' &&
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET;

  if (!isCloudinaryConfigured) {
    console.error('Cloudinary is not configured. Local fallback is disabled.');
    return res.status(500).json({ message: 'Cloud storage is not configured.' });
  }

  const uploadStream = cloudinary.uploader.upload_stream(
    { folder: 'allverhq', resource_type: 'auto' },
    (error, result) => {
      if (error) {
        console.error('Cloudinary upload error:', error);
        return res.status(500).json({ message: 'Cloud upload failed: ' + error.message });
      }
      return res.status(200).json({ url: result.secure_url });
    }
  );
  uploadStream.end(bufferToUpload);
});

// --- Contract Request and Project Workspace Endpoints ---

const ContractRequest = require('./models/ContractRequest');
const ProjectWorkspace = require('./models/ProjectWorkspace');
const ProjectBid = require('./models/ProjectBid');

// 1. Submit a Contract Request
app.post('/api/contract-requests', async (req, res) => {
  try {
    const { client, professional, title, projectType, location, budget, startDate, description, timeline, requirements, mediaUrls, attachmentUrl, attachmentName } = req.body;
    
    if (!client || !title || !location || !budget) {
      return res.status(400).json({ message: 'Missing required project details' });
    }

    const newRequest = new ContractRequest({
      client,
      professional: professional || undefined,
      title,
      projectType: projectType || 'General',
      location,
      budget,
      startDate: startDate ? new Date(startDate) : new Date(),
      description: description || '',
      timeline: timeline || '',
      requirements: requirements || [],
      attachmentUrl: attachmentUrl || '',
      attachmentName: attachmentName || '',
      mediaUrls: mediaUrls || []
    });

    await newRequest.save();

    // Trigger notification immediately
    try {
      const clientUser = await User.findById(client);
      const io = req.app.get('io');

      if (professional) {
        // Direct invitation / application flow
        const professionalUser = await User.findById(professional);
        const senderId = req.user.id;
        const isClientSender = senderId.toString() === client.toString();

        if (isClientSender) {
          // Client invited Professional -> Project Invitation
          const notificationText = `📩 Project Invitation\n${clientUser.fullName} invited you to the project: ${title}\n\n[View Invitation]`;
          const notification = new Notification({
            recipientId: professional,
            senderId: client,
            text: notificationText
          });
          await notification.save();

          if (io) {
            io.to(professional.toString()).emit('new_notification', {
              _id: notification._id,
              recipientId: professional,
              senderId: {
                _id: clientUser._id,
                fullName: clientUser.fullName,
                avatarUrl: clientUser.avatarUrl,
                role: clientUser.role
              },
              text: notification.text,
              isRead: false,
              createdAt: notification.createdAt
            });
          }
        } else {
          // Professional applied to Client -> Contractor Applied (or Architect Applied)
          const isContractor = professionalUser?.role === 'Contractor';
          const roleLabel = isContractor ? 'Contractor' : 'Architect';
          const emoji = isContractor ? '👷' : '📐';
          const notificationText = `${emoji} ${roleLabel} Applied\n${professionalUser.fullName} applied to your project: ${title}\n\n[View Application]`;
          
          const notification = new Notification({
            recipientId: client,
            senderId: professional,
            text: notificationText
          });
          await notification.save();

          if (io) {
            io.to(client.toString()).emit('new_notification', {
              _id: notification._id,
              recipientId: client,
              senderId: {
                _id: professionalUser._id,
                fullName: professionalUser.fullName,
                avatarUrl: professionalUser.avatarUrl,
                role: professionalUser.role
              },
              text: notification.text,
              isRead: false,
              createdAt: notification.createdAt
            });
          }
        }
      } else {
        // Public project posting -> Send notification to all professionals
        const professionals = await User.find({ role: { $in: ['Architect', 'Contractor', 'Labour'] } });
        const notificationText = `🏗 New Project\n${title} posted near ${location}\n\n[View Project]`;

        for (const prof of professionals) {
          const notification = new Notification({
            recipientId: prof._id,
            senderId: client,
            text: notificationText
          });
          await notification.save();

          if (io) {
            io.to(prof._id.toString()).emit('new_notification', {
              _id: notification._id,
              recipientId: prof._id,
              senderId: {
                _id: clientUser._id,
                fullName: clientUser.fullName,
                avatarUrl: clientUser.avatarUrl,
                role: clientUser.role
              },
              text: notification.text,
              isRead: false,
              createdAt: notification.createdAt
            });
          }
        }
      }
    } catch (notifErr) {
      console.error('Error triggering project invitation/application/post notification:', notifErr);
    }
    
    const populatedRequest = await ContractRequest.findById(newRequest._id)
      .populate('client', 'fullName email avatarUrl role phoneNumber city')
      .populate('professional', 'fullName email avatarUrl role');

    // Emit new_contract_request socket event (for public requests only)
    if (!professional) {
      const io = req.app.get('io');
      if (io) {
        io.emit('new_contract_request', populatedRequest);
        console.log(`[Socket] Emitted new_contract_request for request ID ${newRequest._id}`);
      }
    }

    res.status(201).json({ 
      message: 'Contract request sent successfully', 
      contractRequest: populatedRequest
    });
  } catch (error) {
    console.error('Error creating contract request:', error);
    res.status(500).json({ message: 'Error sending contract request: ' + error.message });
  }
});

// Get all contract requests (public posted projects)
app.get('/api/contract-requests', async (req, res) => {
  try {
    const requests = await ContractRequest.find({})
      .populate('client', 'fullName email avatarUrl role phoneNumber city')
      .populate('professional', 'fullName email avatarUrl role')
      .sort({ createdAt: -1 });

    // Filter to only include public requests (client role is 'Client', status is not Cancelled, and no professional is assigned)
    const publicRequestsOnly = requests.filter(
      (item) => item.client && item.client.role === 'Client' && item.status !== 'Cancelled' && !item.professional
    );

    res.status(200).json({ success: true, requests: publicRequestsOnly });
  } catch (error) {
    console.error('Error fetching all contract requests:', error);
    res.status(500).json({ success: false, message: 'Error fetching contract requests: ' + error.message });
  }
});

// 2. Get all requests for a user (either sent as client or received as professional)
app.get('/api/contract-requests/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const requests = await ContractRequest.find({
      $or: [{ client: userId }, { professional: userId }]
    })
    .populate('client', 'fullName email phoneNumber role city avatarUrl')
    .populate('professional', 'fullName email phoneNumber role city avatarUrl')
    .sort({ createdAt: -1 });

    const requestsWithBids = [];
    for (const reqObj of requests) {
      const bids = await ProjectBid.find({ contractRequest: reqObj._id })
        .populate('professional', 'fullName email phoneNumber role city avatarUrl firmName completedProjects rating');
      requestsWithBids.push({
        ...reqObj.toObject(),
        bids: bids || []
      });
    }

    res.status(200).json({ requests: requestsWithBids });
  } catch (error) {
    console.error('Error fetching contract requests:', error);
    res.status(500).json({ message: 'Error fetching contract requests: ' + error.message });
  }
});

// 2.5 Get a single contract request by ID
app.get('/api/contract-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ContractRequest.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl');
    
    if (!request) {
      return res.status(404).json({ message: 'Contract request not found' });
    }
    
    res.status(200).json({ request });
  } catch (error) {
    console.error('Error fetching contract request:', error);
    res.status(500).json({ message: 'Error fetching contract request: ' + error.message });
  }
});

// Edit a contract request/project details
app.put('/api/contract-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, projectType, location, budget, description, timeline, requirements } = req.body;

    const updated = await ContractRequest.findByIdAndUpdate(
      id,
      {
        $set: {
          title,
          projectType,
          location,
          budget,
          description,
          timeline,
          requirements
        }
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.status(200).json({ success: true, message: 'Project updated successfully', request: updated });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ success: false, message: 'Error updating project: ' + error.message });
  }
});

// Delete a contract request/project
app.delete('/api/contract-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ContractRequest.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Delete associated bids
    await ProjectBid.deleteMany({ contractRequest: id });

    res.status(200).json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ success: false, message: 'Error deleting project: ' + error.message });
  }
});

// 3. Accept or Reject a contract request (SINGLE ACCEPTANCE with rejection notifications)
app.put('/api/contract-requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, professional, bidId } = req.body; // 'Accepted' or 'Rejected'

    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status update' });
    }

    const request = await ContractRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Contract request not found' });
    }

    let selectedRole = 'Contractor';
    let professionalUser = null;
    if (professional) {
      professionalUser = await User.findById(professional);
      if (professionalUser) {
        selectedRole = professionalUser.role;
      }
    }

    if (status === 'Accepted') {
      // Check if a bid for a professional of the same role has already been accepted
      const acceptedBids = await ProjectBid.find({ contractRequest: id, status: 'Accepted' }).populate('professional');
      const alreadyAcceptedSameRole = acceptedBids.some(b => b.professional?.role === selectedRole);

      if (alreadyAcceptedSameRole) {
        return res.status(400).json({ message: `A ${selectedRole} has already been accepted for this project.` });
      }
    }

    if (professional) {
      request.professional = professional;
    }

    const io = req.app.get('io');
    const clientUser = await User.findById(request.client);

    if (status === 'Accepted') {
      try {
        // 1. Mark the accepted bid
        if (bidId) {
          await ProjectBid.findByIdAndUpdate(bidId, { status: 'Accepted' });
        } else if (professional) {
          await ProjectBid.findOneAndUpdate(
            { contractRequest: id, professional: professional },
            { status: 'Accepted' }
          );
        }

        // 2. Send acceptance notification to the winning professional
        if (professionalUser) {
          const acceptText = `✅ Proposal Accepted!\nCongratulations! ${clientUser.fullName} accepted your bid for "${request.title}". Project timeline starts now.\n\n[View Project]`;
          const acceptNotif = new Notification({
            recipientId: professional,
            senderId: request.client,
            text: acceptText,
            projectId: id
          });
          await acceptNotif.save();

          if (io) {
            io.to(professional.toString()).emit('new_notification', {
              _id: acceptNotif._id,
              recipientId: professional,
              senderId: { _id: clientUser._id, fullName: clientUser.fullName, avatarUrl: clientUser.avatarUrl, role: clientUser.role },
              text: acceptNotif.text,
              isRead: false,
              createdAt: acceptNotif.createdAt
            });
          }
        }

        // 3. REJECT other bids of the same role only and send rejection notifications
        const otherBids = await ProjectBid.find({
          contractRequest: id,
          professional: { $ne: professional },
          status: 'Pending'
        }).populate('professional', 'fullName avatarUrl role');

        for (const bid of otherBids) {
          if (bid.professional?.role === selectedRole) {
            bid.status = 'Rejected';
            await bid.save();

            // Send rejection notification
            const rejectText = `❌ Bid Not Selected\nYour bid for "${request.title}" was not selected. The client chose another ${selectedRole.toLowerCase()}. Keep applying to new projects!\n\n[Browse Projects]`;
            const rejectNotif = new Notification({
              recipientId: bid.professional._id,
              senderId: request.client,
              text: rejectText,
              projectId: id
            });
            await rejectNotif.save();

            if (io) {
              io.to(bid.professional._id.toString()).emit('new_notification', {
                _id: rejectNotif._id,
                recipientId: bid.professional._id,
                senderId: { _id: clientUser._id, fullName: clientUser.fullName, avatarUrl: clientUser.avatarUrl, role: clientUser.role },
                text: rejectNotif.text,
                isRead: false,
                createdAt: rejectNotif.createdAt
              });
            }
          }
        }

        // 4. Also send confirmation to client
        if (professionalUser) {
          const clientConfirmText = `🎉 Bid Accepted\nYou accepted ${professionalUser.fullName}'s bid for "${request.title}". Project workspace is now active.\n\n[View Progress]`;
          const clientNotif = new Notification({
            recipientId: request.client,
            senderId: professional,
            text: clientConfirmText,
            projectId: id
          });
          await clientNotif.save();

          if (io) {
            io.to(request.client.toString()).emit('new_notification', {
              _id: clientNotif._id,
              recipientId: request.client,
              senderId: { _id: professionalUser._id, fullName: professionalUser.fullName, avatarUrl: professionalUser.avatarUrl, role: professionalUser.role },
              text: clientNotif.text,
              isRead: false,
              createdAt: clientNotif.createdAt
            });
          }
        }
      } catch (notifErr) {
        console.error('Error in acceptance flow notifications:', notifErr);
      }
    }

    let workspace = null;
    if (status === 'Accepted' && professionalUser) {
      const isContractor = selectedRole === 'Contractor';
      const isArchitect = selectedRole === 'Architect';
      const isLabour = selectedRole === 'Labour';

      // Check if a workspace already exists for this request
      const existing = await ProjectWorkspace.findOne({ contractRequest: id });
      if (!existing) {
        // Check if an active workspace with the same client and title already exists
        const sameProjectWorkspace = await ProjectWorkspace.findOne({
          client: request.client,
          title: { $regex: new RegExp(`^${request.title.trim()}$`, 'i') },
          status: { $ne: 'Cancelled' }
        });

        if (sameProjectWorkspace) {
          workspace = sameProjectWorkspace;
          if (isContractor) workspace.contractor = professional;
          if (isArchitect) workspace.architect = professional;
          if (isLabour && !workspace.labourTeam.includes(professional)) {
            workspace.labourTeam.push(professional);
          }
          
          workspace.updates.push({
            title: `${selectedRole} Hired`,
            description: `${professionalUser.fullName} has been hired and added to the project team.`,
            category: 'General',
            postedBy: {
              senderId: request.client,
              senderName: 'System',
              senderRole: 'System'
            },
            createdAt: new Date()
          });
          await workspace.save();
        } else {
          workspace = new ProjectWorkspace({
            contractRequest: id,
            client: request.client,
            professional: professional,
            contractor: isContractor ? professional : (clientUser?.role === 'Contractor' ? request.client : null),
            architect: isArchitect ? professional : (clientUser?.role === 'Architect' ? request.client : null),
            labourTeam: isLabour ? [professional] : [],
            title: request.title,
            projectType: request.projectType || 'General',
            status: 'Active'
          });
          await workspace.save();
        }
      } else {
        workspace = existing;
        if (isContractor) workspace.contractor = professional;
        if (isArchitect) workspace.architect = professional;
        if (isLabour && !workspace.labourTeam.includes(professional)) {
          workspace.labourTeam.push(professional);
        }

        workspace.updates.push({
          title: `${selectedRole} Hired`,
          description: `${professionalUser.fullName} has been hired and added to the project team.`,
          category: 'General',
          postedBy: {
            senderId: request.client,
            senderName: 'System',
            senderRole: 'System'
          },
          createdAt: new Date()
        });
        await workspace.save();
      }
    }

    // Determine the contract request's overall status
    if (status === 'Accepted') {
      const allBids = await ProjectBid.find({ contractRequest: id }).populate('professional');
      const hasAcceptedContractor = allBids.some(b => b.status === 'Accepted' && b.professional?.role === 'Contractor');
      const hasAcceptedArchitect = allBids.some(b => b.status === 'Accepted' && b.professional?.role === 'Architect');
      const hasPendingBids = allBids.some(b => b.status === 'Pending');

      if ((hasAcceptedContractor && hasAcceptedArchitect) || !hasPendingBids) {
        request.status = 'Accepted';
      } else {
        request.status = 'Pending';
      }
    } else {
      request.status = status;
    }
    await request.save();

    // Emit real-time status updates via Socket.io
    if (io) {
      io.emit('contract_status_updated', {
        requestId: id,
        status: request.status
      });
      io.emit('bid_status_updated', {
        requestId: id,
        bidId: bidId || null,
        professionalId: professional || null,
        status: status
      });
      console.log(`[Socket] Emitted contract_status_updated and bid_status_updated for request ${id}`);
    }

    res.status(200).json({ 
      message: `Contract request status updated successfully`, 
      contractRequest: request,
      workspace
    });
  } catch (error) {
    console.error('Error updating contract request:', error);
    res.status(500).json({ message: 'Error updating contract request: ' + error.message });
  }
});

// --- Project Bid Routes (Real contractor applications) ---

// Submit a bid for a contract request
app.post('/api/project-bids', async (req, res) => {
  try {
    const { contractRequest, professional, cost, costValue, duration, durationDays, proposal, siteVisitRequired, portfolioAttachments } = req.body;

    if (!contractRequest || !professional || !cost || !duration) {
      return res.status(400).json({ message: 'Missing required bid fields: contractRequest, professional, cost, duration' });
    }

    // Check if the contract request exists and is still Pending
    const request = await ContractRequest.findById(contractRequest);
    if (!request) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (request.status === 'Accepted') {
      return res.status(400).json({ message: 'This project has already accepted a bid. No more applications allowed.' });
    }

    // Prevent duplicate bids
    const existing = await ProjectBid.findOne({ contractRequest, professional });
    if (existing) {
      return res.status(400).json({ message: 'You have already submitted a bid for this project.' });
    }

    const bid = new ProjectBid({
      contractRequest,
      professional,
      cost,
      costValue: costValue || 0,
      duration,
      durationDays: durationDays || 0,
      proposal: proposal || '',
      siteVisitRequired: !!siteVisitRequired,
      portfolioAttachments: portfolioAttachments || []
    });
    await bid.save();

    // Send notification to the client about new application
    try {
      const professionalUser = await User.findById(professional);
      const clientUser = await User.findById(request.client);
      const io = req.app.get('io');

      const isContractor = professionalUser?.role === 'Contractor';
      const roleLabel = isContractor ? 'Contractor' : (professionalUser?.role || 'Professional');
      const emoji = isContractor ? '👷' : '📐';

      const notifText = `${emoji} ${roleLabel} Applied\n${professionalUser.fullName} submitted a bid of ${cost} for "${request.title}"\n\n[View Applications]`;
      const notification = new Notification({
        recipientId: request.client,
        senderId: professional,
        text: notifText
      });
      await notification.save();

      if (io) {
        io.to(request.client.toString()).emit('new_notification', {
          _id: notification._id,
          recipientId: request.client,
          senderId: { _id: professionalUser._id, fullName: professionalUser.fullName, avatarUrl: professionalUser.avatarUrl, role: professionalUser.role },
          text: notification.text,
          isRead: false,
          createdAt: notification.createdAt
        });

        const populatedBid = await ProjectBid.findById(bid._id).populate('professional');
        io.to(request.client.toString()).emit('new_bid_received', {
          requestId: contractRequest.toString(),
          bid: populatedBid
        });
        console.log(`[Socket] Emitted new_bid_received for bid ID ${bid._id}`);
      }
    } catch (notifErr) {
      console.error('Error sending bid notification:', notifErr);
    }

    res.status(201).json({ message: 'Bid submitted successfully', bid });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already submitted a bid for this project.' });
    }
    console.error('Error submitting bid:', error);
    res.status(500).json({ message: 'Error submitting bid: ' + error.message });
  }
});

// Get all bids for a contract request (with professional details)
app.get('/api/project-bids/request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const bids = await ProjectBid.find({ contractRequest: requestId })
      .populate('professional', 'fullName email phoneNumber role city avatarUrl firmName completedProjects rating')
      .sort({ createdAt: -1 });

    res.status(200).json({ bids, count: bids.length });
  } catch (error) {
    console.error('Error fetching bids:', error);
    res.status(500).json({ message: 'Error fetching bids: ' + error.message });
  }
});

// Get bid count for a contract request
app.get('/api/project-bids/request/:requestId/count', async (req, res) => {
  try {
    const { requestId } = req.params;
    const count = await ProjectBid.countDocuments({ contractRequest: requestId });
    const acceptedBid = await ProjectBid.findOne({ contractRequest: requestId, status: 'Accepted' }).populate('professional', 'fullName');
    
    res.status(200).json({ count, hasAccepted: !!acceptedBid, acceptedBid });
  } catch (error) {
    console.error('Error counting bids:', error);
    res.status(500).json({ message: 'Error counting bids: ' + error.message });
  }
});

// 4. Get all workspaces for a user
app.get('/api/project-workspaces/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Cast userId to ObjectId if valid to ensure mongoose matches correctly
    const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
    const query = userObjId ? {
      $or: [
        { client: userObjId },
        { professional: userObjId },
        { contractor: userObjId },
        { architect: userObjId },
        { labourTeam: userObjId }
      ]
    } : {
      $or: [
        { client: userId },
        { professional: userId },
        { contractor: userId },
        { architect: userId },
        { labourTeam: userId }
      ]
    };

    const workspaces = await ProjectWorkspace.find(query)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate('contractRequest')
      .sort({ createdAt: -1 });

    // If a requesterId is provided and differs from the userId being queried,
    // strip private labour data (attendance, payments) from the response ONLY IF the requester
    // is not the contractor or professional assigned to that workspace.
    const requesterId = req.query.requesterId;
    if (requesterId && requesterId !== userId) {
      const sanitized = workspaces.map(w => {
        const plain = w.toObject ? w.toObject() : { ...w };
        
        // Check if requester is the assigned contractor or professional
        const isContractorOrProfessional = 
          (plain.contractor?._id || plain.contractor)?.toString() === requesterId ||
          (plain.professional?._id || plain.professional)?.toString() === requesterId;

        if (!isContractorOrProfessional) {
          if (plain.labourManagement) {
            plain.labourManagement = {
              ...plain.labourManagement,
              attendance: [],
              payments: []
            };
          }
        }
        return plain;
      });
      return res.status(200).json({ workspaces: sanitized });
    }

    res.status(200).json({ workspaces });

  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ message: 'Error fetching workspaces: ' + error.message });
  }
});

// Direct Hire: creates a ContractRequest (status: Accepted) and a ProjectWorkspace
app.post('/api/project-workspaces/hire', async (req, res) => {
  try {
    const { client, professional, title, category, location, budget, timeline, description } = req.body;
    if (!client || !professional || !title) {
      return res.status(400).json({ message: 'Missing client, professional, or project name (title)' });
    }

    const clientUser = await User.findById(client);
    if (!clientUser) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const professionalUser = await User.findById(professional);
    if (!professionalUser) {
      return res.status(404).json({ message: 'Professional not found' });
    }

    // Create a ContractRequest with Accepted status
    const isContractor = professionalUser.role === 'Contractor';
    const isArchitect = professionalUser.role === 'Architect';
    const isLabour = professionalUser.role === 'Labour';

    const defaultProjectType = isContractor ? 'Residential' : (isArchitect ? 'Architecture' : 'General');
    const finalProjectType = category || defaultProjectType;

    const newRequest = new ContractRequest({
      client,
      professional,
      title,
      projectType: finalProjectType,
      location: location || professionalUser.city || 'Mumbai',
      budget: budget || 'Direct Hire',
      description: description || '',
      timeline: timeline || 'Not Specified',
      status: 'Accepted',
      startDate: new Date()
    });

    await newRequest.save();

    // Create the ProjectWorkspace
    const workspace = new ProjectWorkspace({
      contractRequest: newRequest._id,
      client,
      professional,
      contractor: isContractor ? professional : (clientUser.role === 'Contractor' ? client : null),
      architect: isArchitect ? professional : (clientUser.role === 'Architect' ? client : null),
      labourTeam: isLabour ? [professional] : [],
      title,
      projectType: finalProjectType,
      status: 'Active'
    });

    await workspace.save();

    // Send Notification to the hired professional
    try {
      const io = req.app.get('io');
      const acceptText = `🎉 You've been Hired!\n${clientUser.fullName} has hired you directly for the project: "${title}". A workspace has been created.`;
      const acceptNotif = new Notification({
        recipientId: professional,
        senderId: client,
        text: acceptText
      });
      await acceptNotif.save();

      if (io) {
        io.to(professional.toString()).emit('new_notification', {
          _id: acceptNotif._id,
          recipientId: professional,
          senderId: { _id: clientUser._id, fullName: clientUser.fullName, avatarUrl: clientUser.avatarUrl, role: clientUser.role },
          text: acceptNotif.text,
          isRead: false,
          createdAt: acceptNotif.createdAt
        });
      }
    } catch (notifErr) {
      console.error('Error sending hire notification:', notifErr);
    }

    res.status(201).json({
      message: 'Successfully hired professional and created project workspace.',
      workspace,
      contractRequest: newRequest
    });

  } catch (error) {
    console.error('Error hiring professional:', error);
    res.status(500).json({ message: 'Error hiring professional: ' + error.message });
  }
});

app.get('/api/project-workspaces/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid workspace ID format' });
    }
    const userId = req.query.userId;

    const workspace = await ProjectWorkspace.findById(req.params.id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate('contractRequest')
      .populate({
        path: 'messages.sender',
        select: 'fullName email role avatarUrl'
      });

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const isMember = 
      workspace.client?._id?.toString() === userId || 
      workspace.client?.toString() === userId ||
      workspace.professional?._id?.toString() === userId || 
      workspace.professional?.toString() === userId ||
      workspace.contractor?._id?.toString() === userId || 
      workspace.contractor?.toString() === userId ||
      workspace.architect?._id?.toString() === userId || 
      workspace.architect?.toString() === userId ||
      workspace.labourTeam?.some(l => (l._id?.toString() === userId || l.toString() === userId));

    if (!isMember) {
      return res.status(403).json({ message: 'Forbidden: You are not assigned to this project workspace' });
    }

    res.status(200).json({ workspace });
  } catch (error) {
    console.error('Error fetching workspace details:', error);
    res.status(500).json({ message: 'Error fetching workspace: ' + error.message });
  }
});

app.post('/api/project-workspaces/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid workspace ID format' });
    }
    const { text, attachment, sender } = req.body;

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const isMember = 
      workspace.client?.toString() === sender ||
      workspace.professional?.toString() === sender ||
      workspace.contractor?.toString() === sender ||
      workspace.architect?.toString() === sender ||
      workspace.labourTeam?.some(l => l.toString() === sender);

    if (!isMember) {
      return res.status(403).json({ message: 'Forbidden: You are not a member of this workspace' });
    }

    const newMessage = {
      sender,
      text: text || '',
      attachment: attachment || null,
      createdAt: new Date()
    };

    workspace.messages.push(newMessage);
    
    // If there is an attachment, also add it to the shared files list
    if (attachment) {
      workspace.files.push({
        name: attachment.name,
        url: attachment.url,
        uploadedBy: sender,
        createdAt: new Date()
      });
    }

    await workspace.save();

    // Send push notification to other participants in the workspace
    try {
      const senderUser = await User.findById(sender);
      const participants = [
        workspace.client,
        workspace.professional,
        workspace.contractor,
        workspace.architect,
        ...(workspace.labourTeam || [])
      ];

      const membersSet = new Set();
      participants.forEach(pId => {
        if (pId && pId.toString() !== sender) {
          membersSet.add(pId.toString());
        }
      });

      for (const recipientId of membersSet) {
        const notification = new Notification({
          recipientId,
          senderId: sender,
          text: `💬 New Message in ${workspace.title}\n${senderUser ? senderUser.fullName : 'Someone'}: "${text || 'Sent an attachment'}"`,
          workspaceId: workspace._id.toString()
        });
        await notification.save();
      }
    } catch (notifErr) {
      console.error('Error generating notification for workspace message:', notifErr);
    }


    const updatedWorkspace = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate('contractRequest')
      .populate({
        path: 'messages.sender',
        select: 'fullName email role avatarUrl'
      });

    const savedMsg = updatedWorkspace.messages[updatedWorkspace.messages.length - 1];
    const io = req.app.get('io');
    if (io) {
      // 1. Emit to workspace room
      io.to(id).emit('receive_message', {
        workspaceId: id,
        message: savedMsg
      });

      // 2. Emit to other participants' personal rooms
      const participants = [
        workspace.client,
        workspace.professional,
        workspace.contractor,
        workspace.architect,
        ...(workspace.labourTeam || [])
      ];

      participants.forEach(p => {
        if (!p) return;
        const participantId = p._id ? p._id.toString() : p.toString();
        if (participantId !== sender.toString()) {
          io.to(participantId).emit('receive_message', {
            workspaceId: id,
            message: savedMsg
          });
          io.to(`user:${participantId}`).emit('receive_message', {
            workspaceId: id,
            message: savedMsg
          });
        }
      });
    }

    res.status(201).json({ message: 'Message sent successfully', workspace: updatedWorkspace });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message: ' + error.message });
  }
});

// 7. Update quotation details or status (With role enforcement)
app.put('/api/project-workspaces/:id/quotation', async (req, res) => {
  try {
    const { id } = req.params;
    const { items, totalCost, status, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Role-based quotation checks:
    if (status === 'Sent') {
      const isContractor = workspace.contractor?.toString() === userId || workspace.professional?.toString() === userId;
      if (!isContractor) {
        return res.status(403).json({ message: 'Forbidden: Only the assigned contractor can send a quotation' });
      }
    } else if (status === 'Accepted' || status === 'Rejected' || status === 'Changes Requested') {
      const isClient = workspace.client?.toString() === userId;
      if (!isClient) {
        return res.status(403).json({ message: 'Forbidden: Only the client can accept, reject, or request changes on the quotation' });
      }
    } else {
      // Modify draft items
      const isContractor = workspace.contractor?.toString() === userId || workspace.professional?.toString() === userId;
      if (!isContractor) {
        return res.status(403).json({ message: 'Forbidden: Only the contractor can prepare quotation drafts' });
      }
    }

    if (items) workspace.quotation.items = items;
    if (totalCost !== undefined) workspace.quotation.totalCost = totalCost;
    if (status) workspace.quotation.status = status;

    // Add a system notification message about the quotation state change
    let statusText = '';
    if (status === 'Sent') {
      statusText = `Contractor sent a quotation of ₹${totalCost.toLocaleString('en-IN')}`;
    } else if (status === 'Accepted') {
      statusText = `Client accepted the quotation of ₹${workspace.quotation.totalCost.toLocaleString('en-IN')}`;
      workspace.status = 'Active'; // Automatically promote project status to Active when quotation is accepted!
    } else if (status === 'Rejected') {
      statusText = `Client rejected the quotation`;
    } else if (status === 'Changes Requested') {
      statusText = `Client requested changes to the quotation`;
    }

    if (statusText) {
      const senderId = (status === 'Sent') ? workspace.professional : workspace.client;
      workspace.messages.push({
        sender: senderId,
        text: `📢 ${statusText}`,
        createdAt: new Date()
      });
    }

    await workspace.save();

    const updatedWorkspace = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate({
        path: 'messages.sender',
        select: 'fullName email role avatarUrl'
      });

    res.status(200).json({ message: 'Quotation updated successfully', workspace: updatedWorkspace });
  } catch (error) {
    console.error('Error updating quotation:', error);
    res.status(500).json({ message: 'Error updating quotation: ' + error.message });
  }
});

// 8. Upload a file directly to the workspace (With membership check)
app.post('/api/project-workspaces/:id/files', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, uploadedBy } = req.body;

    if (!name || !url || !uploadedBy) {
      return res.status(400).json({ message: 'Missing file details' });
    }

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const isMember = 
      workspace.client?.toString() === uploadedBy ||
      workspace.professional?.toString() === uploadedBy ||
      workspace.contractor?.toString() === uploadedBy ||
      workspace.architect?.toString() === uploadedBy ||
      workspace.labourTeam?.some(l => l.toString() === uploadedBy);

    if (!isMember) {
      return res.status(403).json({ message: 'Forbidden: You are not a member of this workspace' });
    }

    workspace.files.push({
      name,
      url,
      uploadedBy,
      createdAt: new Date()
    });

    // Also send a system message in the chat that a file was uploaded
    workspace.messages.push({
      sender: uploadedBy,
      text: `📁 Uploaded file: ${name}`,
      createdAt: new Date()
    });

    await workspace.save();

    // Trigger notification immediately for Document Shared
    try {
      const uploaderUser = await User.findById(uploadedBy);
      
      const members = new Set();
      if (workspace.client && workspace.client.toString() !== uploadedBy) members.add(workspace.client.toString());
      if (workspace.professional && workspace.professional.toString() !== uploadedBy) members.add(workspace.professional.toString());
      if (workspace.contractor && workspace.contractor.toString() !== uploadedBy) members.add(workspace.contractor.toString());
      if (workspace.architect && workspace.architect.toString() !== uploadedBy) members.add(workspace.architect.toString());
      if (workspace.labourTeam) {
        workspace.labourTeam.forEach(l => {
          if (l.toString() !== uploadedBy) members.add(l.toString());
        });
      }

      const io = req.app.get('io');
      for (const recipientId of members) {
        const notification = new Notification({
          recipientId,
          senderId: uploadedBy,
          text: `📁 Document Shared\n${uploaderUser.fullName} shared "${name}" in ${workspace.title}\n\n[View Document]`
        });
        await notification.save();

        if (io) {
          io.to(recipientId).emit('new_notification', {
            _id: notification._id,
            recipientId,
            senderId: {
              _id: uploaderUser._id,
              fullName: uploaderUser.fullName,
              avatarUrl: uploaderUser.avatarUrl,
              role: uploaderUser.role
            },
            text: notification.text,
            isRead: false,
            createdAt: notification.createdAt
          });
        }
      }
    } catch (notifErr) {
      console.error('Error triggering document shared notifications:', notifErr);
    }

    const updatedWorkspace = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate({
        path: 'messages.sender',
        select: 'fullName email role avatarUrl'
      });

    res.status(201).json({ message: 'File uploaded successfully', workspace: updatedWorkspace });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Error uploading file: ' + error.message });
  }
});

// 9. Assign Architect to a project (With role enforcement)
app.put('/api/project-workspaces/:id/assign-architect', async (req, res) => {
  try {
    const { id } = req.params;
    const { architectId, userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const isClient = workspace.client?.toString() === userId;
    const isContractor = workspace.contractor?.toString() === userId || workspace.professional?.toString() === userId;
    if (!isClient && !isContractor) {
      return res.status(403).json({ message: 'Forbidden: Only the client or contractor can assign an architect' });
    }
    
    const arch = await User.findById(architectId);
    if (!arch || arch.role !== 'Architect') {
      return res.status(400).json({ message: 'Invalid Architect selected' });
    }
    
    workspace.architect = architectId;
    workspace.updates.push({
      title: 'Architect Assigned',
      description: `Ar. ${arch.fullName} has been assigned to the project.`,
      category: 'General',
      postedBy: {
        senderId: userId,
        senderName: 'System',
        senderRole: 'System'
      },
      createdAt: new Date()
    });
    await workspace.save();
    
    const updated = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate({ path: 'messages.sender', select: 'fullName email role avatarUrl' });
      
    emitWorkspaceUpdate(req, id, updated);
    res.status(200).json({ message: 'Architect assigned successfully', workspace: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 9b. Assign Contractor to a project (by client or architect/professional with check)
app.put('/api/project-workspaces/:id/assign-contractor', async (req, res) => {
  try {
    const { id } = req.params;
    const { contractorId, userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const isClient = workspace.client?.toString() === userId;
    const isArchitect = workspace.architect?.toString() === userId || workspace.professional?.toString() === userId;
    if (!isClient && !isArchitect) {
      return res.status(403).json({ message: 'Forbidden: Only the client or architect can assign a contractor' });
    }
    
    const contr = await User.findById(contractorId);
    if (!contr || contr.role !== 'Contractor') {
      return res.status(400).json({ message: 'Invalid Contractor selected' });
    }
    
    workspace.contractor = contractorId;
    workspace.updates.push({
      title: 'Contractor Assigned',
      description: `Contractor ${contr.fullName} has been assigned to the project.`,
      category: 'General',
      postedBy: {
        senderId: userId,
        senderName: 'System',
        senderRole: 'System'
      },
      createdAt: new Date()
    });
    await workspace.save();
    
    const updated = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate({ path: 'messages.sender', select: 'fullName email role avatarUrl' });
      
    emitWorkspaceUpdate(req, id, updated);
    res.status(200).json({ message: 'Contractor assigned successfully', workspace: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 10. Add Labour to a project (With role enforcement)
app.put('/api/project-workspaces/:id/add-labour', async (req, res) => {
  try {
    const { id } = req.params;
    const { labourId, userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const sender = await User.findById(userId);
    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }
    if (sender.role === 'Architect') {
      return res.status(403).json({ message: 'Forbidden: Architects cannot add labour. Only assigned contractors can add labour.' });
    }

    const isClient = workspace.client?.toString() === userId;
    const isContractor = workspace.contractor?.toString() === userId || 
                         (workspace.professional?.toString() === userId && sender.role === 'Contractor');
    if (!isClient && !isContractor) {
      return res.status(403).json({ message: 'Forbidden: Only the client or contractor can add labour to the project' });
    }
    
    const lab = await User.findById(labourId);
    if (!lab || lab.role !== 'Labour') {
      return res.status(400).json({ message: 'Invalid Labour user selected' });
    }
    
    if (workspace.labourTeam.includes(labourId)) {
      return res.status(400).json({ message: 'Labourer already in the team' });
    }
    
    workspace.labourTeam.push(labourId);
    workspace.updates.push({
      title: 'Labourer Added',
      description: `${lab.fullName} (${lab.skillType || 'Skilled Labour'}) has joined the project team.`,
      category: 'General',
      postedBy: {
        senderId: userId,
        senderName: 'System',
        senderRole: 'System'
      },
      createdAt: new Date()
    });
    await workspace.save();

    // Trigger notification immediately for Labour Joined Project
    try {
      const contractorUser = await User.findById(userId);
      const notificationText = `👷 Labour Joined Project\nYou have been added to the project workspace: ${workspace.title}\n\n[View Project]`;

      const notification = new Notification({
        recipientId: labourId,
        senderId: userId,
        text: notificationText
      });
      await notification.save();

      const io = req.app.get('io');
      if (io) {
        io.to(labourId.toString()).emit('new_notification', {
          _id: notification._id,
          recipientId: labourId,
          senderId: {
            _id: contractorUser._id,
            fullName: contractorUser.fullName,
            avatarUrl: contractorUser.avatarUrl,
            role: contractorUser.role
          },
          text: notification.text,
          isRead: false,
          createdAt: notification.createdAt
        });
      }
    } catch (notifErr) {
      console.error('Error triggering labour joined notification:', notifErr);
    }
    
    const updated = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate({ path: 'messages.sender', select: 'fullName email role avatarUrl' });
      
    emitWorkspaceUpdate(req, id, updated);
    res.status(200).json({ message: 'Labour added successfully', workspace: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 11. Remove Labour from a project (With role enforcement)
app.put('/api/project-workspaces/:id/remove-labour', async (req, res) => {
  try {
    const { id } = req.params;
    const { labourId, userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const sender = await User.findById(userId);
    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }
    if (sender.role === 'Architect') {
      return res.status(403).json({ message: 'Forbidden: Architects cannot remove labour. Only assigned contractors can remove labour.' });
    }

    const isClient = workspace.client?.toString() === userId;
    const isContractor = workspace.contractor?.toString() === userId || 
                         (workspace.professional?.toString() === userId && sender.role === 'Contractor');
    if (!isClient && !isContractor) {
      return res.status(403).json({ message: 'Forbidden: Only the client or contractor can remove labour from the project' });
    }
    
    workspace.labourTeam = workspace.labourTeam.filter(lId => lId.toString() !== labourId);
    
    const lab = await User.findById(labourId);
    const name = lab ? lab.fullName : 'Labourer';
    
    workspace.updates.push({
      title: 'Labourer Removed',
      description: `${name} has been removed from the project team.`,
      category: 'General',
      postedBy: {
        senderId: userId,
        senderName: 'System',
        senderRole: 'System'
      },
      createdAt: new Date()
    });
    await workspace.save();
    
    const updated = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate({ path: 'messages.sender', select: 'fullName email role avatarUrl' });
      
    emitWorkspaceUpdate(req, id, updated);
    res.status(200).json({ message: 'Labour removed successfully', workspace: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 12. Update project status (by client/contractor/architect with check)
app.put('/api/project-workspaces/:id/project-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, senderId, reworkComment } = req.body; // 'Discussion', 'Active', 'Waiting for Client Approval', 'Rework Required', 'Completed'
    
    if (!senderId) {
      return res.status(400).json({ message: 'Sender ID is required' });
    }

    const allowedStatuses = ['Discussion', 'Active', 'Waiting for Client Approval', 'Rework Required', 'Completed', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    
    const getUserIdStr = (u) => {
      if (!u) return '';
      if (typeof u === 'string') return u;
      return u._id ? u._id.toString() : u.toString();
    };
    
    const isClient = getUserIdStr(workspace.client) === senderId;
    const isContractor = getUserIdStr(workspace.professional) === senderId || getUserIdStr(workspace.contractor) === senderId;

    if (status === 'Completed' || status === 'Rework Required' || status === 'Cancelled') {
      if (!isClient) {
        return res.status(403).json({ message: 'Forbidden: Only the client can approve work, request changes, or cancel the project.' });
      }
    }

    if (status === 'Waiting for Client Approval') {
      if (!isContractor) {
        return res.status(403).json({ message: 'Forbidden: Only the contractor can mark the work as completed.' });
      }
    }

    const oldStatus = workspace.status;
    workspace.status = status;
    
    const senderUser = await User.findById(senderId);
    const senderName = senderUser ? senderUser.fullName : 'System';
    let senderRoleName = senderUser ? senderUser.role : 'Member';
    if (senderRoleName === 'Labour') {
      senderRoleName = 'Labour Supervisor';
    }

    // Add Timeline Update representing the status change
    let updateTitle = `Project Status: ${status}`;
    let updateDesc = `Status changed from ${oldStatus} to ${status}.`;
    let updateCategory = 'General';

    if (status === 'Waiting for Client Approval') {
      updateTitle = "Work Completed - Waiting for Approval";
      updateDesc = "Contractor has marked the work as completed. Waiting for client approval.";
      updateCategory = "Milestone";
    } else if (status === 'Rework Required') {
      updateTitle = "Rework Required";
      updateDesc = `Client requested changes. Comment: "${reworkComment || 'No comment provided'}"`;
      updateCategory = "General";
    } else if (status === 'Completed') {
      updateTitle = "Project Completed & Approved";
      updateDesc = "Client approved the work. Ratings are now enabled and final payment can be released.";
      updateCategory = "Milestone";
    } else if (status === 'Active') {
      updateTitle = "Project Activated";
      updateDesc = "The project is active and work is in progress.";
      updateCategory = "Milestone";
    } else if (status === 'Cancelled') {
      updateTitle = "Project Cancelled";
      updateDesc = `Client cancelled the project. Reason/Inconvenience: "${reworkComment || 'Not specified'}"`;
      updateCategory = "General";
    }

    workspace.updates.push({
      title: updateTitle,
      description: updateDesc,
      category: updateCategory,
      postedBy: {
        senderId,
        senderName,
        senderRole: senderRoleName
      },
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: new Date()
    });
    
    await workspace.save();

    // Increment/decrement project count for all participants
    if (status === 'Completed' && oldStatus !== 'Completed') {
      const participants = new Set();
      if (workspace.client) participants.add(workspace.client.toString());
      if (workspace.architect) participants.add(workspace.architect.toString());
      if (workspace.contractor) participants.add(workspace.contractor.toString());
      if (workspace.professional) participants.add(workspace.professional.toString());
      
      for (const pId of participants) {
        await User.findByIdAndUpdate(pId, { $inc: { projects: 1 } });
      }
    } else if (status !== 'Completed' && oldStatus === 'Completed') {
      const participants = new Set();
      if (workspace.client) participants.add(workspace.client.toString());
      if (workspace.architect) participants.add(workspace.architect.toString());
      if (workspace.contractor) participants.add(workspace.contractor.toString());
      if (workspace.professional) participants.add(workspace.professional.toString());
      
      for (const pId of participants) {
        await User.findByIdAndUpdate(pId, { $inc: { projects: -1 } });
      }
    }
    
    const updated = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate({ path: 'messages.sender', select: 'fullName email role avatarUrl' });
      
    emitWorkspaceUpdate(req, id, updated);
    res.status(200).json({ message: 'Status updated successfully', workspace: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Rate and review a member of the project workspace
app.post('/api/project-workspaces/:id/ratings', async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, rating, reviewText, criteria } = req.body;

    if (!from || !to || !rating || !criteria) {
      return res.status(400).json({ message: 'From, To, Rating, and Criteria are required' });
    }

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Only the client of this workspace is allowed to submit ratings
    if (workspace.client?.toString() !== from.toString()) {
      return res.status(403).json({ message: 'Forbidden: Only the client of this project can rate members.' });
    }

    if (workspace.status !== 'Completed') {
      return res.status(400).json({ message: 'Ratings can only be submitted once the project is Completed' });
    }

    // Check if rating from -> to already exists in this workspace
    const existingRating = workspace.ratings.find(
      r => r.from.toString() === from.toString() && r.to.toString() === to.toString()
    );
    if (existingRating) {
      return res.status(400).json({ message: 'You have already rated this user for this project.' });
    }

    workspace.ratings.push({
      from,
      to,
      rating: Number(rating),
      reviewText: reviewText || '',
      criteria: criteria,
      createdAt: new Date()
    });

    await workspace.save();

    // Recalculate average rating and reviews count for target user
    const workspacesWithRatings = await ProjectWorkspace.find({ 'ratings.to': to });
    const allRatingsForUser = [];
    for (const ws of workspacesWithRatings) {
      for (const r of ws.ratings) {
        if (r.to.toString() === to.toString()) {
          allRatingsForUser.push(r.rating);
        }
      }
    }
    const reviewsCount = allRatingsForUser.length;
    const avgRating = reviewsCount > 0 ? (allRatingsForUser.reduce((sum, val) => sum + val, 0) / reviewsCount) : 0;

    const updatedUser = await User.findByIdAndUpdate(to, {
      rating: parseFloat(avgRating.toFixed(1)),
      reviews: reviewsCount
    }, { new: true });

    // Emit profile_updated socket event
    const ioInstance = req.app.get('io');
    if (ioInstance) {
      ioInstance.emit('profile_updated', {
        userId: to.toString(),
        user: updatedUser
      });
      console.log(`[Socket] Emitted profile_updated for user ${to} (rating update)`);
    }

    const updated = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate({ path: 'messages.sender', select: 'fullName email role avatarUrl' });

    emitWorkspaceUpdate(req, id, updated);
    res.status(200).json({ message: 'Rating submitted successfully', workspace: updated });
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ message: 'Error submitting rating: ' + error.message });
  }
});

// 13. Post progress timeline update to workspace
app.post('/api/project-workspaces/:id/updates', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, img, video, senderId } = req.body;

    if (!title || !senderId) {
      return res.status(400).json({ message: 'Title and Sender ID are required' });
    }

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Restriction: Only the assigned contractor, architect, or labour team members can post updates
    const isAssignedContractorOrArchitectOrLabour = 
      workspace.professional?.toString() === senderId ||
      workspace.contractor?.toString() === senderId ||
      workspace.architect?.toString() === senderId ||
      workspace.labourTeam?.some(lId => lId.toString() === senderId);

    if (!isAssignedContractorOrArchitectOrLabour) {
      return res.status(403).json({ message: 'Forbidden: Only the assigned contractor, architect, or labour team members can post progress updates.' });
    }


    const user = await User.findById(senderId);
    let senderRoleName = user ? user.role : 'Member';
    if (senderRoleName === 'Labour') {
      senderRoleName = 'Labour Supervisor';
    }

    const newUpdate = {
      title,
      description: description || '',
      category: category || 'General',
      img: img || '',
      video: video || '',
      postedBy: {
        senderId,
        senderName: user ? user.fullName : 'Unknown',
        senderRole: senderRoleName
      },
      likes: 0,
      likedBy: [],
      comments: []
    };

    workspace.updates.push(newUpdate);

    await workspace.save();

    // Trigger notification immediately for Project Milestone Completed
    try {
      const senderUser = await User.findById(senderId);
      const roleLabel = senderUser?.role || 'Contractor';
      const notificationText = `✅ ${title}\n\n${roleLabel} ${senderUser ? senderUser.fullName : ''} uploaded progress photos\n\n[View Progress]`;

      // Notify other members
      const members = new Set();
      if (workspace.client && workspace.client.toString() !== senderId) members.add(workspace.client.toString());
      if (workspace.professional && workspace.professional.toString() !== senderId) members.add(workspace.professional.toString());
      if (workspace.contractor && workspace.contractor.toString() !== senderId) members.add(workspace.contractor.toString());
      if (workspace.architect && workspace.architect.toString() !== senderId) members.add(workspace.architect.toString());

      const io = req.app.get('io');
      for (const recipientId of members) {
        const notification = new Notification({
          recipientId,
          senderId,
          text: notificationText
        });
        await notification.save();

        if (io) {
          io.to(recipientId).emit('new_notification', {
            _id: notification._id,
            recipientId,
            senderId: {
              _id: senderUser._id,
              fullName: senderUser.fullName,
              avatarUrl: senderUser.avatarUrl,
              role: senderUser.role
            },
            text: notification.text,
            isRead: false,
            createdAt: notification.createdAt
          });
        }
      }
    } catch (notifErr) {
      console.error('Error triggering milestone notification:', notifErr);
    }

    const updated = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate({ path: 'messages.sender', select: 'fullName email role avatarUrl' });

    emitWorkspaceUpdate(req, id, updated);
    res.status(201).json({ message: 'Progress update posted successfully', workspace: updated });
  } catch (error) {
    console.error('Error posting update:', error);
    res.status(500).json({ message: 'Error posting update: ' + error.message });
  }
});

// Edit a progress timeline update
app.put('/api/project-workspaces/:id/updates/:updateId', async (req, res) => {
  try {
    const { id, updateId } = req.params;
    const { title, description, category, img, video, senderId } = req.body;

    if (!title || !senderId) {
      return res.status(400).json({ message: 'Title and Sender ID are required' });
    }

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Restriction: Only the assigned contractor, architect, or labour team members can edit updates
    const isAssignedContractorOrArchitectOrLabour = 
      workspace.professional?.toString() === senderId ||
      workspace.contractor?.toString() === senderId ||
      workspace.architect?.toString() === senderId ||
      workspace.labourTeam?.some(lId => lId.toString() === senderId);

    if (!isAssignedContractorOrArchitectOrLabour) {
      return res.status(403).json({ message: 'Forbidden: Only the assigned contractor, architect, or labour team members can edit progress updates.' });
    }


    const update = workspace.updates.id(updateId);
    if (!update) {
      return res.status(404).json({ message: 'Update not found' });
    }

    // Author check: Only the poster of the update can edit (fallback to isProfessional for legacy updates without postedBy.senderId)
    const isProfessional = 
      workspace.professional?.toString() === senderId || 
      workspace.contractor?.toString() === senderId;

    const isAuthor = update.postedBy?.senderId 
      ? (update.postedBy.senderId.toString() === senderId)
      : isProfessional;

    if (!isAuthor) {
      return res.status(403).json({ message: 'Forbidden: You can only edit your own progress updates.' });
    }

    // Apply updates
    update.title = title;
    update.description = description || '';
    update.category = category || 'General';
    if (img !== undefined) {
      update.img = img;
    }
    if (video !== undefined) {
      update.video = video;
    }

    await workspace.save();

    const updated = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate({ path: 'messages.sender', select: 'fullName email role avatarUrl' });

    emitWorkspaceUpdate(req, id, updated);
    res.status(200).json({ message: 'Progress update updated successfully', workspace: updated });
  } catch (error) {
    console.error('Error editing update:', error);
    res.status(500).json({ message: 'Error editing update: ' + error.message });
  }
});

// 14. Like/Unlike a progress timeline update
app.post('/api/project-workspaces/:id/updates/:updateId/like', async (req, res) => {
  try {
    const { id, updateId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Membership check
    const isMember = 
      workspace.client?.toString() === userId ||
      workspace.professional?.toString() === userId ||
      workspace.contractor?.toString() === userId ||
      workspace.architect?.toString() === userId ||
      workspace.labourTeam?.some(l => l.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ message: 'Forbidden: You are not assigned to this workspace' });
    }

    const update = workspace.updates.id(updateId);
    if (!update) {
      return res.status(404).json({ message: 'Update not found' });
    }

    const userIndex = update.likedBy.indexOf(userId);
    if (userIndex > -1) {
      // Unlike
      update.likedBy.splice(userIndex, 1);
      update.likes = Math.max(0, update.likes - 1);
    } else {
      // Like
      update.likedBy.push(userId);
      update.likes += 1;
    }

    await workspace.save();

    const updated = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate({ path: 'messages.sender', select: 'fullName email role avatarUrl' });

    emitWorkspaceUpdate(req, id, updated);
    res.status(200).json({ message: 'Like toggled successfully', workspace: updated });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ message: 'Error toggling like: ' + error.message });
  }
});

// 15. Comment on a progress timeline update
app.post('/api/project-workspaces/:id/updates/:updateId/comments', async (req, res) => {
  try {
    const { id, updateId } = req.params;
    const { sender, senderName, text } = req.body;

    if (!sender || !senderName || !text) {
      return res.status(400).json({ message: 'Sender, SenderName, and Text are required' });
    }

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Membership check
    const isMember = 
      workspace.client?.toString() === sender ||
      workspace.professional?.toString() === sender ||
      workspace.contractor?.toString() === sender ||
      workspace.architect?.toString() === sender ||
      workspace.labourTeam?.some(l => l.toString() === sender);

    if (!isMember) {
      return res.status(403).json({ message: 'Forbidden: You are not assigned to this workspace' });
    }

    const update = workspace.updates.id(updateId);
    if (!update) {
      return res.status(404).json({ message: 'Update not found' });
    }

    update.comments.push({
      sender,
      senderName,
      text,
      createdAt: new Date()
    });

    await workspace.save();

    const updated = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate({ path: 'messages.sender', select: 'fullName email role avatarUrl' });

    emitWorkspaceUpdate(req, id, updated);
    res.status(201).json({ message: 'Comment added successfully', workspace: updated });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Error adding comment: ' + error.message });
  }
});

// Labour Today's Work Status — check if labour has an active project today and attendance status
app.get('/api/labour/today-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find active workspaces where this labour is in the team
    const activeWorkspaces = await ProjectWorkspace.find({
      labourTeam: userId,
      status: { $nin: ['Completed', 'Cancelled'] }
    })
      .populate('contractRequest', 'location')
      .populate('contractor', 'fullName')
      .populate('professional', 'fullName')
      .lean();

    if (!activeWorkspaces || activeWorkspaces.length === 0) {
      return res.status(200).json({ hasActiveProject: false });
    }

    // Use the first active workspace
    const ws = activeWorkspaces[0];
    const location = ws.contractRequest?.location || '';

    // Check today's attendance
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let checkedIn = false;
    let checkInTime = null;
    let isApproved = false;

    const attendance = ws.labourManagement?.attendance || [];
    const todayEntry = attendance.find(a => a.date === todayStr);

    if (todayEntry) {
      const labourRecord = todayEntry.records?.find(r => {
        const rId = r.labourId?._id || r.labourId;
        return rId?.toString() === userId;
      });

      if (labourRecord) {
        checkedIn = true;
        isApproved = labourRecord.isMarked === true;
        checkInTime = labourRecord.checkInTime || todayEntry.createdAt || today.toISOString();
      }
    }

    res.status(200).json({
      hasActiveProject: true,
      workspace: {
        _id: ws._id,
        title: ws.title,
        location: location,
        contractor: ws.contractor?.fullName || ws.professional?.fullName || ''
      },
      checkedIn,
      checkInTime,
      isApproved
    });
  } catch (error) {
    console.error('Error fetching labour today status:', error);
    res.status(500).json({ message: 'Error fetching today status: ' + error.message });
  }
});

// 16. Record Labour Attendance
app.post('/api/project-workspaces/:id/labour/attendance', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, records, senderId } = req.body;

    if (!date || !records || !senderId) {
      return res.status(400).json({ message: 'Date, records, and senderId are required' });
    }

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const isContractor = workspace.contractor?.toString() === senderId || workspace.professional?.toString() === senderId;

    // Check if the sender is a registered labour in this workspace
    const isLabourMember = workspace.labourTeam?.some(l => l?.toString() === senderId);

    if (!isContractor && !isLabourMember) {
      return res.status(403).json({ message: 'Forbidden: Only contractor or assigned labour can update attendance' });
    }

    if (!workspace.labourManagement) {
      workspace.labourManagement = { attendance: [], payments: [] };
    }

    // Find if date already exists
    const existingDateIndex = workspace.labourManagement.attendance.findIndex(a => a.date === date);

    if (isLabourMember && !isContractor) {
      // Labour can ONLY update their own GPS coordinates — not status/hours/other records
      const gpsRecord = records.find(r => r.labourId?.toString() === senderId);
      if (!gpsRecord) {
        return res.status(400).json({ message: 'Labour can only update their own GPS check-in.' });
      }

      if (existingDateIndex > -1) {
        // Find the labour's own record and only patch check-in data
        const existingRecords = workspace.labourManagement.attendance[existingDateIndex].records || [];
        const ownRecordIdx = existingRecords.findIndex(r => (r.labourId?._id || r.labourId)?.toString() === senderId);
        if (ownRecordIdx > -1) {
          existingRecords[ownRecordIdx].latitude = gpsRecord.latitude;
          existingRecords[ownRecordIdx].longitude = gpsRecord.longitude;
          existingRecords[ownRecordIdx].checkInTime = gpsRecord.checkInTime;
          existingRecords[ownRecordIdx].checkOutTime = gpsRecord.checkOutTime;
          existingRecords[ownRecordIdx].address = gpsRecord.address;
          existingRecords[ownRecordIdx].distanceFromSite = gpsRecord.distanceFromSite;
          existingRecords[ownRecordIdx].googleMapsLink = gpsRecord.googleMapsLink;
          existingRecords[ownRecordIdx].isMarked = false;
        } else {
          // No existing record for this labour yet — add entry
          existingRecords.push({
            labourId: senderId,
            status: gpsRecord.status || 'Present',
            hours: gpsRecord.hours || 0,
            latitude: gpsRecord.latitude,
            longitude: gpsRecord.longitude,
            checkInTime: gpsRecord.checkInTime,
            checkOutTime: gpsRecord.checkOutTime,
            address: gpsRecord.address,
            distanceFromSite: gpsRecord.distanceFromSite,
            googleMapsLink: gpsRecord.googleMapsLink,
            isMarked: false
          });
        }
        workspace.markModified('labourManagement');
      } else {
        // No attendance entry for this date yet — create one with GPS data
        workspace.labourManagement.attendance.push({
          date,
          records: [{
            labourId: senderId,
            status: gpsRecord.status || 'Present',
            hours: gpsRecord.hours || 0,
            latitude: gpsRecord.latitude,
            longitude: gpsRecord.longitude,
            checkInTime: gpsRecord.checkInTime,
            checkOutTime: gpsRecord.checkOutTime,
            address: gpsRecord.address,
            distanceFromSite: gpsRecord.distanceFromSite,
            googleMapsLink: gpsRecord.googleMapsLink,
            isMarked: false
          }],
          markedBy: senderId
        });
      }
    } else {
      // Contractor — full write access to all records
      const markedRecords = records.map(r => ({
        ...r,
        isMarked: true
      }));

      if (existingDateIndex > -1) {
        // Merge records to keep other labourers' GPS check-ins intact
        const existingRecords = workspace.labourManagement.attendance[existingDateIndex].records || [];
        markedRecords.forEach(mr => {
          const idx = existingRecords.findIndex(er => (er.labourId?._id || er.labourId)?.toString() === mr.labourId?.toString());
          if (idx > -1) {
            const existing = existingRecords[idx].toObject ? existingRecords[idx].toObject() : existingRecords[idx];
            existingRecords[idx] = {
              ...existing,
              ...mr,
              checkInTime: mr.checkInTime !== undefined && mr.checkInTime !== null ? mr.checkInTime : existing.checkInTime,
              checkOutTime: mr.checkOutTime !== undefined && mr.checkOutTime !== null ? mr.checkOutTime : existing.checkOutTime,
              address: mr.address !== undefined && mr.address !== null ? mr.address : existing.address,
              distanceFromSite: mr.distanceFromSite !== undefined && mr.distanceFromSite !== null ? mr.distanceFromSite : existing.distanceFromSite,
              googleMapsLink: mr.googleMapsLink !== undefined && mr.googleMapsLink !== null ? mr.googleMapsLink : existing.googleMapsLink
            };
          } else {
            existingRecords.push(mr);
          }
        });
        workspace.labourManagement.attendance[existingDateIndex].records = existingRecords;
        workspace.labourManagement.attendance[existingDateIndex].markedBy = senderId;
      } else {
        workspace.labourManagement.attendance.push({
          date,
          records: markedRecords,
          markedBy: senderId
        });
      }
      workspace.markModified('labourManagement');
    }

    await workspace.save();

    // Trigger notification immediately for Attendance Submitted / GPS Checked In
    try {
      const senderUser = await User.findById(senderId);
      const formattedDate = new Date(date).toLocaleDateString();
      const io = req.app.get('io');

      if (isLabourMember && !isContractor) {
        // Labour checked in via GPS -> Notify the contractor assigned to the project
        const contractorId = workspace.contractor || workspace.professional;
        if (contractorId) {
          const contractorNotifText = `📍 Labour Checked In\nLabourer ${senderUser.fullName} has checked in with GPS location for date ${date}.\n\n[View Attendance]`;
          const contractorNotif = new Notification({
            recipientId: contractorId,
            senderId: senderId,
            text: contractorNotifText,
            workspaceId: id
          });
          await contractorNotif.save();

          if (io) {
            io.to(contractorId.toString()).emit('new_notification', {
              _id: contractorNotif._id,
              recipientId: contractorId,
              senderId: {
                _id: senderUser._id,
                fullName: senderUser.fullName,
                avatarUrl: senderUser.avatarUrl,
                role: senderUser.role
              },
              text: contractorNotif.text,
              isRead: false,
              createdAt: contractorNotif.createdAt
            });
          }
        }
      } else {
        // Update any matching "Labour Checked In" notifications for these labourers to isMarked: true
        try {
          const dateStr = date; // YYYY-MM-DD
          const labourIds = records.map(r => r.labourId?.toString()).filter(Boolean);
          if (labourIds.length > 0) {
            await Notification.updateMany(
              {
                senderId: { $in: labourIds },
                text: { $regex: new RegExp(`Labour Checked In.*${dateStr}`, 'i') }
              },
              { $set: { isMarked: true } }
            );
          }
        } catch (updateNotifErr) {
          console.error('Error marking notifications as processed:', updateNotifErr);
        }

        // Notify each individual labourer
        if (records && records.length > 0) {
          for (const record of records) {
            const lId = record.labourId;
            if (lId) {
              const labourNotifText = `📋 Attendance Recorded\nYour attendance for ${formattedDate} has been marked as ${record.status} (${record.hours} hours) by Contractor ${senderUser.fullName}\n\n[View Attendance]`;
              const labourNotif = new Notification({
                recipientId: lId,
                senderId: senderId,
                text: labourNotifText,
                workspaceId: id
              });
              await labourNotif.save();

              if (io) {
                io.to(lId.toString()).emit('new_notification', {
                  _id: labourNotif._id,
                  recipientId: lId,
                  senderId: {
                    _id: senderUser._id,
                    fullName: senderUser.fullName,
                    avatarUrl: senderUser.avatarUrl,
                    role: senderUser.role
                  },
                  text: labourNotif.text,
                  isRead: false,
                  createdAt: labourNotif.createdAt
                });
              }
            }
          }
        }
      }
    } catch (notifErr) {
      console.error('Error triggering attendance submitted notification:', notifErr);
    }

    const updated = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate({ path: 'messages.sender', select: 'fullName email role avatarUrl' });

    emitWorkspaceUpdate(req, id, updated);
    res.status(200).json({ message: 'Attendance recorded successfully', workspace: updated });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ message: 'Error recording attendance: ' + error.message });
  }
});

// 17. Record Labour Payment/Advance
app.post('/api/project-workspaces/:id/labour/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { labourId, amount, type, senderId } = req.body;

    if (!labourId || !amount || !type || !senderId) {
      return res.status(400).json({ message: 'labourId, amount, type, and senderId are required' });
    }

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const isContractor = workspace.contractor?.toString() === senderId || workspace.professional?.toString() === senderId;
    if (!isContractor) {
      return res.status(403).json({ message: 'Forbidden: Only contractor can record payments' });
    }

    if (!workspace.labourManagement) {
      workspace.labourManagement = { attendance: [], payments: [] };
    }

    workspace.labourManagement.payments.push({
      date: new Date(),
      labourId,
      amount,
      type,
      recordedBy: senderId
    });

    await workspace.save();

    // Trigger notification immediately for Payment Received
    try {
      const senderUser = await User.findById(senderId);
      const notificationText = `💰 Payment Received\nReceived ₹${amount.toLocaleString('en-IN')} (${type}) for ${workspace.title}\n\n[View Details]`;

      const notification = new Notification({
        recipientId: labourId,
        senderId: senderId,
        text: notificationText,
        workspaceId: id
      });
      await notification.save();

      const io = req.app.get('io');
      if (io) {
        io.to(labourId.toString()).emit('new_notification', {
          _id: notification._id,
          recipientId: labourId,
          senderId: {
            _id: senderUser._id,
            fullName: senderUser.fullName,
            avatarUrl: senderUser.avatarUrl,
            role: senderUser.role
          },
          text: notification.text,
          isRead: false,
          createdAt: notification.createdAt
        });
      }
    } catch (notifErr) {
      console.error('Error triggering payment received notification:', notifErr);
    }

    const updated = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate({ path: 'messages.sender', select: 'fullName email role avatarUrl' });

    emitWorkspaceUpdate(req, id, updated);
    res.status(200).json({ message: 'Payment recorded successfully', workspace: updated });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ message: 'Error recording payment: ' + error.message });
  }
});

// 17b. Record Client Payment
app.post('/api/project-workspaces/:id/client/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, senderId } = req.body;

    if (!amount || !senderId) {
      return res.status(400).json({ message: 'amount and senderId are required' });
    }

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    if (!workspace.labourManagement) {
      workspace.labourManagement = { attendance: [], payments: [] };
    }

    const recipientId = workspace.contractor || workspace.professional;

    workspace.labourManagement.payments.push({
      date: new Date(),
      labourId: recipientId,
      amount: Number(amount),
      type: 'Payment',
      recordedBy: senderId
    });

    await workspace.save();

    // Trigger notification immediately for Payment Received
    try {
      const senderUser = await User.findById(senderId);
      const notificationText = `💰 Payment Received\nReceived ₹${Number(amount).toLocaleString('en-IN')} from Client ${senderUser.fullName} for ${workspace.title}`;

      const notification = new Notification({
        recipientId: recipientId,
        senderId: senderId,
        text: notificationText
      });
      await notification.save();

      const io = req.app.get('io');
      if (io && recipientId) {
        io.to(recipientId.toString()).emit('new_notification', {
          _id: notification._id,
          recipientId: recipientId,
          senderId: {
            _id: senderUser._id,
            fullName: senderUser.fullName,
            avatarUrl: senderUser.avatarUrl,
            role: senderUser.role
          },
          text: notification.text,
          isRead: false,
          createdAt: notification.createdAt
        });
      }
    } catch (notifErr) {
      console.error('Error triggering payment received notification:', notifErr);
    }

    const updated = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate('contractor', 'fullName email phoneNumber role city avatarUrl')
      .populate('architect', 'fullName email phoneNumber role city avatarUrl')
      .populate('labourTeam', 'fullName email phoneNumber role city skillType availability avatarUrl')
      .populate({ path: 'messages.sender', select: 'fullName email role avatarUrl' });

    emitWorkspaceUpdate(req, id, updated);
    res.status(200).json({ message: 'Payment recorded successfully', workspace: updated });
  } catch (error) {
    console.error('Error recording client payment:', error);
    res.status(500).json({ message: 'Error recording client payment: ' + error.message });
  }
});

// ==========================================
// Follow / Unfollow & Notification Endpoints
// ==========================================

// 1. Follow a user
app.post('/api/follow/:userId', async (req, res) => {
  try {
    const { userId } = req.params; // Target user to follow
    const { followerId } = req.body; // Logged-in user who follows

    if (!followerId) {
      return res.status(400).json({ message: 'followerId is required' });
    }

    if (followerId === userId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    // Check if target user and follower exist
    const targetUser = await User.findById(userId);
    const followerUser = await User.findById(followerId);
    if (!targetUser || !followerUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if follow record already exists
    const existingFollow = await Follow.findOne({ followerId, followingId: userId });
    if (existingFollow) {
      return res.status(400).json({ message: 'You are already following this user' });
    }

    // Create follow record
    const follow = new Follow({ followerId, followingId: userId });
    await follow.save();

    // Update counts
    targetUser.followersCount = (targetUser.followersCount || 0) + 1;
    await targetUser.save();

    followerUser.followingCount = (followerUser.followingCount || 0) + 1;
    await followerUser.save();

    // Create follow notification
    const notificationText = `${followerUser.fullName} started following you.`;
    const notification = new Notification({
      recipientId: userId,
      senderId: followerId,
      text: notificationText
    });
    await notification.save();

    // Real-time update via Socket.io if the recipient is connected
    const io = req.app.get('io');
    if (io) {
      io.to(userId.toString()).emit('new_notification', {
        _id: notification._id,
        recipientId: userId,
        senderId: {
          _id: followerUser._id,
          fullName: followerUser.fullName,
          avatarUrl: followerUser.avatarUrl,
          role: followerUser.role
        },
        text: notificationText,
        isRead: false,
        createdAt: notification.createdAt
      });
      
      // Also broadcast follower count updates if relevant
      io.emit('user_stats_updated', {
        userId: userId,
        followersCount: targetUser.followersCount
      });
      io.emit('user_stats_updated', {
        userId: followerId,
        followingCount: followerUser.followingCount
      });
    }

    res.status(200).json({
      message: 'Followed successfully',
      isFollowing: true,
      followersCount: targetUser.followersCount,
      followingCount: followerUser.followingCount
    });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ message: 'Error following user: ' + error.message });
  }
});

// 2. Unfollow a user
app.delete('/api/unfollow/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { followerId } = req.body;

    if (!followerId) {
      return res.status(400).json({ message: 'followerId is required in the body' });
    }

    const followRecord = await Follow.findOneAndDelete({ followerId, followingId: userId });
    if (!followRecord) {
      return res.status(400).json({ message: 'You are not following this user' });
    }

    const targetUser = await User.findById(userId);
    const followerUser = await User.findById(followerId);

    if (targetUser) {
      targetUser.followersCount = Math.max(0, (targetUser.followersCount || 0) - 1);
      await targetUser.save();
    }
    if (followerUser) {
      followerUser.followingCount = Math.max(0, (followerUser.followingCount || 0) - 1);
      await followerUser.save();
    }

    // Real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('user_stats_updated', {
        userId: userId,
        followersCount: targetUser ? targetUser.followersCount : 0
      });
      io.emit('user_stats_updated', {
        userId: followerId,
        followingCount: followerUser ? followerUser.followingCount : 0
      });
    }

    res.status(200).json({
      message: 'Unfollowed successfully',
      isFollowing: false,
      followersCount: targetUser ? targetUser.followersCount : 0,
      followingCount: followerUser ? followerUser.followingCount : 0
    });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ message: 'Error unfollowing user: ' + error.message });
  }
});

// 3. Get follow status
app.get('/api/follow/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { followerId } = req.query;

    if (!followerId) {
      return res.status(400).json({ message: 'followerId query parameter is required' });
    }

    const exists = await Follow.exists({ followerId, followingId: userId });
    res.status(200).json({ isFollowing: !!exists });
  } catch (error) {
    res.status(500).json({ message: 'Error checking follow status: ' + error.message });
  }
});

// 4. Get followers of a user
app.get('/api/followers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const follows = await Follow.find({ followingId: userId })
      .populate('followerId', 'fullName email role city avatarUrl shortDesc location rating reviews availability skillType experience');
    
    const followers = follows.map(f => f.followerId).filter(Boolean);
    res.status(200).json({ success: true, followers });
  } catch (error) {
    res.status(500).json({ message: 'Error getting followers: ' + error.message });
  }
});

// 5. Get list of users a user is following
app.get('/api/following/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const follows = await Follow.find({ followerId: userId })
      .populate('followingId', 'fullName email role city avatarUrl shortDesc location rating reviews availability skillType experience');
    
    const following = follows.map(f => f.followingId).filter(Boolean);
    res.status(200).json({ success: true, following });
  } catch (error) {
    res.status(500).json({ message: 'Error getting following list: ' + error.message });
  }
});

// 6. Get user notifications
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    let notifications = await Notification.find({
      recipientId: userId,
      text: { $not: /New Message|\[View Chat\]/ }
    })
      .sort({ createdAt: -1 })
      .populate('senderId', 'fullName avatarUrl role');

    // Auto-seed if user has no notifications yet
    if (notifications.length === 0) {
      const User = require('./models/User');
      const u = await User.findById(userId);
      if (u) {
        const notifs = [];
        const now = Date.now();
        if (u.role === 'Architect') {
          notifs.push({ recipientId: u._id, text: `🏗 Invitation to bid received for project "Modern Residential Villa"`, isRead: false, createdAt: new Date(now - 1000 * 60 * 30) });
          notifs.push({ recipientId: u._id, text: `💰 Milestone 1 payment of ₹25,000 released successfully`, isRead: false, createdAt: new Date(now - 1000 * 60 * 60 * 4) });
          notifs.push({ recipientId: u._id, text: `✅ Your portfolio was viewed by 3 clients today`, isRead: true, createdAt: new Date(now - 1000 * 60 * 60 * 24) });
        } else if (u.role === 'Contractor') {
          notifs.push({ recipientId: u._id, text: `📩 New project request for "Commercial Building Renovation" near Mumbai`, isRead: false, createdAt: new Date(now - 1000 * 60 * 20) });
          notifs.push({ recipientId: u._id, text: `💰 Payment of ₹50,000 received from client Suresh Mehta`, isRead: false, createdAt: new Date(now - 1000 * 60 * 60 * 3) });
          notifs.push({ recipientId: u._id, text: `👥 Labour team attendance marked for today`, isRead: true, createdAt: new Date(now - 1000 * 60 * 60 * 8) });
        } else if (u.role === 'Labour') {
          notifs.push({ recipientId: u._id, text: `✅ Attendance marked present by Contractor Suraj Sharma`, isRead: false, createdAt: new Date(now - 1000 * 60 * 45) });
          notifs.push({ recipientId: u._id, text: `💵 Daily wage of ₹800 credited to your wallet`, isRead: false, createdAt: new Date(now - 1000 * 60 * 60 * 6) });
          notifs.push({ recipientId: u._id, text: `🔔 New work opportunity available near ${u.city || 'your area'}`, isRead: true, createdAt: new Date(now - 1000 * 60 * 60 * 12) });
        } else {
          // Client
          notifs.push({ recipientId: u._id, text: `📋 Quotation updated by Contractor for your project "Duplex Renovation"`, isRead: false, createdAt: new Date(now - 1000 * 60 * 15) });
          notifs.push({ recipientId: u._id, text: `✍️ Contract agreement signed and finalized successfully`, isRead: false, createdAt: new Date(now - 1000 * 60 * 60 * 5) });
          notifs.push({ recipientId: u._id, text: `🏠 3 architects matched for your project in ${u.city || 'your area'}`, isRead: true, createdAt: new Date(now - 1000 * 60 * 60 * 24) });
        }
        notifs.push({ recipientId: u._id, text: `🎉 Welcome to Allver! Start building, connecting, and growing.`, isRead: true, createdAt: new Date(now - 1000 * 60 * 60 * 48) });
        await Notification.insertMany(notifs);
        notifications = await Notification.find({
          recipientId: userId,
          text: { $not: /New Message|\[View Chat\]/ }
        }).sort({ createdAt: -1 });
      }
    }

    // Compute isMarked for labour check-in notifications if recipient is a contractor
    const ProjectWorkspace = require('./models/ProjectWorkspace');
    const workspaces = await ProjectWorkspace.find({
      $or: [
        { contractor: userId },
        { professional: userId }
      ]
    });

    const parsedNotifications = notifications.map(item => {
      const plainNotif = item.toObject ? item.toObject() : item;
      if (plainNotif.text && plainNotif.text.includes('Labour Checked In')) {
        const match = plainNotif.text.match(/for date (\d{4}-\d{2}-\d{2})/);
        if (match) {
          const dateStr = match[1];
          const labourId = plainNotif.senderId?._id || plainNotif.senderId;
          
          let isMarked = false;
          for (const w of workspaces) {
            const att = w.labourManagement?.attendance?.find(a => a.date === dateStr);
            if (att) {
              const rec = att.records?.find(r => (r.labourId?._id || r.labourId)?.toString() === labourId?.toString());
              if (rec && rec.isMarked === true) {
                isMarked = true;
                break;
              }
            }
          }
          plainNotif.isMarked = isMarked;
        }
      }
      return plainNotif;
    });

    res.status(200).json({ success: true, notifications: parsedNotifications });
  } catch (error) {
    res.status(500).json({ message: 'Error getting notifications: ' + error.message });
  }
});

// 7. Get unread notifications count
app.get('/api/notifications/unread-count/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
      text: { $not: /New Message|\[View Chat\]|New Project|\[View Project\]|Applied|\[View Application\]|Project Invitation|\[View Invitation\]/ }
    });
    res.status(200).json({ success: true, unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: 'Error getting unread count: ' + error.message });
  }
});

// Mark only project notifications as read for a user
app.post('/api/notifications/read-projects/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await Notification.updateMany(
      { 
        recipientId: userId, 
        isRead: false,
        text: /New Project|\[View Project\]|Applied|\[View Application\]|Project Invitation|\[View Invitation\]|Submitted Design|\[View Design\]|Labour Joined|Joined Project|Payment Received|\[View Details\]|Attendance Submitted|\[View Attendance\]|Milestone|\[View Progress\]|Document Shared|\[View Document\]|Site Visit|\[View Schedule\]/
      }, 
      { $set: { isRead: true } }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(userId.toString()).emit('notifications_read', { userId });
      console.log(`[Socket] Emitted notifications_read (projects) for user ${userId}`);
    }

    res.status(200).json({ success: true, message: 'Project notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking project notifications as read: ' + error.message });
  }
});

// 8. Mark all notifications as read for a user
app.post('/api/notifications/read/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await Notification.updateMany({ recipientId: userId, isRead: false }, { $set: { isRead: true } });

    const io = req.app.get('io');
    if (io) {
      io.to(userId.toString()).emit('notifications_read', { userId });
      console.log(`[Socket] Emitted notifications_read (all) for user ${userId}`);
    }

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking notifications as read: ' + error.message });
  }
});

// Speech-to-Text Transcription Route using Hugging Face Whisper API
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    console.log(`[Transcribe] Received audio file: ${req.file.originalname}, size: ${req.file.size} bytes`);

    // Standard Node.js HTTPS request helper to avoid built-in fetch bugs on Windows/Render
    const https = require('https');
    const queryHuggingFace = (audioBuffer, modelName) => {
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'router.huggingface.co',
          path: `/hf-inference/models/${modelName}`,
          method: 'POST',
          headers: {
            'Content-Type': 'audio/x-m4a',
          }
        };

        if (process.env.HF_TOKEN) {
          options.headers['Authorization'] = `Bearer ${process.env.HF_TOKEN}`;
        }

        const hfReq = https.request(options, (hfRes) => {
          let data = '';
          hfRes.on('data', (chunk) => { data += chunk; });
          hfRes.on('end', () => {
            const trimmed = data.trim();
            if (trimmed.startsWith('<!DOCTYPE html>') || trimmed.includes('<html')) {
              let errorMsg = 'Hugging Face API returned HTML. ';
              if (!process.env.HF_TOKEN) {
                errorMsg += 'Please ensure you have created a free Hugging Face API key and added it as HF_TOKEN in your backend/.env file (e.g., HF_TOKEN=hf_...).';
              } else {
                errorMsg += `This might be due to an invalid HF_TOKEN or request limit (Status: ${hfRes.statusCode}).`;
              }
              return reject(new Error(errorMsg));
            }

            try {
              const parsed = JSON.parse(data);
              resolve({ statusCode: hfRes.statusCode, body: parsed });
            } catch (e) {
              console.error('[Transcribe Debug] HF Status:', hfRes.statusCode);
              console.error('[Transcribe Debug] HF Headers:', hfRes.headers);
              console.error('[Transcribe Debug] HF Body (first 1000 chars):', data.substring(0, 1000));
              reject(new Error(`Failed to parse Hugging Face response (Status: ${hfRes.statusCode}, Raw: ${data.substring(0, 150)}): ${e.message}`));
            }
          });
        });

        hfReq.on('error', (err) => {
          reject(err);
        });

        hfReq.write(audioBuffer);
        hfReq.end();
      });
    };

    const models = [
      'openai/whisper-large-v3-turbo',
      'openai/whisper-large-v3',
      'distil-whisper/distil-large-v3'
    ];

    let hfResult = null;
    let lastError = null;

    for (const model of models) {
      try {
        console.log(`[Transcribe] Attempting transcription with Hugging Face model: ${model}`);
        const result = await queryHuggingFace(req.file.buffer, model);
        console.log(`[Transcribe] Model ${model} returned status: ${result.statusCode}`);
        
        if (result.statusCode === 200) {
          hfResult = result;
          break;
        } else {
          lastError = result.body || { error: `HTTP ${result.statusCode}` };
        }
      } catch (err) {
        console.error(`[Transcribe] Failed with model ${model}:`, err.message);
        lastError = { error: err.message };
      }
    }

    if (hfResult && hfResult.statusCode === 200) {
      let transcribedText = hfResult.body.text || '';
      console.log(`[Transcribe] Original transcription text: "${transcribedText}"`);

      // Check if the output contains Urdu/Arabic script (Unicode range for Arabic characters)
      const urduRegex = /[\u0600-\u06FF\u0750-\u077F]/;
      if (urduRegex.test(transcribedText)) {
        console.log(`[Transcribe] Detected Urdu script in transcription: "${transcribedText}"`);
        const userLanguage = req.body.language || 'en';
        // Translate to Marathi if user language is Marathi, otherwise Hindi (Devanagari script)
        const targetLang = userLanguage === 'mr' ? 'mr' : 'hi';
        
        try {
          const translatedText = await new Promise((resolve) => {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ur&tl=${targetLang}&dt=t&q=${encodeURIComponent(transcribedText)}`;
            const https = require('https');
            
            https.get(url, (tRes) => {
              let tData = '';
              tRes.on('data', (chunk) => { tData += chunk; });
              tRes.on('end', () => {
                try {
                  const parsed = JSON.parse(tData);
                  if (parsed && parsed[0] && Array.isArray(parsed[0])) {
                    const fullTranslation = parsed[0].map(item => item[0]).join('');
                    resolve(fullTranslation);
                  } else {
                    resolve(transcribedText);
                  }
                } catch (e) {
                  console.error('[Transcribe] Error parsing Urdu to Devanagari translation:', e);
                  resolve(transcribedText);
                }
              });
            }).on('error', (err) => {
              console.error('[Transcribe] Google Translate request error:', err);
              resolve(transcribedText);
            });
          });
          
          console.log(`[Transcribe] Translated Urdu to ${targetLang === 'mr' ? 'Marathi' : 'Hindi'}: "${translatedText}"`);
          transcribedText = translatedText;
        } catch (translateErr) {
          console.error('[Transcribe] Transliteration/Translation failed:', translateErr);
        }
      }

      return res.status(200).json({
        success: true,
        text: transcribedText
      });
    } else {
      console.error('[Transcribe] All Hugging Face ASR models failed. Last Error:', lastError);
      return res.status(503).json({
        success: false,
        message: 'Speech transcription service is temporarily overloaded or down. Please try again in a moment.',
        error: lastError
      });
    }
  } catch (error) {
    console.error('[Transcribe] Error in transcribe route:', error);
    return res.status(500).json({ message: 'Error transcribing audio: ' + error.message });
  }
});

// ============================
// DIRECT MESSAGE (DM) CHAT SYSTEM
// ============================
const Conversation = require('./models/Conversation');

// Upload file for chat (images, documents)
app.post('/api/chat/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    console.log('Chat upload received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    const mimeType = req.file.mimetype || 'application/octet-stream';
    const fileType = mimeType.startsWith('image/') ? 'image' : 'file';

    const isCloudinaryConfigured = 
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_CLOUD_NAME !== 'Root' &&
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET;

    if (!isCloudinaryConfigured) {
      console.error('Cloudinary is not configured for chat upload.');
      return res.status(500).json({ message: 'Cloud storage is not configured.' });
    }

    // Try Cloudinary upload
    try {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'allver-chat',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      const result = uploadResult;
      res.status(200).json({
        url: result.secure_url,
        name: req.file.originalname || `file_${Date.now()}`,
        type: fileType,
        size: req.file.size,
      });
    } catch (cloudErr) {
      console.error('Cloudinary chat upload failed:', cloudErr.message);
      return res.status(500).json({ message: 'Cloud upload failed: ' + cloudErr.message });
    }
  } catch (error) {
    console.error('Chat upload error:', error);
    res.status(500).json({ message: 'Upload failed: ' + error.message });
  }
});

// 1. Create or find existing conversation between 2 users
app.post('/api/conversations', async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    
    if (!senderId || !receiverId) {
      return res.status(400).json({ message: 'senderId and receiverId are required' });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ message: 'Cannot create conversation with yourself' });
    }

    // Validate MongoDB ObjectId format
    const isValidId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidId(senderId) || !isValidId(receiverId)) {
      return res.status(400).json({ message: 'Invalid user ID format. Only registered users can message.' });
    }

    // Check if conversation already exists between these 2 users
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId], $size: 2 }
    }).populate('participants', 'fullName avatarUrl role city');

    if (conversation) {
      return res.status(200).json({ conversation, isNew: false });
    }

    // Create new conversation
    conversation = new Conversation({
      participants: [senderId, receiverId],
      messages: [],
      unreadCount: { [senderId]: 0, [receiverId]: 0 }
    });

    await conversation.save();
    
    // Populate participants before sending response
    conversation = await Conversation.findById(conversation._id)
      .populate('participants', 'fullName avatarUrl role city');

    res.status(201).json({ conversation, isNew: true });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ message: 'Error creating conversation: ' + error.message });
  }
});

// 2. Get all online users
app.get('/api/users/online', (req, res) => {
  res.status(200).json({ onlineUserIds: Array.from(onlineUsers) });
});

// Get total unread message count across all conversations for a user
app.get('/api/conversations/unread-total/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const conversations = await Conversation.find({ participants: userId }).select('unreadCount');
    let total = 0;
    conversations.forEach(convo => {
      total += convo.unreadCount.get(userId) || 0;
    });
    res.status(200).json({ success: true, totalUnread: total });
  } catch (error) {
    console.error('Error fetching total unread count:', error);
    res.status(500).json({ success: false, totalUnread: 0 });
  }
});

// 2. Get all conversations for a user (inbox) — MUST be before /:conversationId routes
app.get('/api/conversations/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const conversations = await Conversation.find({
      participants: userId
    })
    .populate('participants', 'fullName avatarUrl role city')
    .populate('lastMessage.sender', 'fullName')
    .sort({ updatedAt: -1 });

    // Format response with unread counts
    const formatted = conversations.map(convo => {
      const otherParticipant = convo.participants.find(
        p => p._id.toString() !== userId
      );
      return {
        _id: convo._id,
        otherUser: otherParticipant,
        lastMessage: convo.lastMessage,
        unreadCount: convo.unreadCount.get(userId) || 0,
        updatedAt: convo.updatedAt,
        messageCount: convo.messages.length,
        isOnline: otherParticipant ? onlineUsers.has(otherParticipant._id.toString()) : false
      };
    });

    res.status(200).json({ conversations: formatted });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Error fetching conversations: ' + error.message });
  }
});

app.get('/api/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation ID format' });
    }
    const userId = req.query.userId;

    const conversation = await Conversation.findById(conversationId)
      .populate('messages.sender', 'fullName avatarUrl role')
      .populate('participants', 'fullName avatarUrl role city');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const isPart = conversation.participants && conversation.participants.some(p => p._id.toString() === userId.toString());
    if (!isPart) {
      return res.status(403).json({ message: 'Access denied: You are not a participant in this conversation.' });
    }

    // Mark messages as read for this user
    if (userId) {
      try {
        conversation.unreadCount.set(userId, 0);
        
        // Mark all messages as read by this user
        conversation.messages.forEach(msg => {
          if (!msg.readBy.includes(userId)) {
            msg.readBy.push(userId);
          }
        });
        
        await conversation.save();
      } catch (saveErr) {
        console.error('Error saving read status:', saveErr);
        // Don't fail the whole request if read-marking fails
      }
    }

    // Clean up messages: strip empty attachment objects from legacy data
    const cleanMessages = conversation.messages.map(msg => {
      const msgObj = msg.toObject ? msg.toObject() : msg;
      // Remove empty attachment objects that have no url
      if (msgObj.attachment && !msgObj.attachment.url) {
        msgObj.attachment = null;
      }
      return msgObj;
    });

    res.status(200).json({ 
      messages: cleanMessages,
      participants: conversation.participants 
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages: ' + error.message });
  }
});

app.post('/api/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation ID format' });
    }
    const { text, attachment, senderId } = req.body;

    if (!senderId || (!text && !attachment)) {
      return res.status(400).json({ message: 'text (or attachment) is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const isPart = conversation.participants && conversation.participants.some(p => p.toString() === senderId.toString());
    if (!isPart) {
      return res.status(403).json({ message: 'Access denied: You are not a participant in this conversation.' });
    }

    // Create the new message — only include attachment if it has a valid URL
    const newMessage = {
      sender: senderId,
      text: text || '',
      attachment: (attachment && attachment.url) ? {
        name: attachment.name || '',
        url: attachment.url,
        type: attachment.type || 'file',
        duration: attachment.duration || 0
      } : null,
      readBy: [senderId],
      createdAt: new Date()
    };

    conversation.messages.push(newMessage);
    
    // Update last message preview
    const attachmentPreview = newMessage.attachment 
      ? (newMessage.attachment.type === 'image' ? '📷 Photo' : newMessage.attachment.type === 'voice' ? '🎤 Voice message' : '📎 File') 
      : '';
    conversation.lastMessage = {
      text: text || attachmentPreview,
      sender: senderId,
      createdAt: new Date()
    };

    // Increment unread count for other participants
    conversation.participants.forEach(pId => {
      const participantId = pId.toString();
      if (participantId !== senderId) {
        const current = conversation.unreadCount.get(participantId) || 0;
        conversation.unreadCount.set(participantId, current + 1);
      }
    });

    conversation.markModified('unreadCount');
    conversation.updatedAt = new Date();
    await conversation.save();

    // Send push notification to other participants in the conversation
    try {
      const senderUser = await User.findById(senderId);
      for (const pId of conversation.participants) {
        const participantId = pId.toString();
        if (participantId !== senderId) {
          const notification = new Notification({
            recipientId: participantId,
            senderId: senderId,
            text: `💬 New Message\n${senderUser ? senderUser.fullName : 'Someone'}: "${text || 'Sent an attachment'}"`,
            conversationId: conversationId
          });
          await notification.save();
        }
      }
    } catch (notifErr) {
      console.error('Error generating notification for DM message:', notifErr);
    }


    // Get the saved message with its MongoDB _id
    const savedMessage = conversation.messages[conversation.messages.length - 1];

    // Populate sender info
    const populatedConvo = await Conversation.findById(conversationId)
      .populate('messages.sender', 'fullName avatarUrl role');
    
    const populatedMessage = populatedConvo.messages.id(savedMessage._id);

    // Broadcast via Socket.io for real-time delivery
    const ioInstance = req.app.get('io');
    if (ioInstance) {
      // 1. Emit to the conversation room (for users currently inside the chat room)
      ioInstance.to(conversationId).emit('receive_message', {
        workspaceId: conversationId,
        message: populatedMessage,
        senderId: senderId
      });

      // 2. Emit to the personal rooms of other participants (for real-time badge / list updates in Chats list and Home)
      conversation.participants.forEach(pId => {
        const participantId = pId.toString();
        if (participantId !== senderId) {
          ioInstance.to(participantId).emit('receive_message', {
            workspaceId: conversationId,
            message: populatedMessage,
            senderId: senderId
          });
          ioInstance.to(`user:${participantId}`).emit('receive_message', {
            workspaceId: conversationId,
            message: populatedMessage,
            senderId: senderId
          });

          // Also emit new_dm_notification
          ioInstance.to(participantId).emit('new_dm_notification', {
            conversationId,
            receiverId: participantId,
            message: populatedMessage
          });
          ioInstance.to(`user:${participantId}`).emit('new_dm_notification', {
            conversationId,
            receiverId: participantId,
            message: populatedMessage
          });
        }
      });
    }

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message: ' + error.message });
  }
});


// 5. Mark conversation as read
app.post('/api/conversations/:conversationId/read', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    conversation.unreadCount.set(userId, 0);
    conversation.markModified('unreadCount');
    
    // Mark all unread messages as read
    conversation.messages.forEach(msg => {
      if (!msg.readBy.includes(userId)) {
        msg.readBy.push(userId);
      }
    });

    await conversation.save();

    // Broadcast message read event to the room and all participants
    const io = req.app.get('io');
    if (io) {
      // 1. Emit to the conversation room (for users currently inside the chat room)
      io.to(conversationId).emit('messages_read', {
        conversationId,
        userId
      });

      // 2. Emit to the personal rooms of all participants (for real-time badge count updates on other screens/devices)
      conversation.participants.forEach(pId => {
        const participantId = pId.toString();
        io.to(participantId).emit('messages_read', {
          conversationId,
          userId
        });
        io.to(`user:${participantId}`).emit('messages_read', {
          conversationId,
          userId
        });
      });
      console.log(`[Socket] Emitted messages_read for room ${conversationId} to all participants by user ${userId}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error marking as read: ' + error.message });
  }
});

// Schedule a Site Visit
app.post('/api/project-workspaces/:id/site-visits', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, senderId } = req.body;

    if (!date || !senderId) {
      return res.status(400).json({ message: 'Date and senderId are required' });
    }

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const senderUser = await User.findById(senderId);
    await workspace.save();

    const members = new Set();
    if (workspace.client && workspace.client.toString() !== senderId) members.add(workspace.client.toString());
    if (workspace.professional && workspace.professional.toString() !== senderId) members.add(workspace.professional.toString());
    if (workspace.contractor && workspace.contractor.toString() !== senderId) members.add(workspace.contractor.toString());
    if (workspace.architect && workspace.architect.toString() !== senderId) members.add(workspace.architect.toString());
    if (workspace.labourTeam) {
      workspace.labourTeam.forEach(l => {
        if (l.toString() !== senderId) members.add(l.toString());
      });
    }

    for (const recipientId of members) {
      const notification = new Notification({
        recipientId,
        senderId,
        text: `📅 Site Visit Scheduled\nSite visit scheduled for ${workspace.title} on ${new Date(date).toLocaleDateString()}\n\n[View Schedule]`,
        workspaceId: id
      });
      await notification.save();

      const ioInstance = req.app.get('io');
      if (ioInstance) {
        ioInstance.to(recipientId).emit('new_notification', {
          _id: notification._id,
          recipientId,
          senderId: {
            _id: senderUser._id,
            fullName: senderUser.fullName,
            avatarUrl: senderUser.avatarUrl,
            role: senderUser.role
          },
          text: notification.text,
          isRead: false,
          createdAt: notification.createdAt
        });
      }
    }

    res.status(201).json({ message: 'Site visit scheduled successfully' });
  } catch (error) {
    console.error('Error scheduling site visit:', error);
    res.status(500).json({ message: 'Error scheduling site visit: ' + error.message });
  }
});

app.post('/api/notifications/test-trigger', async (req, res) => {
  try {
    const { type, recipientId, senderId, title, location, amount, documentName, visitDate } = req.body;
    
    if (!recipientId || !senderId) {
      return res.status(400).json({ message: 'recipientId is required' });
    }

    const senderUser = await User.findById(senderId);
    if (!senderUser) {
      return res.status(404).json({ message: 'Sender user not found' });
    }

    let text = '';
    switch (type) {
      case 'New Project Posted':
        text = `🏗 New Project\n${title || '2BHK House Design'} posted near ${location || 'Mumbai'}\n\n[View Project]`;
        break;
      case 'New Chat Message':
        text = `💬 New Message\n${senderUser.fullName}: ${title || 'Hey, how is the progress?'}\n\n[View Chat]`;
        break;
      case 'Proposal Accepted':
        text = `✅ Proposal Accepted\n${senderUser.fullName} accepted your proposal for ${title || 'Luxury Villa Construction'}\n\n[View Project]`;
        break;
      case 'Payment Received':
        text = `💰 Payment Received\nReceived ₹${amount || '50,000'} from ${senderUser.fullName} for ${title || 'Office Renovation'}\n\n[View Details]`;
        break;
      case 'Project Invitation':
        text = `📩 Project Invitation\n${senderUser.fullName} invited you to the project: ${title || 'Luxury Villa'}\n\n[View Invitation]`;
        break;
      case 'Document Shared':
        text = `📁 Document Shared\n${senderUser.fullName} shared "${documentName || 'Layout_Plan.pdf'}" in ${title || 'Luxury Villa'}\n\n[View Document]`;
        break;
      case 'Site Visit Scheduled':
        text = `📅 Site Visit Scheduled\nSite visit scheduled for ${title || 'Luxury Villa'} on ${visitDate || '18 May'}\n\n[View Schedule]`;
        break;
      case 'Contractor Applied':
        text = `👷 Contractor Applied\nContractor ${senderUser.fullName} applied to your project: ${title || 'Luxury Villa Construction'}\n\n[View Application]`;
        break;
      case 'Architect Submitted Design':
        text = `📐 Architect Submitted Design\nArchitect ${senderUser.fullName} submitted a new blueprint design: ${title || 'ModernScandinavian.dwg'}\n\n[View Design]`;
        break;
      case 'Labour Joined Project':
        text = `👷 Labour Joined Project\nLabourer ${senderUser.fullName} has joined the project: ${title || 'Luxury Villa'}\n\n[View Project]`;
        break;
      case 'Attendance Submitted':
        text = `📋 Attendance Submitted\nLabour attendance for ${visitDate || 'today'} has been marked by Contractor ${senderUser.fullName}\n\n[View Attendance]`;
        break;
      case 'Project Milestone Completed':
        text = `✅ ${title || 'Foundation Work Completed'}\n\n${senderUser.role || 'Contractor'} ${senderUser.fullName} uploaded progress photos\n\n[View Progress]`;
        break;
      default:
        return res.status(400).json({ message: 'Invalid notification type' });
    }

    const notification = new Notification({
      recipientId,
      senderId,
      text
    });
    await notification.save();

    // Emit via socket
    const io = req.app.get('io');
    if (io) {
      io.to(recipientId.toString()).emit('new_notification', {
        _id: notification._id,
        recipientId,
        senderId: {
          _id: senderUser._id,
          fullName: senderUser.fullName,
          avatarUrl: senderUser.avatarUrl,
          role: senderUser.role
        },
        text: notification.text,
        isRead: false,
        createdAt: notification.createdAt
      });
    }

    res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error('Error triggering test notification:', error);
    res.status(500).json({ message: 'Error triggering test notification: ' + error.message });
  }
});

app.get('/render-logo', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0f172a;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 512px;
        height: 512px;
      }
      svg {
        width: 440px;
      }
    </style>
    </head>
    <body>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 36" fill="none">
          <defs>
              <linearGradient id="silver" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#c8cad0"/>
                  <stop offset="15%" stop-color="#a0a3aa"/>
                  <stop offset="30%" stop-color="#bbbec5"/>
                  <stop offset="50%" stop-color="#d0d3d8"/>
                  <stop offset="65%" stop-color="#9a9da4"/>
                  <stop offset="80%" stop-color="#808590"/>
                  <stop offset="100%" stop-color="#606468"/>
              </linearGradient>
              <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#ddb44e"/>
                  <stop offset="20%" stop-color="#c49a3d"/>
                  <stop offset="40%" stop-color="#e8c55a"/>
                  <stop offset="60%" stop-color="#d4a840"/>
                  <stop offset="80%" stop-color="#b8922e"/>
                  <stop offset="100%" stop-color="#9a7828"/>
              </linearGradient>
              <filter id="ts" x="-3%" y="-10%" width="108%" height="130%">
                  <feDropShadow dx="0" dy="0.8" stdDeviation="0.6" flood-color="#0a0a1a" flood-opacity="0.25"/>
              </filter>
          </defs>
          <g filter="url(#ts)">
              <path d="M0,34 L5,34 L18,4 L20,0 L22,4 L35,34 L40,34 L23,0 L17,0 Z M8,34 L20,6 L32,34 L27,34 L20,16 L13,34 Z" fill="url(#silver)" fill-rule="evenodd"/>
              <path d="M50,0 L55,0 L55,29.5 L74,29.5 L74,34 L50,34 Z" fill="url(#silver)"/>
              <path d="M84,0 L89,0 L89,29.5 L108,29.5 L108,34 L84,34 Z" fill="url(#silver)"/>
              <path d="M118,0 L123,0 L138,28 L153,0 L158,0 L140.5,34 L135.5,34 Z" fill="url(#silver)"/>
              <path d="M168,0 L202,0 L202,4.5 L173,4.5 L173,14.5 L198,14.5 L198,19 L173,19 L173,29.5 L202,29.5 L202,34 L168,34 Z" fill="url(#gold)"/>
              <path d="M212,0 L238,0 Q250,0 250,11 Q250,18.5 241,20.5 L254,34 L248,34 L236,21.5 L217,21.5 L217,34 L212,34 Z M217,4.5 L217,17 L236,17 Q245,17 245,11 Q245,4.5 236,4.5 Z" fill="url(#silver)" fill-rule="evenodd"/>
          </g>
      </svg>
    </body>
    </html>
  `);
});

app.get('/render-logo-transparent', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: transparent;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 512px;
        height: 512px;
      }
      svg {
        width: 440px;
      }
    </style>
    </head>
    <body>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 36" fill="none">
          <defs>
              <linearGradient id="silver" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#c8cad0"/>
                  <stop offset="15%" stop-color="#a0a3aa"/>
                  <stop offset="30%" stop-color="#bbbec5"/>
                  <stop offset="50%" stop-color="#d0d3d8"/>
                  <stop offset="65%" stop-color="#9a9da4"/>
                  <stop offset="80%" stop-color="#808590"/>
                  <stop offset="100%" stop-color="#606468"/>
              </linearGradient>
              <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#ddb44e"/>
                  <stop offset="20%" stop-color="#c49a3d"/>
                  <stop offset="40%" stop-color="#e8c55a"/>
                  <stop offset="60%" stop-color="#d4a840"/>
                  <stop offset="80%" stop-color="#b8922e"/>
                  <stop offset="100%" stop-color="#9a7828"/>
              </linearGradient>
              <filter id="ts" x="-3%" y="-10%" width="108%" height="130%">
                  <feDropShadow dx="0" dy="0.8" stdDeviation="0.6" flood-color="#0a0a1a" flood-opacity="0.25"/>
              </filter>
          </defs>
          <g filter="url(#ts)">
              <path d="M0,34 L5,34 L18,4 L20,0 L22,4 L35,34 L40,34 L23,0 L17,0 Z M8,34 L20,6 L32,34 L27,34 L20,16 L13,34 Z" fill="url(#silver)" fill-rule="evenodd"/>
              <path d="M50,0 L55,0 L55,29.5 L74,29.5 L74,34 L50,34 Z" fill="url(#silver)"/>
              <path d="M84,0 L89,0 L89,29.5 L108,29.5 L108,34 L84,34 Z" fill="url(#silver)"/>
              <path d="M118,0 L123,0 L138,28 L153,0 L158,0 L140.5,34 L135.5,34 Z" fill="url(#silver)"/>
              <path d="M168,0 L202,0 L202,4.5 L173,4.5 L173,14.5 L198,14.5 L198,19 L173,19 L173,29.5 L202,29.5 L202,34 L168,34 Z" fill="url(#gold)"/>
              <path d="M212,0 L238,0 Q250,0 250,11 Q250,18.5 241,20.5 L254,34 L248,34 L236,21.5 L217,21.5 L217,34 L212,34 Z M217,4.5 L217,17 L236,17 Q245,17 245,11 Q245,4.5 236,4.5 Z" fill="url(#silver)" fill-rule="evenodd"/>
          </g>
      </svg>
    </body>
    </html>
  `);
});


app.get('/api/temp-db-dump', async (req, res) => {
  try {
    // Run seed on-demand
    let tempSeedResult = '';
    const renRequest = await ContractRequest.findOne({ title: '5Bhk home renovation' });
    if (renRequest) {
      if (renRequest.status === 'Pending') {
        renRequest.status = 'Accepted';
        renRequest.professional = new mongoose.Types.ObjectId('6a2790f42548c9ceb580f1c5'); // Ankit contractor
        await renRequest.save();
        tempSeedResult = 'Updated contract request to Accepted and assigned Ankit.';
      } else {
        tempSeedResult = `Contract request found with status: ${renRequest.status}.`;
      }

      const wsExists = await ProjectWorkspace.findOne({ contractRequest: renRequest._id });
      if (!wsExists) {
        const newWs = new ProjectWorkspace({
          contractRequest: renRequest._id,
          client: renRequest.client,
          professional: renRequest.professional || new mongoose.Types.ObjectId('6a2790f42548c9ceb580f1c5'),
          contractor: renRequest.professional || new mongoose.Types.ObjectId('6a2790f42548c9ceb580f1c5'),
          architect: null,
          labourTeam: [],
          title: renRequest.title,
          projectType: renRequest.projectType || 'Residential',
          status: 'Active',
          quotation: {
            totalCost: 2000000,
            status: 'Accepted',
            items: []
          },
          updates: [] // Starts fresh from scratch!
        });
        await newWs.save();
        tempSeedResult += ' ProjectWorkspace created successfully.';
      } else {
        tempSeedResult += ' Workspace already existed.';
      }
    } else {
      tempSeedResult = 'Contract request "5Bhk home renovation" not found.';
    }

    const users = await User.find({}, 'fullName email role');
    const reqs = await ContractRequest.find({});
    const bids = await ProjectBid.find({})
      .populate('professional', 'fullName email role');
    const workspaces = await ProjectWorkspace.find({})
      .populate('client', 'fullName email role avatarUrl')
      .populate('professional', 'fullName email role avatarUrl')
      .populate('contractor', 'fullName email role avatarUrl')
      .populate('architect', 'fullName email role avatarUrl');
    res.status(200).json({ users, contractRequests: reqs, bids, workspaces, seedResult: tempSeedResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/test-highlights', async (req, res) => {
  try {
    const rahul = await User.findOne({ email: 'rahulrai@gmail.com' });
    let updateResult = null;
    let logged = [];
    if (rahul) {
      const updatedHighlights = rahul.portfolioHighlights.map(h => {
        const item = h.toObject ? h.toObject() : h;
        logged.push(`Checking item: ${item.title}, mediaUrls: ${JSON.stringify(item.mediaUrls)}`);
        if (!item.mediaUrls || item.mediaUrls.length === 0) {
          if (item.title === 'Work done') {
            item.mediaUrls = ['https://assets.mixkit.co/videos/preview/mixkit-construction-site-with-crane-in-action-40228-large.mp4'];
            logged.push(`Set Work done mediaUrls`);
          } else if (item.title === 'Interior design') {
            item.mediaUrls = ['https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80'];
            logged.push(`Set Interior design mediaUrls`);
          } else if (item.title === 'Home renovation') {
            item.mediaUrls = ['https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80'];
            logged.push(`Set Home renovation mediaUrls`);
          }
        }
        return item;
      });
      updateResult = await User.updateOne({ email: 'rahulrai@gmail.com' }, { $set: { portfolioHighlights: updatedHighlights } });
    }

    const users = await User.find({ role: 'Labour' }, 'fullName email portfolioHighlights');
    res.status(200).json({ users, updateResult, logged });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/test-notifications', async (req, res) => {
  try {
    const rahul = await User.findOne({ email: 'rahulrai@gmail.com' });
    if (!rahul) return res.status(404).json({ message: 'Labour Rahul Rai not found' });

    const contractor = await User.findOne({ role: 'Contractor' });
    if (!contractor) return res.status(404).json({ message: 'No Contractor found' });

    await Notification.deleteMany({ recipientId: rahul._id });

    const notifs = [
      {
        recipientId: rahul._id,
        senderId: contractor._id,
        text: `📋 Attendance Recorded\nYour attendance for today has been marked as Present (8.0 hours) by Contractor ${contractor.fullName}\n\n[View Attendance]`,
        createdAt: new Date()
      },
      {
        recipientId: rahul._id,
        senderId: contractor._id,
        text: `💰 Payment Received\nReceived ₹5,000 (Advance) for Project Sector 62 Thane\n\n[View Details]`,
        createdAt: new Date(Date.now() - 1000 * 60 * 30)
      },
      {
        recipientId: rahul._id,
        senderId: contractor._id,
        text: `📋 Attendance Recorded\nYour attendance for yesterday has been marked as Overtime (10.0 hours) by Contractor ${contractor.fullName}\n\n[View Attendance]`,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
      }
    ];

    const created = await Notification.create(notifs);

    res.status(200).json({ success: true, message: 'Test notifications created successfully', created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CALL HISTORY API ==========
app.get('/api/call-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const calls = await CallHistory.find({
      $or: [{ caller: userId }, { receiver: userId }]
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('caller', 'fullName avatarUrl role')
    .populate('receiver', 'fullName avatarUrl role')
    .lean();

    res.json({ calls });
  } catch (err) {
    console.error('Error fetching call history:', err);
    res.status(500).json({ message: 'Error fetching call history' });
  }
});

app.get('/api/call-history/:userId/:otherUserId', async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const calls = await CallHistory.find({
      $or: [
        { caller: userId, receiver: otherUserId },
        { caller: otherUserId, receiver: userId }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('caller', 'fullName avatarUrl role')
    .populate('receiver', 'fullName avatarUrl role')
    .lean();

    res.json({ calls });
  } catch (err) {
    console.error('Error fetching call history:', err);
    res.status(500).json({ message: 'Error fetching call history between users' });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


