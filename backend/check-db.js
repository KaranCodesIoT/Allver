const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const ContractRequest = require('./models/ContractRequest');
const ProjectWorkspace = require('./models/ProjectWorkspace');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const users = await User.find({}, 'fullName email role');
  console.log('--- USERS ---');
  console.log(users);

  const reqs = await ContractRequest.find({});
  console.log('--- CONTRACT REQUESTS ---');
  console.log(reqs);

  const workspaces = await ProjectWorkspace.find({});
  console.log('--- PROJECT WORKSPACES ---');
  console.log(workspaces);

  await mongoose.disconnect();
}

run();
