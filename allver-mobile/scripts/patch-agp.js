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

    // 3. Patch react-native-worklets CMakeLists.txt for NDK C++ STL symbol linking
    if (filePath.endsWith(path.join('react-native-worklets', 'android', 'CMakeLists.txt'))) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('target_link_libraries(worklets log ReactAndroid::jsi fbjni::fbjni)') && !content.includes('c++_shared')) {
          content = content.replace('target_link_libraries(worklets log ReactAndroid::jsi fbjni::fbjni)', 'target_link_libraries(worklets log ReactAndroid::jsi fbjni::fbjni c++_shared)');
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`Patched Worklets CMake: ${path.relative(nodeModulesDir, filePath)} (added c++_shared to target_link_libraries)`);
        }
      } catch (e) {
        console.error(`Error patching Worklets CMake in ${filePath}:`, e);
      }
    }

    // 4. Patch react-native-screens CMakeLists.txt for NDK C++ STL symbol linking
    if (filePath.includes(path.join('react-native-screens', 'android')) && filePath.endsWith('CMakeLists.txt')) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('fbjni::fbjni\n            android\n        )') && !content.includes('c++_shared')) {
          content = content.replace('fbjni::fbjni\n            android\n        )', 'fbjni::fbjni\n            android\n            c++_shared\n        )');
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`Patched Screens CMake: ${path.relative(nodeModulesDir, filePath)}`);
        }
        if (content.includes('fbjni::fbjni\n  )') && !content.includes('c++_shared')) {
          content = content.replace('fbjni::fbjni\n  )', 'fbjni::fbjni\n    c++_shared\n  )');
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`Patched Screens JNI CMake: ${path.relative(nodeModulesDir, filePath)}`);
        }
      } catch (e) {
        console.error(`Error patching Screens CMake in ${filePath}:`, e);
      }
    }

    // 5. Patch expo-modules-core CMakeLists.txt for NDK C++ STL symbol linking
    if (filePath.includes(path.join('expo-modules-core', 'android')) && filePath.endsWith('CMakeLists.txt')) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        if (content.includes('android\n  ${JSEXECUTOR_LIB}') && !content.includes('c++_shared')) {
          content = content.replace('android\n  ${JSEXECUTOR_LIB}', 'android\n  c++_shared\n  ${JSEXECUTOR_LIB}');
          modified = true;
        }
        if (content.includes('ReactAndroid::jsi\n)') && !content.includes('c++_shared')) {
          content = content.replace('ReactAndroid::jsi\n)', 'ReactAndroid::jsi\n  c++_shared\n)');
          modified = true;
        }
        if (content.includes('target_precompile_headers(') && !content.includes('# target_precompile_headers(')) {
          content = content.replace(/target_precompile_headers\(/g, '# target_precompile_headers(');
          modified = true;
        }
        if (modified) {
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`Patched ExpoModulesCore CMake: ${path.relative(nodeModulesDir, filePath)}`);
        }
      } catch (e) {
        console.error(`Error patching ExpoModulesCore CMake in ${filePath}:`, e);
      }
    }
    // 6. Patch react-native-reanimated CMakeLists.txt for NDK C++ STL symbol linking
    if (filePath.endsWith(path.join('react-native-reanimated', 'android', 'CMakeLists.txt'))) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('android\n                      worklets)') && !content.includes('c++_shared')) {
          content = content.replace('android\n                      worklets)', 'android\n                      worklets c++_shared)');
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`Patched Reanimated CMake: ${path.relative(nodeModulesDir, filePath)}`);
        }
      } catch (e) {
        console.error(`Error patching Reanimated CMake in ${filePath}:`, e);
      }
    }

    // 7. Patch react-native-gesture-handler CMakeLists.txt for NDK C++ STL symbol linking
    if (filePath.includes(path.join('react-native-gesture-handler', 'android')) && filePath.endsWith('CMakeLists.txt')) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('fbjni::fbjni\n)') && !content.includes('c++_shared')) {
          content = content.replace('fbjni::fbjni\n)', 'fbjni::fbjni\n  c++_shared\n)');
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`Patched GestureHandler CMake: ${path.relative(nodeModulesDir, filePath)}`);
        }
      } catch (e) {
        console.error(`Error patching GestureHandler CMake in ${filePath}:`, e);
      }
    }

    // 8. Patch react-native-safe-area-context CMakeLists.txt for NDK C++ STL symbol linking
    if (filePath.includes(path.join('react-native-safe-area-context', 'android')) && filePath.endsWith('CMakeLists.txt')) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('reactnative\n  )') && !content.includes('c++_shared')) {
          content = content.replace('reactnative\n  )', 'reactnative\n          c++_shared\n  )');
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`Patched SafeAreaContext CMake: ${path.relative(nodeModulesDir, filePath)}`);
        }
      } catch (e) {
        console.error(`Error patching SafeAreaContext CMake in ${filePath}:`, e);
      }
    }
  });
  console.log('Post-install patching complete.');
} else {
  console.error('node_modules directory not found.');
}
