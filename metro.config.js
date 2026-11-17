// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ANDROID EDGE-TO-EDGE FIX FOR EVERY MODAL: react-native's own `Modal` (what
// `import { Modal } from 'react-native'` gives) is sent to src/core/ui/SafeModal.tsx, which keeps
// modal content out from under the status / navigation bar (see that file). Only the import made
// by react-native's index.js is redirected, so SafeModal itself still gets the real Modal.
const SAFE_MODAL = require.resolve('./src/core/ui/SafeModal.tsx');
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === './Libraries/Modal/Modal' &&
    /[\\/]node_modules[\\/]react-native[\\/]index\.js$/.test(context.originModulePath || '')
  ) {
    return { type: 'sourceFile', filePath: SAFE_MODAL };
  }
  return upstream ? upstream(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
