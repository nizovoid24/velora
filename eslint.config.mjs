import js from '@eslint/js';

export default [
  { ignores: ['assets/**', 'evidence/**', 'tests/**', 'scripts/**'] },
  js.configs.recommended,
  { files: ['app.js'], languageOptions: { ecmaVersion: 'latest', sourceType: 'script', globals: { document: 'readonly' } } },
];
