import mizdra from '@mizdra/eslint-config-mizdra';
import tsdoc from 'eslint-plugin-tsdoc';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ['**/dist'] },
  { plugins: { tsdoc } },
  ...mizdra.baseConfigs,
  ...mizdra.typescriptConfigs,
  ...mizdra.nodeConfigs,
  {
    files: ['**/*.{ts,tsx,cts,mts}', '**/*.{js,jsx,cjs,mjs}'],
    rules: {
      'simple-import-sort/imports': ['error', { groups: [['^\\u0000', '^node:', '^@?\\w', '^', '^\\.']] }],
    },
  },
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    rules: {
      'tsdoc/syntax': 'error',
      // In tsdoc, if you define a method type in a property style, it will not be determined as a method.
      // Therefore, it forces methods to be defined in method shorthand syntax.
      '@typescript-eslint/method-signature-style': ['error', 'method'],
      // In tsdoc, properties of a type defined with `interface` are included in the document,
      // whereas those defined with `type` are omitted from the document.
      // So we force types to be defined with `interface` whenever possible.
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    },
  },
  mizdra.prettierConfig,
];
