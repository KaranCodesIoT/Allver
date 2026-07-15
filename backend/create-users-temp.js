const mongoose = require('mongoose');
const User = require('./models/User');

const usersToInsert = [
  // Contractors (5)
  {
    fullName: 'Amit Kumar',
    role: 'Contractor',
    email: 'amitcontractor@gmail.com',
    password: 'amit123',
    city: 'Mumbai',
    phoneNumber: '9876543001',
    experience: '8 Years',
    teamSize: '12',
    firmName: 'Amit Construction Group',
    contractorType: 'Civil Contractor',
    workCategory: ['Civil Works', 'Concrete'],
    serviceLocation: ['Mumbai', 'Thane']
  },
  {
    fullName: 'Rajesh Sharma',
    role: 'Contractor',
    email: 'rajeshcontractor@gmail.com',
    password: 'rajesh123',
    city: 'Pune',
    phoneNumber: '9876543002',
    experience: '10 Years',
    teamSize: '15',
    firmName: 'Rajesh Builders',
    contractorType: 'General Contractor',
    workCategory: ['General Contracting', 'Renovation'],
    serviceLocation: ['Pune']
  },
  {
    fullName: 'Vikram Singh',
    role: 'Contractor',
    email: 'vikramcontractor@gmail.com',
    password: 'vikram123',
    city: 'Delhi',
    phoneNumber: '9876543003',
    experience: '15 Years',
    teamSize: '25',
    firmName: 'Vikram Infra Projects',
    contractorType: 'Infrastructure',
    workCategory: ['Infrastructure', 'Road Works'],
    serviceLocation: ['Delhi', 'Noida']
  },
  {
    fullName: 'Sanjay Patel',
    role: 'Contractor',
    email: 'sanjaycontractor@gmail.com',
    password: 'sanjay123',
    city: 'Ahmedabad',
    phoneNumber: '9876543004',
    experience: '6 Years',
    teamSize: '8',
    firmName: 'Patel Civil Works',
    contractorType: 'Sub-contractor',
    workCategory: ['Excavation', 'Civil Works'],
    serviceLocation: ['Ahmedabad']
  },
  {
    fullName: 'Anil Gupta',
    role: 'Contractor',
    email: 'anilcontractor@gmail.com',
    password: 'anil123',
    city: 'Bengaluru',
    phoneNumber: '9876543005',
    experience: '12 Years',
    teamSize: '20',
    firmName: 'Gupta Contractors',
    contractorType: 'Residential Contractor',
    workCategory: ['Residential Construction', 'Villa Projects'],
    serviceLocation: ['Bengaluru']
  },

  // Architects (10)
  {
    fullName: 'Rahul Shah',
    role: 'Architect',
    email: 'rahularchitect@gmail.com',
    password: 'rahul123',
    city: 'Mumbai',
    phoneNumber: '9876543006',
    experience: '9 Years',
    firmName: 'Rahul Shah & Associates',
    specialization: ['Residential', 'Modern Luxury'],
    serviceArea: ['Mumbai', 'Thane']
  },
  {
    fullName: 'Neha Gupta',
    role: 'Architect',
    email: 'nehaarchitect@gmail.com',
    password: 'neha123',
    city: 'Delhi',
    phoneNumber: '9876543007',
    experience: '7 Years',
    firmName: 'Neha Gupta Design Studio',
    specialization: ['Interior Architecture', 'Commercial'],
    serviceArea: ['Delhi', 'Noida', 'Gurugram']
  },
  {
    fullName: 'Priya Mishra',
    role: 'Architect',
    email: 'priyaarchitect@gmail.com',
    password: 'priya123',
    city: 'Bengaluru',
    phoneNumber: '9876543008',
    experience: '11 Years',
    firmName: 'Priya Mishra Designs',
    specialization: ['Villa Design', 'Sustainable Architecture'],
    serviceArea: ['Bengaluru']
  },
  {
    fullName: 'Arjun Mehta',
    role: 'Architect',
    email: 'arjunarchitect@gmail.com',
    password: 'arjun123',
    city: 'Pune',
    phoneNumber: '9876543009',
    experience: '8 Years',
    firmName: 'Arjun Mehta Architecture',
    specialization: ['Landscape Architecture', 'Urban Design'],
    serviceArea: ['Pune', 'Mumbai']
  },
  {
    fullName: 'Karan Malhotra',
    role: 'Architect',
    email: 'karanarchitect@gmail.com',
    password: 'karan123',
    city: 'Mumbai',
    phoneNumber: '9876543010',
    experience: '5 Years',
    firmName: 'Karan Malhotra Spaces',
    specialization: ['Commercial Retail', 'Residential Interiors'],
    serviceArea: ['Mumbai']
  },
  {
    fullName: 'Manish Joshi',
    role: 'Architect',
    email: 'manisharchitect@gmail.com',
    password: 'manish123',
    city: 'Ahmedabad',
    phoneNumber: '9876543011',
    experience: '12 Years',
    firmName: 'Joshi & Partners',
    specialization: ['Institutional Design', 'Industrial Architecture'],
    serviceArea: ['Ahmedabad', 'Vadodara']
  },
  {
    fullName: 'Ajay Nair',
    role: 'Architect',
    email: 'ajayarchitect@gmail.com',
    password: 'ajay123',
    city: 'Kochi',
    phoneNumber: '9876543012',
    experience: '6 Years',
    firmName: 'Ajay Nair Architects',
    specialization: ['Traditional Architecture', 'Eco-friendly Design'],
    serviceArea: ['Kochi', 'Trivandrum']
  },
  {
    fullName: 'Kavita Rao',
    role: 'Architect',
    email: 'kavitaarchitect@gmail.com',
    password: 'kavita123',
    city: 'Hyderabad',
    phoneNumber: '9876543013',
    experience: '10 Years',
    firmName: 'Kavita Rao Atelier',
    specialization: ['High-end Residential', 'Hospitality'],
    serviceArea: ['Hyderabad', 'Secunderabad']
  },
  {
    fullName: 'Deepak Gill',
    role: 'Architect',
    email: 'deepakarchitect@gmail.com',
    password: 'deepak123',
    city: 'Chandigarh',
    phoneNumber: '9876543014',
    experience: '8 Years',
    firmName: 'Gill Spaces',
    specialization: ['Modernist Residential', 'Office Spaces'],
    serviceArea: ['Chandigarh', 'Mohali', 'Panchkula']
  },
  {
    fullName: 'Suresh Sen',
    role: 'Architect',
    email: 'suresharchitect@gmail.com',
    password: 'suresh123',
    city: 'Kolkata',
    phoneNumber: '9876543015',
    experience: '14 Years',
    firmName: 'Suresh Sen Designs',
    specialization: ['Heritage Restoration', 'Public Spaces'],
    serviceArea: ['Kolkata']
  },

  // Labours (10)
  {
    fullName: 'Ramesh Chauhan',
    role: 'Labour',
    email: 'rameshlabour@gmail.com',
    password: 'ramesh123',
    city: 'Mumbai',
    phoneNumber: '9876543016',
    experience: '5 Years',
    skillType: 'Mason',
    availability: 'Available'
  },
  {
    fullName: 'Sunil Yadav',
    role: 'Labour',
    email: 'sunillabour@gmail.com',
    password: 'sunil123',
    city: 'Pune',
    phoneNumber: '9876543017',
    experience: '4 Years',
    skillType: 'Painter',
    availability: 'Available'
  },
  {
    fullName: 'Dinesh Kumar',
    role: 'Labour',
    email: 'dineshlabour@gmail.com',
    password: 'dinesh123',
    city: 'Delhi',
    phoneNumber: '9876543018',
    experience: '6 Years',
    skillType: 'Plumber',
    availability: 'Available'
  },
  {
    fullName: 'Manoj Singh',
    role: 'Labour',
    email: 'manojlabour@gmail.com',
    password: 'manoj123',
    city: 'Bengaluru',
    phoneNumber: '9876543019',
    experience: '7 Years',
    skillType: 'Electrician',
    availability: 'Available'
  },
  {
    fullName: 'Santosh Pal',
    role: 'Labour',
    email: 'santoshlabour@gmail.com',
    password: 'santosh123',
    city: 'Ahmedabad',
    phoneNumber: '9876543020',
    experience: '8 Years',
    skillType: 'Bar Bender / Steel Fixer',
    availability: 'Available'
  },
  {
    fullName: 'Raju Prasad',
    role: 'Labour',
    email: 'rajulabour@gmail.com',
    password: 'raju123',
    city: 'Mumbai',
    phoneNumber: '9876543021',
    experience: '3 Years',
    skillType: 'Helper',
    availability: 'Available'
  },
  {
    fullName: 'Pawan Nishad',
    role: 'Labour',
    email: 'pawanlabour@gmail.com',
    password: 'pawan123',
    city: 'Thane',
    phoneNumber: '9876543022',
    experience: '9 Years',
    skillType: 'Carpenter',
    availability: 'Available'
  },
  {
    fullName: 'Vinod Sahni',
    role: 'Labour',
    email: 'vinodlabour@gmail.com',
    password: 'vinod123',
    city: 'Delhi',
    phoneNumber: '9876543023',
    experience: '5 Years',
    skillType: 'Tile & Stone Layer',
    availability: 'Available'
  },
  {
    fullName: 'Bablu Paswan',
    role: 'Labour',
    email: 'bablulabour@gmail.com',
    password: 'bablu123',
    city: 'Pune',
    phoneNumber: '9876543024',
    experience: '6 Years',
    skillType: 'Welder / Fabricator',
    availability: 'Available'
  },
  {
    fullName: 'Vijay Das',
    role: 'Labour',
    email: 'vijaylabour@gmail.com',
    password: 'vijay123',
    city: 'Noida',
    phoneNumber: '9876543025',
    experience: '4 Years',
    skillType: 'Mason / Concrete Worker',
    availability: 'Available'
  }
];

async function runSeeder() {
  console.log('=== CUSTOM USER SEEDER STARTING ===');
  let inserted = 0;
  let skipped = 0;
  for (const u of usersToInsert) {
    try {
      if (u.firmName) {
        u.normalizedFirmName = u.firmName.trim().toLowerCase().replace(/\s+/g, ' ');
      }
      const existing = await User.findOne({ email: u.email });
      if (!existing) {
        const newUser = new User(u);
        await newUser.save();
        console.log(`[SEED] Created user: ${u.fullName} (${u.role})`);
        inserted++;
      } else {
        console.log(`[SEED] User already exists: ${u.fullName} (${u.email})`);
        skipped++;
      }
    } catch (err) {
      console.error(`[SEED] Error inserting user ${u.fullName}:`, err.message);
    }
  }
  console.log(`=== CUSTOM USER SEEDER FINISHED (Created: ${inserted}, Skipped: ${skipped}) ===`);
}

module.exports = runSeeder;
