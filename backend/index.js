const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
const PORT = process.env.PORT || 5000;

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

const User = require('./models/User');
const Review = require('./models/Review');
const Message = require('./models/Message');
const ContractRequest = require('./models/ContractRequest');
const ProjectWorkspace = require('./models/ProjectWorkspace');
const Design = require('./models/Design');

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
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
  res.send('Allver API is running...');
});

app.get('/api/stats', (req, res) => {
  res.json(platformStats);
});

app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, role, city } = req.body;
    
    // Check if user already exists by email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const newUser = new User({ fullName, email, phoneNumber: phoneNumber || '', password, role, city });
    await newUser.save();
    
    res.status(201).json({ 
      message: 'User registered successfully', 
      user: { _id: newUser._id, fullName, email, phoneNumber: newUser.phoneNumber, role, city } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user: ' + (error.message || error) });
  }
});

// Update User Profile
app.put('/api/user/profile/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const profileData = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: profileData },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile: ' + (error.message || error) });
  }
});

// User Login Route (Email + Password)
app.post('/api/login', async (req, res) => {
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
    
    // Successful login - return user object
    res.status(200).json({ 
      message: 'Login successful', 
      user: { _id: user._id, fullName: user.fullName, email: user.email, phoneNumber: user.phoneNumber, role: user.role, city: user.city } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in user: ' + (error.message || error) });
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
    res.status(200).json({ professionals });
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
    res.status(200).json({ professional });
  } catch (error) {
    console.error('Error fetching professional:', error);
    res.status(500).json({ message: 'Error fetching professional' });
  }
});

// Cloudinary Image Upload Route (with local fallback)
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const isCloudinaryConfigured = 
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_CLOUD_NAME !== 'Root' &&
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET;

  const saveLocal = () => {
    try {
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, req.file.buffer);
      const host = req.get('host') || `localhost:${PORT}`;
      const fileUrl = `${req.protocol}://${host}/uploads/${filename}`;
      return res.status(200).json({ url: fileUrl });
    } catch (err) {
      console.error('Local upload fallback error:', err);
      return res.status(500).json({ message: 'Image upload failed locally' });
    }
  };

  if (isCloudinaryConfigured) {
    // Upload image buffer directly to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'allverhq', resource_type: 'auto' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          console.log('Falling back to local storage...');
          return saveLocal();
        }
        return res.status(200).json({ url: result.secure_url });
      }
    );
    uploadStream.end(req.file.buffer);
  } else {
    console.log('Cloudinary not configured or using default placeholders. Saving locally...');
    return saveLocal();
  }
});

// --- Contract Request and Project Workspace Endpoints ---

const Notification = require('./models/Notification');

// Active Server-Sent Events client streams
let sseClients = [];

// SSE endpoint for notifications
app.get('/api/notifications/stream/:userId', (req, res) => {
  const { userId } = req.params;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Heartbeat comment to keep connection alive
  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 20000);
  
  const newClient = {
    userId,
    res
  };
  
  sseClients.push(newClient);
  
  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients = sseClients.filter(client => client.res !== res);
  });
});

// Helper to broadcast notification to a specific user
const sendRealTimeNotification = (userId, data) => {
  const targetIdStr = userId.toString();
  const clients = sseClients.filter(c => c.userId === targetIdStr);
  clients.forEach(client => {
    try {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error('Error sending message over SSE:', err);
    }
  });
};

