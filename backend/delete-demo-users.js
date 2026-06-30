const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    const users = await User.find({ email: { $regex: '@example.com' } }).select('fullName email role');
    console.log(`Found ${users.length} example.com user(s):`);
    users.forEach(u => console.log(` - ${u.fullName} (${u.email}) [${u.role}]`));
    if (users.length > 0) {
      const result = await User.deleteMany({ email: { $regex: '@example.com' } });
      console.log(`Deleted ${result.deletedCount} demo user(s).`);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
