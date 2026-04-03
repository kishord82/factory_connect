module.exports = {
  ...require('../../packages/config/eslint.base.cjs'),
  root: true,
  plugins: ['react-hooks'],
  extends: ['plugin:react-hooks/recommended'],
  settings: {
    react: { version: 'detect' },
  },
};