// 1. Submit a Contract Request
app.post('/api/contract-requests', async (req, res) => {
  try {
    const {
      client, professional, professionalRole,
      clientName, companyName, mobileNumber, email,
      title, projectType, location, budget, startDate, expectedCompletionDate, description,
      attachmentUrl, attachmentName, priority,
      // Architect-specific
      plotArea, builtUpArea, designRequirements, needSiteVisits,
      // Contractor-specific
      constructionType, totalArea, materialResponsibility, labourIncluded, estimatedProjectDuration,
      // Labour-specific
      labourCategory, workingDuration, dailyMonthlyContract, accommodationProvided
    } = req.body;

    if (!client || !professional || !title || !projectType || !location || !budget || !startDate) {
      return res.status(400).json({ message: 'Missing required project details' });
    }

    const newRequest = new ContractRequest({
      client, professional, professionalRole: professionalRole || 'Architect',
      clientName: clientName || '', companyName: companyName || '',
      mobileNumber: mobileNumber || '', email: email || '',
      title, projectType, location, budget,
      startDate: new Date(startDate),
      expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : undefined,
      description: description || '',
      attachmentUrl: attachmentUrl || '', attachmentName: attachmentName || '',
      priority: priority || 'Normal',
      // Architect
      plotArea: plotArea || '', builtUpArea: builtUpArea || '',
      designRequirements: designRequirements || '', needSiteVisits: !!needSiteVisits,
      // Contractor
      constructionType: constructionType || '', totalArea: totalArea || '',
      materialResponsibility: materialResponsibility || '', labourIncluded: !!labourIncluded,
      estimatedProjectDuration: estimatedProjectDuration || '',
      // Labour
      labourCategory: labourCategory || '', workingDuration: workingDuration || '',
      dailyMonthlyContract: dailyMonthlyContract || '', accommodationProvided: !!accommodationProvided
    });

    await newRequest.save();

    // 1. Fetch Client Profile details to construct a beautiful notification message
    let clientNameVal = clientName || '';
    if (!clientNameVal) {
      const clientUser = await User.findById(client);
      if (clientUser) clientNameVal = clientUser.fullName;
    }

    const messageText = `New Project Request Received from ${clientNameVal || 'Client'} for ${title}.`;

    // 2. Create In-App Notification in the database
    const notification = new Notification({
      recipient: professional,
      sender: client,
      message: messageText,
      type: 'HiringRequest',
      relatedId: newRequest._id,
      read: false
    });
    await notification.save();

    // 3. Populate and send real-time notification
    const populatedNotif = await Notification.findById(notification._id)
      .populate('sender', 'fullName avatarUrl role')
      .populate('recipient', 'fullName avatarUrl role')
      .populate('relatedId');

    sendRealTimeNotification(professional, {
      type: 'NEW_NOTIFICATION',
      notification: populatedNotif,
      contractRequest: newRequest
    });

    res.status(201).json({
      message: 'Contract request sent successfully',
      contractRequest: newRequest,
      notification: populatedNotif
    });
  } catch (error) {
    console.error('Error creating contract request:', error);
    res.status(500).json({ message: 'Error sending contract request: ' + error.message });
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

    res.status(200).json({ requests });
  } catch (error) {
    console.error('Error fetching contract requests:', error);
    res.status(500).json({ message: 'Error fetching contract requests: ' + error.message });
  }
});

// 2b. Get a single contract request by ID
app.get('/api/contract-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ContractRequest.findById(id)
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl');
    if (!request) {
      return res.status(404).json({ message: 'Contract request not found' });
    }
    res.status(200).json({ contractRequest: request });
  } catch (error) {
    console.error('Error fetching contract request:', error);
    res.status(500).json({ message: 'Error fetching contract request: ' + error.message });
  }
});

