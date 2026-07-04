const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure Metro resolves TypeScript file extensions inside node_modules
config.resolver.sourceExts = [...new Set([...config.resolver.sourceExts, 'ts', 'tsx', 'cjs'])];

module.exports = config;
