// NativeWind v4 compiles `className` to React Native styles at build time, which is
// why it needs both the Expo preset (with its JSX import source) and its own preset.
// See CONTRIBUTING.md § Styling.
module.exports = function (api) {
  api.cache(true);

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
