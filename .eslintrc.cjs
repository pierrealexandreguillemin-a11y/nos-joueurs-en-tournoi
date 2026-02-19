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
    'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],

    // --- ISO 5055 Reliability (sonarjs overrides) ---
    'sonarjs/cognitive-complexity': ['warn', 15],
    'sonarjs/no-duplicate-string': 'off',
    'sonarjs/pseudo-random': 'off',             // Math.random() for UI animations is safe
    'sonarjs/no-nested-functions': 'off',       // standard React pattern (handlers in components)
    'sonarjs/no-nested-conditional': 'warn',    // warn only, common in JSX
    'sonarjs/slow-regex': 'warn',               // patterns in codebase are safe (short inputs)

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
  ignorePatterns: ['dist', 'node_modules', '*.cjs'],
};
