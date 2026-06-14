const fs = require('fs');
const src = 'C:/Users/karan chaubey/.gemini/antigravity-ide/brain/f861ada4-3948-4409-b580-19d18b1e0b2b/media__1781409373415.png';
const dest = 'c:/Users/karan chaubey/OneDrive/Desktop/Allver/allver-mobile/assets/images/bg-welcome.png';

try {
  fs.copyFileSync(src, dest);
  console.log('Copy successful!');
} catch (err) {
  console.error('Copy failed:', err);
}
