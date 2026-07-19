const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/karan chaubey/OneDrive/Desktop/Allver/backend/index.js';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Searching for push-token and fcm-token routes in backend/index.js:');
lines.forEach((line, idx) => {
  if (line.includes('push-token') || line.includes('fcm-token') || line.includes('pushToken') || line.includes('fcmToken')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
