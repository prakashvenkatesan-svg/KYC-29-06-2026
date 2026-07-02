module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve = webpackConfig.resolve || {};
      webpackConfig.resolve.fallback = {
        ...(webpackConfig.resolve.fallback || {}),
        fs: false,
      };

      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        (warning) =>
          String(warning?.message || "").includes(
            "Failed to parse source map",
          ) &&
          String(warning?.module?.resource || "").includes(
            `${require("path").sep}face-api.js${require("path").sep}`,
          ),
        (warning) =>
          String(warning?.message || "").includes("Can't resolve 'fs'") &&
          String(warning?.module?.resource || "").includes(
            `${require("path").sep}face-api.js${require("path").sep}`,
          ),
      ];

      return webpackConfig;
    },
  },
};
