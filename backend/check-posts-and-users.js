const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const fs = require('fs');
const path = require('path');

const postSchema = new mongoose.Schema({
  title: String,
  description: String,
  type: String,
  mediaUrls: [String],
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});
const Post = mongoose.models.Post || mongoose.model('Post', postSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const users = await User.find({}, 'fullName email role');
  const posts = await Post.find({}).populate('creator', 'fullName role');

  const output = `
=== DB STATUS AT ${new Date().toISOString()} ===
--- USERS ---
${JSON.stringify(users, null, 2)}

--- POSTS ---
${JSON.stringify(posts, null, 2)}
  `;

  fs.writeFileSync(path.join(__dirname, 'db_status.log'), output);
  console.log('Wrote db_status.log');
  await mongoose.disconnect();
}

run();
