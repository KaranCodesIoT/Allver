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
  console.log('Running post-install patches in node_modules...');
  walkDir(nodeModulesDir, (filePath) => {
    // 1. Patch AGP versions in build.gradle files
    if (filePath.endsWith('build.gradle')) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let regex = /com\.android\.tools\.build:gradle:([0-9.]+)/g;
        if (regex.test(content)) {
          let updatedContent = content.replace(regex, `com.android.tools.build:gradle:${targetAgpVersion}`);
          fs.writeFileSync(filePath, updatedContent, 'utf8');
          console.log(`Patched AGP: ${path.relative(nodeModulesDir, filePath)}`);
        }
      } catch (e) {
        console.error(`Error patching AGP in ${filePath}:`, e);
      }
    }

    // 2. Patch react-native-callkeep for New Architecture & custom Android ROM compatibility
    if (filePath.endsWith('RNCallKeepModule.java')) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // A. Remove duplicate @ReactMethod overloads for TurboModules compatibility
        if (content.includes('public void displayIncomingCall(String uuid, String number, String callerName)') && 
            !content.includes('// @ReactMethod\n    public void displayIncomingCall') &&
            !content.includes('// @ReactMethod\r\n    public void displayIncomingCall')) {
          content = content.replace(/@ReactMethod(\s+)public void displayIncomingCall\(String uuid, String number, String callerName\)/g, '// @ReactMethod$1public void displayIncomingCall(String uuid, String number, String callerName)');
          modified = true;
        }

        if (content.includes('public void startCall(String uuid, String number, String callerName)') && 
            !content.includes('// @ReactMethod\n    public void startCall') &&
            !content.includes('// @ReactMethod\r\n    public void startCall')) {
          content = content.replace(/@ReactMethod(\s+)public void startCall\(String uuid, String number, String callerName\)/g, '// @ReactMethod$1public void startCall(String uuid, String number, String callerName)');
          modified = true;
        }

        // B. Wrap native startActivity intents in try-catch to prevent crashes on custom Android ROMs (Redmi/Xiaomi/etc.)
        if (content.includes('public void openPhoneAccountSettings()') && 
            !content.includes('try { // patched')) {
          
          // Replace Samsung/OnePlus startActivity in openPhoneAccounts()
          content = content.replace(
            /Context context = this.getAppContext\(\);\s+if \(context == null\) \{\s+Log.w\(TAG, "\[RNCallKeepModule\]\[openPhoneAccounts\] no react context found."\);\s+return;\s+\}\s+context.startActivity\(intent\);/g,
            'Context context = this.getAppContext();\n            if (context == null) {\n                Log.w(TAG, "[RNCallKeepModule][openPhoneAccounts] no react context found.");\n                return;\n            }\n            try { // patched\n                context.startActivity(intent);\n            } catch (Exception e) {\n                Log.e(TAG, "Failed to start EnableAccountPreferenceActivity: " + e.getMessage());\n            }'
          );

          // Replace default startActivity in openPhoneAccountSettings()
          content = content.replace(
            /if \(context == null\) \{\s+Log.w\(TAG, "\[RNCallKeepModule\]\[openPhoneAccountSettings\] no react context found."\);\s+return;\s+\}\s+context.startActivity\(intent\);/g,
            'if (context == null) {\n            Log.w(TAG, "[RNCallKeepModule][openPhoneAccountSettings] no react context found.");\n            return;\n        }\n        try { // patched\n            context.startActivity(intent);\n        } catch (Exception e) {\n            Log.e(TAG, "Failed to start ACTION_CHANGE_PHONE_ACCOUNTS: " + e.getMessage());\n        }'
          );
          modified = true;
        }

        if (modified) {
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`Patched CallKeep: ${path.relative(nodeModulesDir, filePath)} (removed duplicate @ReactMethod overloads & added try-catch to startActivity)`);
        }
      } catch (e) {
        console.error(`Error patching CallKeep in ${filePath}:`, e);
      }
    }
  });
  console.log('Post-install patching complete.');
} else {
  console.error('node_modules directory not found.');
}
