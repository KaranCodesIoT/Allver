const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidManifestFixes(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    
    // 1. Ensure tools namespace is added to root manifest tag
    if (androidManifest.manifest) {
      if (!androidManifest.manifest.$) {
        androidManifest.manifest.$ = {};
      }
      androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
      console.log('[withAndroidManifestFixes] Ensured xmlns:tools="http://schemas.android.com/tools" in manifest root.');
    }

    // 2. Ensure application element is present and apply tools:replace to duplicates
    if (androidManifest.manifest && androidManifest.manifest.application && androidManifest.manifest.application[0]) {
      const mainApplication = androidManifest.manifest.application[0];
      
      if (mainApplication['meta-data']) {
        mainApplication['meta-data'].forEach((metaItem) => {
          const name = metaItem.$['android:name'];
          if (
            name === 'com.google.firebase.messaging.default_notification_color' ||
            name === 'com.google.firebase.messaging.default_notification_icon'
          ) {
            metaItem.$['tools:replace'] = 'android:resource';
            console.log(`[withAndroidManifestFixes] Added tools:replace="android:resource" to ${name}`);
          }
        });
      }
    }
    
    return config;
  });
};
