/**
 * delete-labour-projects.js
 * Deletes ALL ProjectWorkspace documents linked to ANY Labour user, and
 * resets the `projects` counter to 0 on all Labour user profiles.
 *
 * A workspace is "linked to Labour" if:
 *   - The `professional` field is a Labour user, OR
 *   - The `labourTeam` array contains at least one Labour user.
 *
 * Runs immediately without confirmation prompt.
 */

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const ProjectWorkspace = require('./models/ProjectWorkspace');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB.\n');

    // 1. Find all Labour users
    const labourUsers = await User.find({ role: 'Labour' }, '_id fullName email').lean();
    const labourIds = labourUsers.map(u => u._id);

    console.log(`👷 Found ${labourUsers.length} Labour user(s):`);
    labourUsers.forEach(u => console.log(`   - ${u.fullName} (${u.email}) [${u._id}]`));
    console.log('');

    if (labourIds.length === 0) {
      console.log('⚠️  No Labour users found. Nothing to delete.');
      process.exit(0);
    }

    // 2. Find ALL workspaces linked to any Labour user
    //    — either as `professional` OR as a member of `labourTeam`
    const workspacesToDelete = await ProjectWorkspace.find({
      $or: [
        { professional: { $in: labourIds } },
        { labourTeam: { $in: labourIds } }
      ]
    }, '_id title status professional labourTeam').lean();

    console.log(`📦 Found ${workspacesToDelete.length} project workspace(s) linked to Labour users:`);
    workspacesToDelete.forEach(w =>
      console.log(`   - "${w.title}" [${w._id}] (Status: ${w.status})`)
    );
    console.log('');

    // 3. Delete all linked workspaces
    if (workspacesToDelete.length > 0) {
      const idsToDelete = workspacesToDelete.map(w => w._id);
      const deleteResult = await ProjectWorkspace.deleteMany({ _id: { $in: idsToDelete } });
      console.log(`🗑️  Deleted ${deleteResult.deletedCount} project workspace(s).\n`);
    } else {
      console.log('✅ No project workspaces linked to Labour users found.\n');
    }

    // 4. Also delete any ContractRequests linked to Labour users as professional
    try {
      const ContractRequest = require('./models/ContractRequest');
      const crResult = await ContractRequest.deleteMany({ professional: { $in: labourIds } });
      console.log(`🗑️  Deleted ${crResult.deletedCount} ContractRequest(s) linked to Labour users.\n`);
    } catch (e) {
      console.log('ℹ️  Could not clean ContractRequests (model may not exist or error):', e.message, '\n');
    }

    // 5. Also delete any ProjectBids by Labour users
    try {
      const ProjectBid = require('./models/ProjectBid');
      const bidResult = await ProjectBid.deleteMany({ bidder: { $in: labourIds } });
      console.log(`🗑️  Deleted ${bidResult.deletedCount} ProjectBid(s) by Labour users.\n`);
    } catch (e) {
      console.log('ℹ️  Could not clean ProjectBids (model may not exist or error):', e.message, '\n');
    }

    // 6. Reset `projects` count to 0 on all Labour profiles
    const updateResult = await User.updateMany(
      { role: 'Labour' },
      { $set: { projects: 0 } }
    );
    console.log(`🔄 Reset \`projects\` counter to 0 on ${updateResult.modifiedCount} Labour profile(s).\n`);

    console.log('✅ All done! Labour profiles are now cleared of all project data.');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
