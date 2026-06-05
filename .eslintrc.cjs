module.exports = {
  root: true,
  env: { browser: true, node: true, es2022: true },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'eqeqeq': ['error', 'always'],
    'no-shadow': 'error',
  },
  overrides: [
    {
      files: ['frontend/**/*.{js,jsx}'],
      env: { browser: true, node: false },
      globals: { JSX: 'readonly' },
    },
    {
      files: ['backend/**/*.js'],
      env: { node: true, browser: false },
    },
    {
      files: ['**/*.test.js'],
      globals: { describe: 'readonly', it: 'readonly', expect: 'readonly', beforeEach: 'readonly', afterEach: 'readonly' },
    },
  ],
};