// 3. Accept or Reject a contract request
app.put('/api/contract-requests/:id/status', async (req, res) => {

  try {
    const { id } = req.params;
    const { status } = req.body; // 'Accepted' or 'Rejected'

    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status update' });
    }

    const request = await ContractRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Contract request not found' });
    }

    request.status = status;
    if (status === 'Accepted') {
      request.acceptedAt = new Date();
      request.statusHistory.push({ status: 'Accepted', date: new Date() });
    } else if (status === 'Rejected') {
      request.rejectedAt = new Date();
      request.statusHistory.push({ status: 'Rejected', date: new Date() });
    }
    await request.save();

    let workspace = null;
    if (status === 'Accepted') {
      // Check if a workspace already exists for this request
      const existing = await ProjectWorkspace.findOne({ contractRequest: id });
      if (!existing) {
        workspace = new ProjectWorkspace({
          contractRequest: id,
          client: request.client,
          professional: request.professional,
          title: request.title,
          projectType: request.projectType,
          status: 'Discussion'
        });
        await workspace.save();
      } else {
        workspace = existing;
      }
    }

    // 1. Fetch info and send notification to Client
    const professionalUser = await User.findById(request.professional);
    const profNameVal = professionalUser ? professionalUser.fullName : 'Professional';
    const profRole = request.professionalRole || (professionalUser ? professionalUser.role : 'Professional');
    const rolePrefix = profRole === 'Architect' ? 'Ar. ' : '';
    
    const clientMessageText = `Your project request has been ${status.toLowerCase()} by ${rolePrefix}${profNameVal}.`;

    const clientNotification = new Notification({
      recipient: request.client,
      sender: request.professional,
      message: clientMessageText,
      type: 'HiringRequest',
      relatedId: request._id,
      read: false
    });
    await clientNotification.save();

    const populatedClientNotif = await Notification.findById(clientNotification._id)
      .populate('sender', 'fullName avatarUrl role')
      .populate('recipient', 'fullName avatarUrl role')
      .populate('relatedId');

    // Emit real-time notification to the client
    sendRealTimeNotification(request.client, {
      type: 'NEW_NOTIFICATION',
      notification: populatedClientNotif,
      contractRequest: request
    });

    // 2. Send notification to Professional
    const profMessageText = `You successfully ${status.toLowerCase()} the project request.`;
    
    const profNotification = new Notification({
      recipient: request.professional,
      sender: request.client,
      message: profMessageText,
      type: 'HiringRequest',
      relatedId: request._id,
      read: false
    });
    await profNotification.save();

    const populatedProfNotif = await Notification.findById(profNotification._id)
      .populate('sender', 'fullName avatarUrl role')
      .populate('recipient', 'fullName avatarUrl role')
      .populate('relatedId');

    // Emit real-time notification to the professional
    sendRealTimeNotification(request.professional, {
      type: 'NEW_NOTIFICATION',
      notification: populatedProfNotif,
      contractRequest: request
    });

    // Emit real-time status update to client and professional private rooms via Socket.IO
    io.to(`user:${request.client}`).emit('request_status_updated', {
      requestId: id,
      status,
      workspace
    });
    io.to(`user:${request.professional}`).emit('request_status_updated', {
      requestId: id,
      status,
      workspace
    });

    res.status(200).json({ 
      message: `Contract request ${status.toLowerCase()} successfully`, 
      contractRequest: request,
      workspace,
      notification: populatedProfNotif
    });
  } catch (error) {
    console.error('Error updating contract request:', error);
    res.status(500).json({ message: 'Error updating contract request: ' + error.message });
  }
});

// 4. Get all workspaces for a user
app.get('/api/project-workspaces/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const workspaces = await ProjectWorkspace.find({
      $or: [{ client: userId }, { professional: userId }]
    })
    .populate('contractRequest')
    .populate('client', 'fullName email phoneNumber role city avatarUrl')
    .populate('professional', 'fullName email phoneNumber role city avatarUrl')
    .sort({ createdAt: -1 });

    // Only return workspaces that are Accepted
    const activeWorkspaces = workspaces.filter(ws => {
      return !ws.contractRequest || ws.contractRequest.status === 'Accepted';
    });

    res.status(200).json({ workspaces: activeWorkspaces });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ message: 'Error fetching workspaces: ' + error.message });
  }
});

