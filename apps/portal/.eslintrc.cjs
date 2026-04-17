const base = require('../../packages/config/eslint.base.cjs');

module.exports = {
  ...base,
  root: true,
  plugins: [...(base.plugins ?? []), 'react-hooks'],
  extends: [...(base.extends ?? []), 'plugin:react-hooks/recommended'],
  settings: {
    react: { version: 'detect' },
  },
};
