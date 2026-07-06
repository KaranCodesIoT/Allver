const mongoose = require('mongoose');
const User = require('./models/User');

const usersToInsert = [
  // Contractors
  { fullName: 'Amit Kumar', role: 'Contractor', email: 'amit@gmail.com', password: 'amit123', city: 'Mumbai', phoneNumber: '9876543201', experience: '10 Years', teamSize: '15', firmName: 'Amit Construction Group' },
  { fullName: 'Rahul Verma', role: 'Contractor', email: 'rahul@gmail.com', password: 'rahul123', city: 'Pune', phoneNumber: '9876543202', experience: '8 Years', teamSize: '12', firmName: 'Verma Builders' },
  { fullName: 'Sandeep Yadav', role: 'Contractor', email: 'sandeep@gmail.com', password: 'sandeep123', city: 'Mumbai', phoneNumber: '9876543203', experience: '12 Years', teamSize: '25', firmName: 'Yadav Civil Works' },
  { fullName: 'Vikrant Singh', role: 'Contractor', email: 'vikrant@gmail.com', password: 'vikrant123', city: 'Delhi', phoneNumber: '9876543204', experience: '15 Years', teamSize: '30', firmName: 'Vikrant Infra Projects' },
  { fullName: 'Mohit Patel', role: 'Contractor', email: 'mohit@gmail.com', password: 'mohit123', city: 'Ahmedabad', phoneNumber: '9876543205', experience: '7 Years', teamSize: '10', firmName: 'Patel Contractors' },
  
  // Architects
  { fullName: 'Arjun Mehta', role: 'Architect', email: 'arjun@gmail.com', password: 'arjun123', city: 'Mumbai', phoneNumber: '9876543206', experience: '9 Years', firmName: 'Arjun Mehta Design Studio', specialization: ['Residential', 'Modern Luxury'] },
  { fullName: 'Karan Shah', role: 'Architect', email: 'karan@gmail.com', password: 'karan123', city: 'Pune', phoneNumber: '9876543207', experience: '11 Years', firmName: 'Shah & Associates', specialization: ['Commercial', 'Sustainable Design'] },
  { fullName: 'Ritesh Jain', role: 'Architect', email: 'ritesh@gmail.com', password: 'ritesh123', city: 'Mumbai', phoneNumber: '9876543208', experience: '8 Years', firmName: 'Jain Architectures', specialization: ['Interior Architecture'] },
  { fullName: 'Neha Gupta', role: 'Architect', email: 'neha@gmail.com', password: 'neha123', city: 'Delhi', phoneNumber: '9876543209', experience: '6 Years', firmName: 'Creative Spaces', specialization: ['Landscape Design'] },
  { fullName: 'Priya Mishra', role: 'Architect', email: 'priya@gmail.com', password: 'priya123', city: 'Bengaluru', phoneNumber: '9876543210', experience: '7 Years', firmName: 'Priya Mishra Designs', specialization: ['Villa Design', 'Contemporary'] },
  
  // Labours
  { fullName: 'Rakesh Chauhan', role: 'Labour', email: 'rakesh@gmail.com', password: 'rakesh123', city: 'Mumbai', phoneNumber: '9876543211', experience: '5 Years', skillType: 'Mason', availability: 'Available' },
  { fullName: 'Sunil Yadav', role: 'Labour', email: 'sunil@gmail.com', password: 'sunil123', city: 'Pune', phoneNumber: '9876543212', experience: '6 Years', skillType: 'Painter', availability: 'Available' },
  { fullName: 'Deepak Kumar', role: 'Labour', email: 'deepak@gmail.com', password: 'deepak123', city: 'Mumbai', phoneNumber: '9876543213', experience: '4 Years', skillType: 'Plumber', availability: 'Available' },
  { fullName: 'Pawan Singh', role: 'Labour', email: 'pawan@gmail.com', password: 'pawan123', city: 'Delhi', phoneNumber: '9876543214', experience: '7 Years', skillType: 'Bar Bender', availability: 'Available' },
  { fullName: 'Santosh Patel', role: 'Labour', email: 'santosh@gmail.com', password: 'santosh123', city: 'Ahmedabad', phoneNumber: '9876543215', experience: '8 Years', skillType: 'Tile Layer', availability: 'Available' },
  
  // Clients
  { fullName: 'Ankit Sharma', role: 'Client', email: 'ankit@gmail.com', password: 'ankit123', city: 'Mumbai', phoneNumber: '9876543216', projectType: 'Residential Bungalow' },
  { fullName: 'Rohit Agarwal', role: 'Client', email: 'rohit@gmail.com', password: 'rohit123', city: 'Pune', phoneNumber: '9876543217', projectType: 'Apartment Renovation' },
  { fullName: 'Vivek Tiwari', role: 'Client', email: 'vivek@gmail.com', password: 'vivek123', city: 'Mumbai', phoneNumber: '9876543218', projectType: 'Commercial Shop' },
  { fullName: 'Nitin Verma', role: 'Client', email: 'nitin@gmail.com', password: 'nitin123', city: 'Delhi', phoneNumber: '9876543219', projectType: 'Residential Villa' },
  { fullName: 'Akash Dubey', role: 'Client', email: 'akash@gmail.com', password: 'akash123', city: 'Bengaluru', phoneNumber: '9876543220', projectType: 'Office Fitout' }
];

async function insertUsers() {
  console.log('=== ALLVER SEEDER: CONNECTED TO DB, STARTING INSERTION ===');
  let insertedCount = 0;
  for (const userData of usersToInsert) {
    try {
      if (userData.firmName) {
        userData.normalizedFirmName = userData.firmName.trim().toLowerCase().replace(/\s+/g, ' ');
      }
      const existing = await User.findOne({ email: userData.email });
      if (!existing) {
        const newUser = new User(userData);
        await newUser.save();
        console.log(`Inserted user: ${userData.fullName} (${userData.role})`);
        insertedCount++;
      } else {
        console.log(`User already exists: ${userData.fullName} (${userData.email})`);
      }
    } catch (err) {
      console.error(`Error inserting ${userData.fullName}:`, err);
    }
  }
  console.log(`=== ALLVER SEEDER: SUCCESS, INSERTED ${insertedCount} NEW USERS ===`);
}

module.exports = insertUsers;
