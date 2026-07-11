const mongoose = require('mongoose');

const projectWorkspaceSchema = new mongoose.Schema({
  contractRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ContractRequest', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contractor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  architect: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  labourTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  title: { type: String, required: true },
  projectType: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Discussion', 'Active', 'Waiting for Client Approval', 'Rework Required', 'Completed', 'Cancelled'], 
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
      enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Changes Requested'], 
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
  updates: [{
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'General' },
    img: { type: String },
    video: { type: String },
    postedBy: {
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      senderName: { type: String },
      senderRole: { type: String }
    },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      senderName: { type: String, required: true },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
  }],
  labourManagement: {
    attendance: [{
      date: { type: String, required: true },
      records: [{
        labourId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['Present', 'Half Day', 'Absent', 'Overtime'] },
        hours: { type: Number, default: 0 },
        latitude: { type: Number },
        longitude: { type: Number },
        checkInTime: { type: String },
        checkOutTime: { type: String },
        address: { type: String },
        distanceFromSite: { type: String },
        googleMapsLink: { type: String },
        isMarked: { type: Boolean, default: false }
      }],
      markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    payments: [{
      date: { type: Date, default: Date.now },
      labourId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      amount: { type: Number, required: true },
      type: { type: String, enum: ['Payment', 'Advance'], required: true },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
  },
  ratings: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true },
    reviewText: { type: String, default: '' },
    criteria: { type: Map, of: Number },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

projectWorkspaceSchema.index({ client: 1 });
projectWorkspaceSchema.index({ professional: 1 });
projectWorkspaceSchema.index({ contractor: 1 });
projectWorkspaceSchema.index({ architect: 1 });
projectWorkspaceSchema.index({ labourTeam: 1 });

module.exports = mongoose.model('ProjectWorkspace', projectWorkspaceSchema);
