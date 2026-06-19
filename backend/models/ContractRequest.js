const mongoose = require('mongoose');

const contractRequestSchema = new mongoose.Schema({
  // Core relations
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professionalRole: { type: String, enum: ['Architect', 'Contractor', 'Labour'], default: 'Architect' },

  // Common fields
  clientName: { type: String, default: '' },
  companyName: { type: String, default: '' },
  mobileNumber: { type: String, default: '' },
  email: { type: String, default: '' },
  title: { type: String, required: true },
  projectType: { type: String, required: true },
  location: { type: String, required: true },
  budget: { type: String, required: true },
  startDate: { type: Date, required: true },
  expectedCompletionDate: { type: Date },
  description: { type: String, default: '' },
  attachmentUrl: { type: String, default: '' },
  attachmentName: { type: String, default: '' },
  priority: { type: String, enum: ['Normal', 'Urgent'], default: 'Normal' },

  // Architect-specific fields
  plotArea: { type: String, default: '' },
  builtUpArea: { type: String, default: '' },
  designRequirements: { type: String, default: '' },
  needSiteVisits: { type: Boolean, default: false },

  // Contractor-specific fields
  constructionType: { type: String, default: '' },
  totalArea: { type: String, default: '' },
  materialResponsibility: { type: String, enum: ['Client', 'Contractor', ''], default: '' },
  labourIncluded: { type: Boolean, default: false },
  estimatedProjectDuration: { type: String, default: '' },

  // Labour-specific fields
  labourCategory: { type: String, default: '' },
  workingDuration: { type: String, default: '' },
  dailyMonthlyContract: { type: String, enum: ['Daily', 'Monthly', ''], default: '' },
  accommodationProvided: { type: Boolean, default: false },

  // Status
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected'],
    default: 'Pending'
  },
  acceptedAt: { type: Date },
  rejectedAt: { type: Date },
  statusHistory: [
    {
      status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'] },
      date: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ContractRequest', contractRequestSchema);