// Get workspace by contractRequest ID
app.get('/api/project-workspaces/request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const workspace = await ProjectWorkspace.findOne({ contractRequest: requestId })
      .populate('client', 'fullName email phoneNumber role city avatarUrl')
      .populate('professional', 'fullName email phoneNumber role city avatarUrl')
      .populate({
        path: 'messages.sender',
        select: 'fullName email role avatarUrl'
      });

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    res.status(200).json({ workspace });
  } catch (error) {
    console.error('Error fetching workspace by request ID:', error);
    res.status(500).json({ message: 'Error fetching workspace: ' + error.message });
  }
});

// 5. Get workspace details by ID
app.get('/api/project-workspaces/:id', async (req, res) => {
  try {
    const workspace = await ProjectWorkspace.findById(req.params.id)
      .populate('client', 'fullName email phoneNumber role city')
      .populate('professional', 'fullName email phoneNumber role city')
      .populate({
        path: 'messages.sender',
        select: 'fullName email role'
      });

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    res.status(200).json({ workspace });
  } catch (error) {
    console.error('Error fetching workspace details:', error);
    res.status(500).json({ message: 'Error fetching workspace: ' + error.message });
  }
});

// 6. Send message in a workspace
app.post('/api/project-workspaces/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { sender, text, attachment } = req.body;

    if (!sender) {
      return res.status(400).json({ message: 'Sender ID is required' });
    }

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
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

    const updatedWorkspace = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city')
      .populate('professional', 'fullName email phoneNumber role city')
      .populate({
        path: 'messages.sender',
        select: 'fullName email role'
      });

    // Emit real-time workspace message via Socket.IO
    const ioEventData = {
      workspaceId: id,
      workspace: updatedWorkspace
    };
    io.to(`user:${updatedWorkspace.client._id || updatedWorkspace.client}`).emit('workspace_message_received', ioEventData);
    io.to(`user:${updatedWorkspace.professional._id || updatedWorkspace.professional}`).emit('workspace_message_received', ioEventData);

    res.status(201).json({ message: 'Message sent successfully', workspace: updatedWorkspace });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message: ' + error.message });
  }
});

// 7. Update quotation details or status
app.put('/api/project-workspaces/:id/quotation', async (req, res) => {
  try {
    const { id } = req.params;
    const { items, totalCost, status } = req.body;

    const workspace = await ProjectWorkspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
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
      .populate('client', 'fullName email phoneNumber role city')
      .populate('professional', 'fullName email phoneNumber role city')
      .populate({
        path: 'messages.sender',
        select: 'fullName email role'
      });

    // Emit real-time workspace message via Socket.IO
    const ioEventData = {
      workspaceId: id,
      workspace: updatedWorkspace
    };
    io.to(`user:${updatedWorkspace.client._id || updatedWorkspace.client}`).emit('workspace_message_received', ioEventData);
    io.to(`user:${updatedWorkspace.professional._id || updatedWorkspace.professional}`).emit('workspace_message_received', ioEventData);

    res.status(200).json({ message: 'Quotation updated successfully', workspace: updatedWorkspace });
  } catch (error) {
    console.error('Error updating quotation:', error);
    res.status(500).json({ message: 'Error updating quotation: ' + error.message });
  }
});

// 8. Upload a file directly to the workspace
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

    const updatedWorkspace = await ProjectWorkspace.findById(id)
      .populate('client', 'fullName email phoneNumber role city')
      .populate('professional', 'fullName email phoneNumber role city')
      .populate({
        path: 'messages.sender',
        select: 'fullName email role'
      });

    res.status(201).json({ message: 'File uploaded successfully', workspace: updatedWorkspace });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Error uploading file: ' + error.message });
  }
});

// GET all notifications for a user
app.get('/api/notifications/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ recipient: userId })
      .populate('sender', 'fullName avatarUrl role')
      .populate('recipient', 'fullName avatarUrl role')
      .populate('relatedId')
      .sort({ createdAt: -1 });
    res.status(200).json({ notifications });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Error fetching notifications: ' + err.message });
  }
});

