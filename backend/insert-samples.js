const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    
    // Check if labour exists
    const labourExists = await User.findOne({ role: 'Labour' });
    if (!labourExists) {
      const sampleLabour = new User({
        fullName: 'Amit Kumar',
        email: 'amit.kumar@example.com',
        phoneNumber: '9876543211',
        password: 'password123',
        role: 'Labour',
        city: 'Thane',
        skillType: 'Mason / Tiler',
        experience: '8 Years',
        availability: 'Available',
        shortDesc: 'Specialized in premium stone work, floor tiling, and concrete masonry with 8 years of on-site experience.'
      });
      await sampleLabour.save();
      console.log('Sample Labourer inserted!');
    } else {
      console.log('Labourer already exists');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
