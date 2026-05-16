const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
const withWind = withNativeWind(config, { input: './global.css' });

// jspdf "main" is jspdf.node.min.js (dynamic require(["html2canvas"], …)); Metro cannot bundle that.
// Use the ESM build (same as package "browser" / "module").
const jspdfEs = path.resolve(__dirname, 'node_modules/jspdf/dist/jspdf.es.js');
const previousResolveRequest = withWind.resolver.resolveRequest;
withWind.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'jspdf') {
    return { type: 'sourceFile', filePath: jspdfEs };
  }
  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withWind;
