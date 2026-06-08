const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected!');
    const users = await User.find({}, 'fullName email role phoneNumber city experience projects reviews rating');
    console.log('USERS_COUNT:', users.length);
    console.log('USERS:', JSON.stringify(users, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
