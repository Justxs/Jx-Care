const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { withStorybook } = require('@storybook/react-native/metro/withStorybook');

const config = getDefaultConfig(__dirname);

// Drizzle migrations are .sql files bundled into the app.
config.resolver.sourceExts.push('sql');

// On-device Storybook (docs/storybook.md): only with EXPO_PUBLIC_STORYBOOK_ENABLED=true
// (`npm run storybook`). Otherwise every Storybook module resolves to an empty one.
const storybookEnabled = process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true';

if (storybookEnabled) {
  // Screens under src/ get an expo-router whose router, params, navigation and Redirect stand in
  // for the real ones while a story is on screen. The shim itself imports the real module.
  const srcDir = path.resolve(__dirname, 'src') + path.sep;
  const shim = path.resolve(__dirname, 'src/storybook/expoRouterShim.tsx');
  const upstream = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const origin = context.originModulePath;
    if (moduleName === 'expo-router' && origin.startsWith(srcDir) && origin !== shim) {
      return { type: 'sourceFile', filePath: shim };
    }
    return (upstream ?? context.resolveRequest)(context, moduleName, platform);
  };
}

module.exports = withNativeWind(
  withStorybook(config, {
    enabled: storybookEnabled,
    configPath: path.resolve(__dirname, '.rnstorybook'),
  }),
  { input: './global.css' },
);
