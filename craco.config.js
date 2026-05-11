const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.module.rules.unshift({
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      });
      return webpackConfig;
    },
  },
  jest: {
    configure: (jestConfig) => {
      jestConfig.transformIgnorePatterns = [
        '/node_modules/(?!(react-router|react-router-dom|react-hot-toast)/)',
      ];
      const rrDir = path.dirname(require.resolve('react-router/package.json'));
      const rrdDir = path.dirname(require.resolve('react-router-dom/package.json'));
      jestConfig.moduleNameMapper = {
        ...jestConfig.moduleNameMapper,
        '^react-router-dom$': path.join(rrdDir, 'dist', 'index.js'),
        '^react-router$': path.join(rrDir, 'dist', 'development', 'index.js'),
        '^react-router/dom$': path.join(rrDir, 'dist', 'development', 'dom-export.js'),
      };
      return jestConfig;
    },
  },
};
