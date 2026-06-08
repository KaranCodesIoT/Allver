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
  .then(() => console.log('MongoDB connected successfully'))
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
    const { fullName, phoneNumber, password, role, city } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this phone number already exists' });
    }

    const newUser = new User({ fullName, phoneNumber, password, role, city });
    await newUser.save();
    
    res.status(201).json({ 
      message: 'User registered successfully', 
      user: { _id: newUser._id, fullName, phoneNumber, role, city } 
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

// User Login Route (Password or OTP verification)
app.post('/api/login', async (req, res) => {
  try {
    const { phoneNumber, password, otp, method } = req.body;
    
    // Find the user by phone number
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({ message: 'No account registered with this phone number.' });
    }
    
    if (method === 'otp') {
      // Validate OTP (mocked to '123456' for demonstration)
      if (otp !== '123456') {
        return res.status(400).json({ message: 'Invalid OTP code. For testing, use "123456".' });
      }
    } else {
      // Validate password
      if (user.password !== password) {
        return res.status(400).json({ message: 'Incorrect password. Please try again.' });
      }
    }
    
    // Successful login - return user object
    res.status(200).json({ 
      message: 'Login successful', 
      user: { _id: user._id, fullName: user.fullName, phoneNumber: user.phoneNumber, role: user.role, city: user.city } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in user: ' + (error.message || error) });
  }
});

// Mock Route to Send OTP
app.post('/api/login/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({ message: 'No account found with this phone number. Please register first.' });
    }
    
    // Simulating sending SMS OTP
    res.status(200).json({ message: 'OTP sent successfully! (Use "123456" to log in)' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Error sending OTP.' });
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
