/**
 * clear-attendance-data.js
 * Wipes all labourManagement.attendance arrays from every ProjectWorkspace.
 * This is a one-shot irreversible cleanup script.
 */

const mongoose = require('mongoose');
require('dotenv').config();
const ProjectWorkspace = require('./models/ProjectWorkspace');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB.\n');

    const result = await ProjectWorkspace.updateMany(
      {},
      { $set: { 'labourManagement.attendance': [] } }
    );

    console.log(`🗑️  Cleared attendance data from ${result.modifiedCount} ProjectWorkspace(s).`);
    console.log('✅ Done — all attendance records wiped.');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
