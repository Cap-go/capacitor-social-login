const ionic = require('@ionic/eslint-config/recommended');

module.exports = [
  {
    ignores: [
      'build/**',
      'dist/**',
      'example-app/**',
      'docs/**',
      'example-app/android/*',
      'example-app/ios/*',
      'node_modules/**',
      'eslint.config.cjs',
    ],
  },
  ...ionic,
];
