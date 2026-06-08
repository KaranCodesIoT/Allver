const mongoose = require('mongoose');

const contractRequestSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  projectType: { 
    type: String, 
    enum: ['Residential', 'Commercial', 'Renovation', 'Interior', 'Electrical', 'Plumbing'],
    required: true 
  },
  location: { type: String, required: true },
  budget: { type: String, required: true },
  startDate: { type: Date, required: true },
  description: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['Pending', 'Accepted', 'Rejected'], 
    default: 'Pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ContractRequest', contractRequestSchema);
