const { withSettingsGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to prevent local Gradle build hangs.
 * Disables Foojay Toolchains auto-download and sets JDK path directly in gradle.properties, 
 * and comments out the resolver in settings.gradle.
 */
function withLocalGradle(config) {
  console.log("✅ withLocalGradle plugin is running");

  // 1. Direct file write for root gradle.properties using a dangerous mod
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, 'gradle.properties');
      if (fs.existsSync(file)) {
        let contents = fs.readFileSync(file, 'utf8');

        const setProperty = (key, value) => {
          // Match the property key, regardless of surrounding spaces
          const regex = new RegExp(`^\\s*${key.replace(/\./g, '\\.')}\\s*=.*$`, 'm');
          const newLine = `${key}=${value}`;
          if (regex.test(contents)) {
            contents = contents.replace(regex, newLine);
          } else {
            contents += `\n${newLine}\n`;
          }
        };

        setProperty('org.gradle.java.installations.auto-download', 'false');
        setProperty('org.gradle.java.home', 'C:\\\\Program Files\\\\Android\\\\Android Studio\\\\jbr');

        fs.writeFileSync(file, contents, 'utf8');
        console.log(`[withLocalGradle] Directly updated gradle.properties at: ${file}`);
      }

      // 2. Also write gradle.properties inside the included @react-native/gradle-plugin build directory
      try {
        const gradlePluginDir = path.dirname(require.resolve('@react-native/gradle-plugin/package.json', { paths: [config.modRequest.projectRoot] }));
        const pluginPropertiesFile = path.join(gradlePluginDir, 'gradle.properties');
        const propertiesContent = `org.gradle.java.installations.auto-download=false\norg.gradle.java.home=C:\\\\Program Files\\\\Android\\\\Android Studio\\\\jbr\n`;
        fs.writeFileSync(pluginPropertiesFile, propertiesContent, 'utf8');
        console.log(`[withLocalGradle] Wrote gradle.properties for included build at: ${pluginPropertiesFile}`);
      } catch (err) {
        console.warn(`[withLocalGradle] Could not write gradle.properties for @react-native/gradle-plugin:`, err.message);
      }

      return config;
    }
  ]);

  // 3. Disable Foojay resolver convention plugin in settings.gradle
  config = withSettingsGradle(config, (config) => {
    let content = config.modResults.contents;
    // Comment out the foojay resolver plugin declaration if present
    content = content.replace(
      /id\s*\(?["']org\.gradle\.toolchains\.foojay-resolver-convention["']\)?\s*version\s*["'][^"']+["']/,
      '// Disabled Foojay resolver to prevent local build hangs'
    );
    config.modResults.contents = content;
    return config;
  });

  return config;
}

module.exports = withLocalGradle;
