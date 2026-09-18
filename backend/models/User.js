const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  emailVerified: { type: Boolean, default: false },
  firebaseUid: { type: String, default: null, sparse: true },

  phoneNumber: { type: String, default: '' },
  phoneVerified: { type: Boolean, default: false },
  password: { type: String, required: true },
  role: { type: String, enum: ['Architect', 'Contractor', 'Labour', 'Client'], required: true },
  city: { type: String, required: true },

  // Profile extended info
  about: { type: String },
  shortDesc: { type: String },
  avatarUrl: { type: String },
  cover: { type: String },
  country: { type: String },
  state: { type: String },
  area: { type: String },
  phone: { type: String },
  
  // Client profile fields
  projectType: { type: String },
  
  // Architect / Professional profile fields
  firmName: { type: String },
  normalizedFirmName: { type: String, unique: true, sparse: true },
  portfolioImages: { type: [String] },
  specialization: { type: [String] },
  serviceArea: { type: [String] },
  whatsappNumber: { type: String },
  
  // Contractor profile fields
  contractorType: { type: String },
  teamSize: { type: String },
  workCategory: { type: [String] },
  serviceLocation: { type: [String] },
  
  // Labour / Worker work area & availability fields
  skillType: { type: String },
  availability: { type: String, default: 'Available' }, // 'Available' or 'Not Available'
  isAvailableForBooking: { type: Boolean, default: true },
  workArea: { type: String }, // Preferred service / work area name (e.g. Dadar)
  workAreaRadius: { type: Number, default: 15 }, // Configured travel radius in km
  
  // Geolocation & Real GPS Current Location
  latitude: { type: Number },
  longitude: { type: Number },
  formattedAddress: { type: String },
  serviceRadiusKm: { type: Number, default: 15 },
  lastLocationUpdate: { type: Date, default: Date.now },
  
  // Shared fields
  experience: { type: String },
  location: { type: String },
  rating: { type: Number },
  reviews: { type: Number },
  projects: { type: Number, default: 0 },
  savedDesigns: { type: [mongoose.Schema.Types.ObjectId], ref: 'Post', default: [] },
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  
  // Featured ranking fields
  isVerified: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  profileCompletion: { type: Number, default: 0 }, // 0-100
  
  team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  portfolioHighlights: [{
    title: { type: String },
    projectType: { type: String },
    location: { type: String },
    budget: { type: String },
    timeline: { type: String },
    requirements: [{ type: String }],
    description: { type: String },
    mediaUrls: [{ type: String }],
    status: { type: String, default: 'Posted' },
    createdAt: { type: Date, default: Date.now },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    likedBy: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
    commentsList: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: { type: String, default: 'Anonymous' },
        userAvatar: { type: String, default: '' },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  }],

  expoPushToken: { type: String, default: '' },
  expoPushTokens: { type: [String], default: [] },
  fcmTokens: { type: [String], default: [] },
  notificationSettings: {
    messages: { type: Boolean, default: true },
    projectUpdates: { type: Boolean, default: true },
    contracts: { type: Boolean, default: true },
    payments: { type: Boolean, default: true },
    attendance: { type: Boolean, default: true },
    marketing: { type: Boolean, default: true },
    systemAlerts: { type: Boolean, default: true }
  },
  language: { type: String, default: 'en' },
  lastWalletActivityAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
