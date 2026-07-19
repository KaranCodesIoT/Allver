const { withSettingsGradle } = require('@expo/config-plugins');

const SETTINGS_SNIPPET = `
// ──────────────────────────────────────────────────────────────
// Force every subproject buildscript to resolve AGP 8.11.0.
// Fixes "No matching variant / No variants exist" in AGP 8.11.0
// where AGP requires matching AgpVersionAttr across all projects.
// ──────────────────────────────────────────────────────────────
gradle.beforeProject { project ->
    project.buildscript.configurations.all {
        resolutionStrategy {
            eachDependency { details ->
                if (details.requested.group == 'com.android.tools.build' && details.requested.name == 'gradle') {
                    details.useVersion '8.11.0'
                }
            }
        }
    }
}
`;

module.exports = function withUnifiedAgp(config) {
  return withSettingsGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (!contents.includes('Force every subproject buildscript to resolve AGP 8.11.0')) {
      config.modResults.contents = contents + '\n' + SETTINGS_SNIPPET;
    }
    return config;
  });
};
