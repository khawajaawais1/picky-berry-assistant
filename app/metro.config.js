// NativeWind v4 wraps Metro so the Tailwind pass runs alongside the Expo pipeline.
// `input` is the CSS entry that carries the directives; the app imports the same file
// once, from the root layout.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
