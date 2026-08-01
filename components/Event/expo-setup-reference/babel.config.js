// babel.config.js  (reference)
// Your screens import from "@/components/..." and "@/common/...".
// In Expo, the "@/" alias is NOT built in — you must register it here AND in
// tsconfig.json. If you already have babel-plugin-module-resolver configured,
// just make sure the "@" alias points at your source root.
//
// Install once:
//   npm install --save-dev babel-plugin-module-resolver

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            // Adjust the target to wherever your source root actually is.
            // If your code lives in /src, use './src' instead of './'.
            '@': './',
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
        'react-native-reanimated/plugin',
      ],
      // Keep this LAST if you use reanimated:
      // 'react-native-reanimated/plugin',
    ],
  };
};
