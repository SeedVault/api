module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
    jest: true
  },
  extends: [
    'plugin:jest/recommended',
    'eslint:recommended'
  ],
  globals: {
    'Atomics': 'readonly',
    'SharedArrayBuffer': 'readonly'
  },
  rules: {
    'no-console': 'off',
    'no-debugger': 'off',
    'no-underscore-dangle': 'off',
  },
  plugins: [
    'jest'
  ],
  parserOptions: {
    ecmaVersion: 9,
    parser: 'babel-eslint',
    sourceType: 'module'
  }
};
