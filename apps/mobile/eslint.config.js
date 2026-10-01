const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  { ignores: ['dist/**', '.expo/**', 'coverage/**'] },
  expoConfig,
  {
    rules: {
      'import/no-unresolved': 'off',
    },
  },
]);
