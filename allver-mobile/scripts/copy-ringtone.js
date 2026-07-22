const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const sourceFile = path.join(projectRoot, 'assets', 'sounds', 'ringtone.mp3');
const targetDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'raw');
const targetFile = path.join(targetDir, 'ringtone.mp3');

try {
  if (fs.existsSync(sourceFile)) {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(sourceFile, targetFile);
    console.log('[Copy Ringtones] Successfully copied ringtone.mp3 to android/app/src/main/res/raw/ringtone.mp3');
  } else {
    console.warn('[Copy Ringtones] Source file assets/sounds/ringtone.mp3 does not exist.');
  }
} catch (err) {
  console.error('[Copy Ringtones] Error copying ringtone.mp3:', err);
}
