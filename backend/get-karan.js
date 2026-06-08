const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const u = await User.findOne({ role: 'Contractor' });
  console.log('CONTRACTOR_USER:', JSON.stringify(u, null, 2));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
