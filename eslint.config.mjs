import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';

export default [
  // ── Global ignores ────────────────────────────────────────────────────
  {
    ignores: ['dist/', 'node_modules/', '.next/', 'coverage/', '*.cjs'],
  },

  // ── Base: ESLint recommended ──────────────────────────────────────────
  js.configs.recommended,

  // ── SonarJS recommended (ISO 5055 Reliability) ────────────────────────
  sonarjs.configs.recommended,

  // ── Security recommended (OWASP) ──────────────────────────────────────
  security.configs.recommended,

  // ── TypeScript: flat/recommended (parser + plugin + rules) ────────────
  ...tsPlugin.configs['flat/recommended'],

  // ── React: flat configs ───────────────────────────────────────────────
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],

  // ── React Hooks ───────────────────────────────────────────────────────
  reactHooks.configs.flat.recommended,

  // ── React Refresh ─────────────────────────────────────────────────────
  reactRefresh.configs.recommended,

  // ── Main config for TS/TSX files ──────────────────────────────────────
  {
    files: ['**/*.{ts,tsx}'],
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // --- TypeScript tuning ---
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',

      // --- React tuning ---
      'react/prop-types': 'off',
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true },
      ],

      // --- ISO 5055 Maintainability ---
      'complexity': ['error', { max: 15 }],
      'max-depth': ['error', { max: 4 }],
      'max-lines-per-function': [
        'error',
        { max: 80, skipBlankLines: true, skipComments: true },
      ],

      // --- ISO 5055 Reliability (sonarjs tuning) ---
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-duplicate-string': 'error',
      'sonarjs/pseudo-random': 'error',
      'sonarjs/no-nested-functions': 'error',
      'sonarjs/no-nested-conditional': 'error',
      'sonarjs/slow-regex': 'error',

      // --- ISO 5055 Security (tuning) ---
      'security/detect-object-injection': 'off', // false positives on typed Record<K,V> bracket access in TS

      // --- Console ---
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // ── Test files overrides ──────────────────────────────────────────────
  {
    files: ['**/*.test.*', '**/__tests__/**', '**/*.e2e.*'],
    rules: {
      'max-lines-per-function': 'off',
      'sonarjs/no-duplicate-string': 'off',
    },
  },
];
