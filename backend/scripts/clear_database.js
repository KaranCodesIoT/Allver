const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function clearDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in backend/.env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected to database:', mongoose.connection.name);

  const collections = await mongoose.connection.db.collections();
  console.log(`Found ${collections.length} collections.`);

  const summary = [];

  for (const collection of collections) {
    const name = collection.collectionName;
    if (name.startsWith('system.')) continue;
    
    const countBefore = await collection.countDocuments();
    const result = await collection.deleteMany({});
    summary.push({
      collection: name,
      deletedCount: result.deletedCount,
      countBefore
    });
  }

  console.log('\n--- Database Clearing Summary ---');
  console.table(summary);
  console.log('Total collections cleared:', summary.length);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB. Database is now completely empty.');
}

clearDatabase().catch(err => {
  console.error('Error clearing database:', err);
  process.exit(1);
});
