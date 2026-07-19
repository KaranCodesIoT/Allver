const fs = require('fs');
const path = require('path');

const targetAgpVersion = '8.11.0';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      // Skip some directories to optimize search
      if (f !== '.bin' && f !== '.cache') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

const nodeModulesDir = path.join(__dirname, '../node_modules');

if (fs.existsSync(nodeModulesDir)) {
  console.log('Patching AGP version to ' + targetAgpVersion + ' in node_modules...');
  walkDir(nodeModulesDir, (filePath) => {
    if (filePath.endsWith('build.gradle')) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let regex = /com\.android\.tools\.build:gradle:([0-9.]+)/g;
        if (regex.test(content)) {
          let updatedContent = content.replace(regex, `com.android.tools.build:gradle:${targetAgpVersion}`);
          fs.writeFileSync(filePath, updatedContent, 'utf8');
          console.log(`Patched: ${path.relative(nodeModulesDir, filePath)}`);
        }
      } catch (e) {
        console.error(`Error patching ${filePath}:`, e);
      }
    }
  });
  console.log('AGP patching complete.');
} else {
  console.error('node_modules directory not found.');
}