// Mark single notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { $set: { read: true } },
      { new: true }
    ).populate('sender', 'fullName avatarUrl role');
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.status(200).json({ notification });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ message: 'Error updating notification: ' + err.message });
  }
});

// Mark all notifications for a user as read
app.put('/api/notifications/user/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;
    await Notification.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ message: 'Error marking all notifications as read: ' + err.message });
  }
});

// GET unread notifications count for a user
app.get('/api/notifications/user/:userId/unread-count', async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await Notification.countDocuments({ recipient: userId, read: false });
    res.status(200).json({ count });
  } catch (err) {
    console.error('Error counting unread notifications:', err);
    res.status(500).json({ message: 'Error counting unread notifications: ' + err.message });
  }
});

// --- Review & Rating Endpoints ---

// Get reviews and statistics for a professional
app.get('/api/professional/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const reviewsList = await Review.find({ professional: id })
      .populate('reviewer', 'fullName avatarUrl role')
      .sort({ createdAt: -1 });

    const totalReviews = reviewsList.length;
    let averageRating = 0;
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (totalReviews > 0) {
      const sum = reviewsList.reduce((acc, r) => {
        const ratingVal = Math.round(r.rating);
        if (breakdown[ratingVal] !== undefined) {
          breakdown[ratingVal] += 1;
        }
        return acc + r.rating;
      }, 0);
      averageRating = parseFloat((sum / totalReviews).toFixed(1));
    }

    res.status(200).json({
      reviews: reviewsList,
      stats: {
        totalReviews,
        averageRating,
        breakdown
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Error fetching reviews: ' + error.message });
  }
});

// Submit a review for a professional
app.post('/api/professional/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewer, rating, reviewText, projectImages } = req.body;

    if (!reviewer || !rating || !reviewText) {
      return res.status(400).json({ message: 'Missing required review fields: reviewer, rating, reviewText' });
    }

    // Save the new review
    const newReview = new Review({
      professional: id,
      reviewer,
      rating: Number(rating),
      reviewText,
      projectImages: projectImages || []
    });
    await newReview.save();

    // Calculate updated ratings and review count
    const reviewsList = await Review.find({ professional: id });
    const totalReviews = reviewsList.length;
    let averageRating = 0;
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (totalReviews > 0) {
      const sum = reviewsList.reduce((acc, r) => {
        const ratingVal = Math.round(r.rating);
        if (breakdown[ratingVal] !== undefined) {
          breakdown[ratingVal] += 1;
        }
        return acc + r.rating;
      }, 0);
      averageRating = parseFloat((sum / totalReviews).toFixed(1));
    }

    // Update the professional's User document
    await User.findByIdAndUpdate(id, {
      $set: {
        rating: averageRating,
        reviews: totalReviews
      }
    });

    // Populate and return new review
    const populatedReview = await Review.findById(newReview._id)
      .populate('reviewer', 'fullName avatarUrl role');

    res.status(201).json({
      message: 'Review submitted successfully',
      review: populatedReview,
      stats: {
        totalReviews,
        averageRating,
        breakdown
      }
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ message: 'Error submitting review: ' + error.message });
  }
});

// ─── TEAM MANAGEMENT ROUTES ────────────────────────────────────────────────

// GET all professionals (for Add Team Member modal)
app.get('/api/professionals', async (req, res) => {
  try {
    const { role, search } = req.query;
    const filter = { role: { $in: ['Architect', 'Contractor', 'Labour'] } };
    if (role && ['Architect', 'Contractor', 'Labour'].includes(role)) {
      filter.role = role;
    }
    if (search && search.trim()) {
      filter.$or = [
        { fullName: { $regex: search.trim(), $options: 'i' } },
        { city: { $regex: search.trim(), $options: 'i' } },
        { specialization: { $regex: search.trim(), $options: 'i' } },
        { skillType: { $regex: search.trim(), $options: 'i' } },
        { contractorType: { $regex: search.trim(), $options: 'i' } }
      ];
    }
    const professionals = await User.find(filter)
      .select('fullName avatarUrl role city experience specialization skillType contractorType firmName rating reviews')
      .sort({ rating: -1 })
      .limit(100);
    res.json({ professionals });
  } catch (error) {
    console.error('Error fetching professionals:', error);
    res.status(500).json({ message: 'Error fetching professionals' });
  }
});

