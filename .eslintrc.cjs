module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/jsx-runtime',
    'plugin:security/recommended-legacy',
    'plugin:sonarjs/recommended-legacy',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react', '@typescript-eslint', 'react-hooks', 'react-refresh', 'security', 'sonarjs'],
  rules: {
    // --- ISO 5055 Maintainability ---
    'complexity': ['error', { max: 15 }],
    'max-depth': ['warn', { max: 4 }],
    'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],

    // --- ISO 5055 Reliability (sonarjs tuning) ---
    // Justified overrides: rules producing false positives in React/TypeScript context.
    'sonarjs/cognitive-complexity': ['error', 15],
    'sonarjs/no-duplicate-string': 'error',
    'sonarjs/pseudo-random': 'error',
    'sonarjs/no-nested-functions': 'error',
    'sonarjs/no-nested-conditional': 'error',
    'sonarjs/slow-regex': 'error',

    // --- ISO 5055 Security (eslint-plugin-security tuning) ---
    'security/detect-object-injection': 'off',  // 56 false positives on typed Record<K,V> bracket access in TS

    // --- Existing rules ---
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    'react/prop-types': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      // Test files: describe blocks are large, fixture strings repeat — disable these rules
      files: ['**/*.test.*', '**/__tests__/**'],
      rules: {
        'max-lines-per-function': 'off',
        'sonarjs/no-duplicate-string': 'off',
      },
    },
  ],
  ignorePatterns: ['dist', 'node_modules', '*.cjs'],
};
