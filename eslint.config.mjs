import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/build/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    plugins: { react: reactPlugin },
    settings: { react: { version: 'detect' } },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'react/jsx-uses-vars': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-shadow': 'error',
    },
  },
  {
    files: ['frontend/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, JSX: 'readonly' },
    },
  },
  {
    files: ['backend/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },
];
