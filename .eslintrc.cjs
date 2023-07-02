'use strict';

/** @type {import('eslint').Linter.BaseConfig} */
module.exports = {
  root: true,
  extends: ['@mizdra/mizdra', '@mizdra/mizdra/+node', '@mizdra/mizdra/+prettier'],
  parserOptions: {
    ecmaVersion: 2022,
  },
  env: {
    es2022: true,
    node: true,
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.cts', '*.mts'],
      extends: ['@mizdra/mizdra/+typescript', '@mizdra/mizdra/+prettier'],
      plugins: ['eslint-plugin-tsdoc'],
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
  ],
};
