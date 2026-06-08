const express = require('express');
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
      { folder: 'allverhq' },
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

const ContractRequest = require('./models/ContractRequest');
const ProjectWorkspace = require('./models/ProjectWorkspace');

// 1. Submit a Contract Request
app.post('/api/contract-requests', async (req, res) => {
  try {
    const { client, professional, title, projectType, location, budget, startDate, description } = req.body;
    
    if (!client || !professional || !title || !projectType || !location || !budget || !startDate) {
      return res.status(400).json({ message: 'Missing required project details' });
    }

    const newRequest = new ContractRequest({
      client,
      professional,
      title,
      projectType,
      location,
      budget,
      startDate: new Date(startDate),
      description
    });

    await newRequest.save();
    
    res.status(201).json({ 
      message: 'Contract request sent successfully', 
      contractRequest: newRequest 
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
    .populate('client', 'fullName email phoneNumber role city')
    .populate('professional', 'fullName email phoneNumber role city')
    .sort({ createdAt: -1 });

    res.status(200).json({ requests });
  } catch (error) {
    console.error('Error fetching contract requests:', error);
    res.status(500).json({ message: 'Error fetching contract requests: ' + error.message });
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

    res.status(200).json({ 
      message: `Contract request ${status.toLowerCase()} successfully`, 
      contractRequest: request,
      workspace
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
    .populate('client', 'fullName email phoneNumber role city')
    .populate('professional', 'fullName email phoneNumber role city')
    .sort({ createdAt: -1 });

    res.status(200).json({ workspaces });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ message: 'Error fetching workspaces: ' + error.message });
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

