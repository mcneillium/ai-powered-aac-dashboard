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
  jest: {
    configure: (jestConfig) => {
      jestConfig.roots = ['<rootDir>/src', '<rootDir>/__tests__'];
      jestConfig.testMatch = [
        '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
        '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
        '<rootDir>/__tests__/**/*.{spec,test}.{js,jsx,ts,tsx}',
      ];
      jestConfig.moduleDirectories = ['node_modules', 'src'];
      jestConfig.moduleNameMapper = {
        ...jestConfig.moduleNameMapper,
        '^react-router-dom$': '<rootDir>/node_modules/react-router-dom/dist/index.js',
        '^react-router$': '<rootDir>/node_modules/react-router/dist/development/index.js',
        '^react-router/dom$': '<rootDir>/node_modules/react-router/dist/production/dom-export.js',
      };
      return jestConfig;
    },
  },
};
