/**
 * Expo config plugin: forces every Gradle subproject to use the same
 * Android Gradle Plugin (AGP) version as the root project.
 *
 * Why this is needed:
 *   React Native 0.81.5 ships a version catalog that pins AGP to 8.11.0,
 *   but community native modules (gesture-handler 2.28.x, reanimated 4.1.x,
 *   screens 4.16.x, safe-area-context 5.6.x, worklets 0.5.x) each carry
 *   their own `buildscript { dependencies { classpath "com.android.tools.build:gradle:X.Y.Z" } }`
 *   with OLDER versions (8.10.1, 8.2.1, 7.3.1).
 *
 *   Under Gradle 8.14+ this AGP-version mismatch prevents the
 *   com.android.library plugin from publishing any consumable variants,
 *   causing the ":app:releaseRuntimeClasspath – No variants exist" error.
 *
 *   The fix below appends a `subprojects` block to the root build.gradle
 *   that forces every subproject's buildscript to resolve the same AGP
 *   artifact version the root project uses.
 */
const { withProjectBuildGradle } = require('@expo/config-plugins');

const GRADLE_SNIPPET = `
// ──────────────────────────────────────────────────────────────
// Force every subproject to resolve the same AGP version that
// the root project uses (from the React Native version catalog).
// This prevents "No variants exist" errors caused by community
// native modules bundling older AGP versions in their own
// buildscript blocks.
// ──────────────────────────────────────────────────────────────
def agpVersionForSubprojects = {
    // Read from React Native's version catalog (the single source of truth)
    def toml = new File(rootDir, '../node_modules/react-native/gradle/libs.versions.toml')
    if (toml.exists()) {
        def m = toml.text =~ /agp\\\\s*=\\\\s*"([^"]+)"/
        if (m.find()) return m.group(1)
    }
    return null
}.call()

if (agpVersionForSubprojects != null) {
    subprojects { sub ->
        sub.buildscript {
            configurations.classpath {
                resolutionStrategy {
                    eachDependency { details ->
                        if (details.requested.group == 'com.android.tools.build'
                                && details.requested.name == 'gradle') {
                            details.useVersion agpVersionForSubprojects
                        }
                    }
                }
            }
        }
    }
}
`;

module.exports = function withUnifiedAgp(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const contents = config.modResults.contents;

      // Guard: don't add twice
      if (!contents.includes('Force every subproject to resolve the same AGP')) {
        config.modResults.contents = contents + GRADLE_SNIPPET;
      }
    }
    return config;
  });
};
