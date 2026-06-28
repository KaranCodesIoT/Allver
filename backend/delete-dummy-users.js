const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

const postSchema = new mongoose.Schema({
  title: String,
  description: String,
  type: String,
  mediaUrls: [String],
  creator: mongoose.Schema.Types.ObjectId,
});
const Post = mongoose.models.Post || mongoose.model('Post', postSchema);

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    // Find users
    const usersToDelete = await User.find({
      fullName: { $in: ['Rahul Verma', 'Priya Mishra', 'Neha Sharma', 'Ar. Neha Sharma'] }
    });

    const userIds = usersToDelete.map(u => u._id);
    console.log('Found users to delete:', usersToDelete.map(u => u.fullName));

    if (userIds.length > 0) {
      // Delete posts created by these users
      const deletedPosts = await Post.deleteMany({ creator: { $in: userIds } });
      console.log(`Deleted ${deletedPosts.deletedCount} posts created by dummy users.`);

      // Delete users
      const deletedUsers = await User.deleteMany({ _id: { $in: userIds } });
      console.log(`Deleted ${deletedUsers.deletedCount} dummy users.`);
    } else {
      console.log('No matching dummy users found in DB.');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
