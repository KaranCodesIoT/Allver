const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    const users = await User.find({}, 'fullName email role firmName normalizedFirmName');
    console.log('Users in DB:');
    users.forEach(u => {
      console.log(`Name: ${u.fullName}, Email: ${u.email}, Role: ${u.role}, FirmName: "${u.firmName}", Normalized: "${u.normalizedFirmName}"`);
    });
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
