const mongoose = require('mongoose');

const contractRequestSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  title: { type: String, required: true },
  projectType: { 
    type: String, 
    enum: ['Residential', 'Commercial', 'Renovation', 'Interior', 'Architecture', 'Electrical', 'Plumbing', 'General'],
    default: 'General'
  },
  location: { type: String, required: true },
  budget: { type: String, required: true },
  startDate: { type: Date },
  description: { type: String, default: '' },
  timeline: { type: String, default: '' },
  requirements: { type: [String], default: [] },
  status: { 
    type: String, 
    enum: ['Pending', 'Accepted', 'Rejected'], 
    default: 'Pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ContractRequest', contractRequestSchema);
