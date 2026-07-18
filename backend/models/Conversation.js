const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  name: { type: String },
  url: { type: String },
  type: { type: String }, // 'image', 'video', 'file', 'pdf', 'voice'
  width: { type: Number },
  height: { type: Number },
  duration: { type: Number, default: 0 } // voice message duration in seconds
}, { _id: false });

const replyToSchema = new mongoose.Schema({
  _id: { type: String },
  senderName: { type: String },
  text: { type: String },
  attachmentType: { type: String }
}, { _id: false });

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  attachment: { type: attachmentSchema, default: null },
  replyTo: { type: replyToSchema, default: null },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedForEveryone: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
  // Participants: exactly 2 users for DM
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  
  // Last message info for list preview
  lastMessage: {
    text: { type: String, default: '' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  },
  
  // Messages array (embedded for simplicity)
  messages: [messageSchema],
  
  // Unread count per participant: { "userId1": 3, "userId2": 0 }
  unreadCount: { type: Map, of: Number, default: {} },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for fast lookup of conversations between 2 users
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
