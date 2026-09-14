const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const updated = await User.findOneAndUpdate(
    { fullName: /akash chauhan/i },
    { 
      $set: { 
        skillType: 'Painter',
        specialization: ['Painter', 'Painting'],
        workCategory: ['Painting'],
        isAvailableForBooking: true,
        availability: 'Available',
        workArea: 'Kalwa East',
        serviceRadiusKm: 10,
        workAreaRadius: 10,
        latitude: 19.2069208,
        longitude: 72.9968026,
        lastLocationUpdate: new Date()
      } 
    },
    { new: true }
  ).lean();

  console.log('AKASH UPDATED IN DB:', {
    id: updated._id,
    fullName: updated.fullName,
    skillType: updated.skillType,
    specialization: updated.specialization,
    workArea: updated.workArea,
    serviceRadiusKm: updated.serviceRadiusKm,
    latitude: updated.latitude,
    longitude: updated.longitude,
    availability: updated.availability,
    isAvailableForBooking: updated.isAvailableForBooking
  });
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
