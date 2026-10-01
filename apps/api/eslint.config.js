const { defineConfig } = require('eslint/config');
const tsParser = require('@typescript-eslint/parser');

module.exports = defineConfig([
  { ignores: ['dist/**', 'coverage/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser },
  },
]);