// GET team members for a professional
app.get('/api/professional/:id/team', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .populate('teamMembers', 'fullName avatarUrl role city experience specialization skillType contractorType firmName rating reviews');
    if (!user) return res.status(404).json({ message: 'Professional not found' });
    res.json({ teamMembers: user.teamMembers || [] });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ message: 'Error fetching team members' });
  }
});

// POST add a team member
app.post('/api/professional/:id/team', async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ message: 'memberId is required' });
    if (id === memberId) return res.status(400).json({ message: 'Cannot add yourself to your team' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Professional not found' });

    const member = await User.findById(memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    // Prevent duplicates
    const alreadyAdded = (user.teamMembers || []).some(m => m.toString() === memberId);
    if (alreadyAdded) return res.status(409).json({ message: 'Member already in team' });

    user.teamMembers = [...(user.teamMembers || []), memberId];
    await user.save();

    // Return populated member info
    const populatedUser = await User.findById(id)
      .populate('teamMembers', 'fullName avatarUrl role city experience specialization skillType contractorType firmName rating reviews');
    res.status(201).json({ message: 'Team member added', teamMembers: populatedUser.teamMembers });
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({ message: 'Error adding team member' });
  }
});

// DELETE remove a team member
app.delete('/api/professional/:id/team/:memberId', async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Professional not found' });

    user.teamMembers = (user.teamMembers || []).filter(m => m.toString() !== memberId);
    await user.save();

    res.json({ message: 'Team member removed', teamMembers: user.teamMembers });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ message: 'Error removing team member' });
  }
});

// ─── REAL-TIME CHAT ENDPOINTS ───────────────────────────────────────────────

// GET conversation history between two users
app.get('/api/messages/:userA/:userB', async (req, res) => {
  try {
    const { userA, userB } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: userA, receiverId: userB },
        { senderId: userB, receiverId: userA }
      ]
    })
    .populate('senderId', 'fullName avatarUrl role')
    .populate('receiverId', 'fullName avatarUrl role')
    .sort({ createdAt: 1 });
    res.json({ messages });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ message: 'Error fetching messages: ' + err.message });
  }
});

// GET all users this user has chatted with (for contacts list hydration)
app.get('/api/chat-contacts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // Find distinct conversation partners
    const sentMessages = await Message.distinct('receiverId', { senderId: userId });
    const receivedMessages = await Message.distinct('senderId', { receiverId: userId });
    const allPartnerIds = [...new Set([...sentMessages.map(String), ...receivedMessages.map(String)])];
    
    // For each partner, get the latest message and unread count
    const contacts = await Promise.all(allPartnerIds.map(async (partnerId) => {
      const lastMessage = await Message.findOne({
        $or: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId }
        ]
      })
      .populate('senderId', 'fullName avatarUrl role')
      .sort({ createdAt: -1 });

      const unreadCount = await Message.countDocuments({
        senderId: partnerId,
        receiverId: userId,
        read: false
      });

      const partner = await User.findById(partnerId).select('fullName avatarUrl role city email');
      if (!partner) return null;

      return {
        user: partner,
        lastMessage: lastMessage ? {
          text: lastMessage.text,
          createdAt: lastMessage.createdAt,
          fromMe: lastMessage.senderId._id.toString() === userId
        } : null,
        unreadCount
      };
    }));

    res.json({ contacts: contacts.filter(Boolean) });
  } catch (err) {
    console.error('Error fetching chat contacts:', err);
    res.status(500).json({ message: 'Error fetching chat contacts: ' + err.message });
  }
});

