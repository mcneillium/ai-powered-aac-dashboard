// craco.config.js
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // disable ESM "fullySpecified" requirement on .mjs/.js
      webpackConfig.module.rules.unshift({
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      });
      return webpackConfig;
    },
  },
  jest: {
    configure: (jestConfig) => {
      // Transform ESM modules that Jest can't handle natively
      jestConfig.transformIgnorePatterns = [
        '/node_modules/(?!(react-router|react-router-dom|@firebase|firebase)/)',
      ];
      // Map ESM-only packages to their CJS entry points for Jest
      jestConfig.moduleNameMapper = {
        ...jestConfig.moduleNameMapper,
        '^react-router-dom$': '<rootDir>/node_modules/react-router-dom/dist/index.js',
        '^react-router$': '<rootDir>/node_modules/react-router/dist/development/index.js',
        '^react-router/dom$': '<rootDir>/node_modules/react-router/dist/development/dom-export.js',
      };
      // Include __tests__ directory
      jestConfig.roots = ['<rootDir>/src', '<rootDir>/__tests__'];
      jestConfig.testMatch = [
        ...jestConfig.testMatch,
        '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}',
      ];
      return jestConfig;
    },
  },
};
