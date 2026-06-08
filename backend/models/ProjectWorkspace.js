const mongoose = require('mongoose');

const projectWorkspaceSchema = new mongoose.Schema({
  contractRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ContractRequest', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  projectType: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Discussion', 'Active', 'Completed'], 
    default: 'Discussion' 
  },
  quotation: {
    items: [{
      name: { type: String, required: true },
      cost: { type: Number, required: true }
    }],
    totalCost: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ['Draft', 'Sent', 'Accepted', 'Rejected'], 
      default: 'Draft' 
    }
  },
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    attachment: {
      name: { type: String },
      url: { type: String },
      type: { type: String } // 'file' or 'drawing'
    },
    createdAt: { type: Date, default: Date.now }
  }],
  files: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProjectWorkspace', projectWorkspaceSchema);
