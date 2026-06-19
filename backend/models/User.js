const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, default: '' },
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
  
  // Architect profile fields
  firmName: { type: String },
  portfolioImages: { type: [String] },
  specialization: { type: [String] },
  serviceArea: { type: [String] },
  whatsappNumber: { type: String },
  
  // Contractor profile fields
  contractorType: { type: String },
  teamSize: { type: String },
  workCategory: { type: [String] },
  serviceLocation: { type: [String] },
  
  // Labour profile fields
  skillType: { type: String },
  availability: { type: String }, // 'Available' or 'Not Available'
  
  // Shared fields
  experience: { type: String },
  location: { type: String },
  rating: { type: Number },
  reviews: { type: Number },
  projects: { type: Number },
  
  // Team members (array of User references)
  teamMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  media: [
    {
      url: { type: String, required: true },
      title: { type: String, default: '' },
      type: { type: String, enum: ['photo', 'video'], required: true },
      category: { type: String, enum: ['Photos', 'Videos', 'Reels'], required: true },
      projectName: { type: String, default: '' },
      projectType: { type: String, default: '' },
      location: { type: String, default: '' },
      description: { type: String, default: '' },
      duration: { type: String, default: '' },
      tags: { type: [String], default: [] },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
