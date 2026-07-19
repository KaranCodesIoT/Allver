const { withProjectBuildGradle } = require('@expo/config-plugins');

const GRADLE_SNIPPET = `
// ──────────────────────────────────────────────────────────────
// Expo SDK 54 Gradle & AGP Compatibility Fixes
// ──────────────────────────────────────────────────────────────
ext {
    buildToolsVersion = "36.0.0"
    minSdkVersion = 24
    compileSdkVersion = 36
    targetSdkVersion = 36
    ndkVersion = "27.1.12297006"
    kotlinVersion = "2.1.20"
}

allprojects {
    buildscript {
        repositories {
            google()
            mavenCentral()
        }
        configurations.all {
            resolutionStrategy {
                force 'com.android.tools.build:gradle:8.11.0'
            }
        }
    }
}
`;

module.exports = function withGradleFixes(config) {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    
    // 1. Force the root classpath AGP version to 8.11.0
    if (contents.includes("classpath('com.android.tools.build:gradle')")) {
      contents = contents.replace(
        "classpath('com.android.tools.build:gradle')",
        "classpath('com.android.tools.build:gradle:8.11.0')"
      );
    } else if (contents.includes("classpath 'com.android.tools.build:gradle'")) {
      contents = contents.replace(
        "classpath 'com.android.tools.build:gradle'",
        "classpath 'com.android.tools.build:gradle:8.11.0'"
      );
    }
    
    // 2. Append the ext parameters and subproject buildscript force rules
    if (!contents.includes('Expo SDK 54 Gradle & AGP Compatibility Fixes')) {
      contents = contents + '\n' + GRADLE_SNIPPET;
    }
    
    config.modResults.contents = contents;
    return config;
  });
};