// GET all users for contact discovery (all registered users except current)
app.get('/api/all-users/:exceptUserId', async (req, res) => {
  try {
    const { exceptUserId } = req.params;
    const users = await User.find({ _id: { $ne: exceptUserId } })
      .select('fullName avatarUrl role city email experience rating reviews')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// ─── SOCKET.IO REAL-TIME CHAT ────────────────────────────────────────────────
const onlineUsers = new Map(); // userId -> Set of socketIds

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Join user to their private room
  socket.on('join', ({ userId }) => {
    if (!userId) return;
    socket.join(`user:${userId}`);
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    console.log(`User ${userId} joined room user:${userId}`);
  });

  // Handle sending a message
  socket.on('send_message', async ({ senderId, receiverId, text }) => {
    if (!senderId || !receiverId || !text?.trim()) return;
    try {
      const message = new Message({ senderId, receiverId, text: text.trim() });
      await message.save();

      const populated = await Message.findById(message._id)
        .populate('senderId', 'fullName avatarUrl role email')
        .populate('receiverId', 'fullName avatarUrl role email');

      // Emit to both sender and receiver rooms
      io.to(`user:${receiverId}`).emit('new_message', populated);
      io.to(`user:${senderId}`).emit('new_message', populated);
    } catch (err) {
      console.error('Error sending socket message:', err);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // Mark messages as read
  socket.on('mark_read', async ({ senderId, receiverId }) => {
    if (!senderId || !receiverId) return;
    try {
      await Message.updateMany(
        { senderId, receiverId, read: false },
        { $set: { read: true } }
      );
      // Notify the original sender that their messages were read
      io.to(`user:${senderId}`).emit('messages_read', { senderId, receiverId });
    } catch (err) {
      console.error('Error marking messages read:', err);
    }
  });

  socket.on('disconnect', () => {
    // Clean up online users map
    for (const [userId, sockets] of onlineUsers.entries()) {
      sockets.delete(socket.id);
      if (sockets.size === 0) onlineUsers.delete(userId);
    }
    console.log('Socket disconnected:', socket.id);
  });
});

// ==========================================
// DESIGN POSTS ROUTES
// ==========================================

// GET all designs (any user)
app.get('/api/designs', async (req, res) => {
  try {
    const designs = await Design.find()
      .populate('author', 'fullName role city avatarUrl rating reviews')
      .sort({ createdAt: -1 });
    res.status(200).json({ designs });
  } catch (err) {
    console.error('Error fetching designs:', err);
    res.status(500).json({ message: 'Error fetching designs: ' + err.message });
  }
});

// POST new design — Architects only
app.post('/api/designs', async (req, res) => {
  try {
    const { authorId, title, location, overview, mainImage, images, designType, priceRange } = req.body;

    if (!authorId) {
      return res.status(400).json({ message: 'authorId is required' });
    }

    // Verify user exists and is an Architect
    const author = await User.findById(authorId);
    if (!author) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (author.role !== 'Architect') {
      return res.status(403).json({ message: 'Only Architects can post designs' });
    }

    if (!title || !location) {
      return res.status(400).json({ message: 'Title and location are required' });
    }

    const design = new Design({
      title: title.trim(),
      location: location.trim(),
      overview: overview || '',
      mainImage: mainImage || '',
      images: images || [],
      designType: designType || 'Other',
      priceRange: priceRange || 'mid',
      author: authorId
    });

    await design.save();
    const populated = await design.populate('author', 'fullName role city avatarUrl rating reviews');
    res.status(201).json({ message: 'Design posted successfully', design: populated });
  } catch (err) {
    console.error('Error posting design:', err);
    res.status(500).json({ message: 'Error posting design: ' + err.message });
  }
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
