// craco.config.js
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // disable ESM “fullySpecified” requirement on .mjs/.js
      webpackConfig.module.rules.unshift({
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      });
      return webpackConfig;
    },
  },
};
