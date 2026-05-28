// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: ['lt', 'app'],
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: ['lt', 'app'],
          style: 'kebab-case',
        },
      ],
      // Allow output named 'close' - it is not a standard DOM event on custom elements
      '@angular-eslint/no-output-native': 'off',
      // Allow empty arrow functions in catch clauses for fire-and-forget patterns
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // Relax label association check – our modal inputs are associated via id/for
      '@angular-eslint/template/label-has-associated-control': 'warn',
    },
  },
  {
    // Vitest test files – relax unused-vars for test utilities
    files: ['**/*.vitest.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
]);
