# Pre-push Fix Windows + ESLint 8→9 Upgrade

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the pre-push hook that crashes on Windows (vitest coverage stdout >40k chars kills Git), then upgrade ESLint 8→9 with flat config.

**Architecture:** Pre-push keeps 6 gates but vitest uses `--reporter=dot` and `--coverage.reporter=json` to suppress the table. ESLint migrates from `.eslintrc.cjs` (legacy) to `eslint.config.mjs` (flat config) with all ISO 5055 rules preserved.

**Tech Stack:** ESLint 9.39.3, eslint-plugin-sonarjs 4.0.1, eslint-plugin-security 3.0.1, @typescript-eslint 8.56.1, eslint-plugin-react 7.37.5, eslint-plugin-react-hooks 7.0.1, eslint-plugin-react-refresh 0.4.24

---

## Task 1: Fix pre-push vitest coverage stdout

**Files:**
- Modify: `.husky/pre-push` (line 31-32)

**Step 1: Edit pre-push hook**

Replace line 32:
```bash
npx vitest run --coverage || exit 1
```
With:
```bash
npx vitest run --coverage --reporter=dot --coverage.reporter=json || exit 1
```

This keeps:
- Coverage thresholds enforced (defined in `vitest.config.ts` lines 13-19, exit code 1 if below)
- Coverage data written to `coverage/coverage-final.json` for inspection
- Minimal stdout via `dot` reporter (one char per test, not a full table)

**Step 2: Add coverage output dir to .gitignore**

Check if `coverage/` is already in `.gitignore`. If not, add it.

**Step 3: Test the fix locally**

Run:
```bash
npx vitest run --coverage --reporter=dot --coverage.reporter=json
```
Expected: dots for each test, no giant table, exit code 0, `coverage/coverage-final.json` created.

**Step 4: Commit**

```bash
git add .husky/pre-push
git commit -m "fix(ci): use dot reporter in pre-push to fix Windows stdout overflow"
```

---

## Task 2: Upgrade ESLint 8→9

**Files:**
- Modify: `package.json` (devDependencies)

**Step 1: Update packages**

```bash
npm install --save-dev eslint@^9.39.3 eslint-plugin-sonarjs@^4.0.1 @typescript-eslint/eslint-plugin@^8.56.1 @typescript-eslint/parser@^8.56.1 eslint-plugin-react@^7.37.5 eslint-plugin-react-hooks@^7.0.1 eslint-plugin-react-refresh@^0.4.24 eslint-plugin-security@^3.0.1 @eslint/js@^9.39.3
```

**Step 2: Verify install**

```bash
npm ls eslint eslint-plugin-sonarjs eslint-plugin-security @typescript-eslint/eslint-plugin --depth=0
```
Expected: eslint@9.39.x, sonarjs@4.0.x, security@3.0.x, typescript-eslint@8.56.x

**Step 3: Commit dependency update**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): upgrade eslint 8→9 and align plugin versions"
```

---

## Task 3: Migrate .eslintrc.cjs → eslint.config.mjs

**Files:**
- Create: `eslint.config.mjs`
- Delete: `.eslintrc.cjs`
- Modify: `package.json` (lint script)

**Step 1: Create eslint.config.mjs**

```javascript
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';

export default [
  // Global ignores
  {
    ignores: ['dist/', 'node_modules/', '.next/', 'coverage/'],
  },

  // Base JS recommended
  js.configs.recommended,

  // SonarJS recommended (ISO 5055)
  sonarjs.configs.recommended,

  // Security recommended (OWASP)
  security.configs.recommended,

  // Main config for TS/TSX files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react': react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // --- TypeScript ---
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',

      // --- React ---
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      'react/prop-types': 'off',
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true },
      ],

      // --- ISO 5055 Maintainability ---
      'complexity': ['error', { max: 15 }],
      'max-depth': ['error', { max: 4 }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],

      // --- ISO 5055 Reliability (sonarjs tuning) ---
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-duplicate-string': 'error',
      'sonarjs/pseudo-random': 'error',
      'sonarjs/no-nested-functions': 'error',
      'sonarjs/no-nested-conditional': 'error',
      'sonarjs/slow-regex': 'error',

      // --- ISO 5055 Security (tuning) ---
      'security/detect-object-injection': 'off',

      // --- Console ---
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // Test files overrides
  {
    files: ['**/*.test.*', '**/__tests__/**'],
    rules: {
      'max-lines-per-function': 'off',
      'sonarjs/no-duplicate-string': 'off',
    },
  },
];
```

**Step 2: Update lint script in package.json**

Change:
```json
"lint": "eslint . --ext ts,tsx",
```
To:
```json
"lint": "eslint src app",
```

ESLint 9 flat config uses `files` patterns instead of `--ext`. The script now matches the pre-push command.

**Step 3: Update lint-staged in package.json**

No change needed — `"eslint --max-warnings 0"` works the same way with flat config.

**Step 4: Update pre-push hook**

In `.husky/pre-push`, line 9 already uses `npx eslint src app --max-warnings 0`. No change needed.

**Step 5: Delete .eslintrc.cjs**

```bash
rm .eslintrc.cjs
```

**Step 6: Remove .eslintrc.cjs from eslintrc ignorePatterns**

The old config had `ignorePatterns: ['dist', 'node_modules', '*.cjs']`. The `*.cjs` was there to ignore itself. This is now handled by the `ignores` array in flat config. No CJS files need ignoring since the config is now `.mjs`.

**Step 7: Run ESLint and fix any issues**

```bash
npx eslint src app --max-warnings 0
```
Expected: 0 errors, 0 warnings. If new rules from sonarjs recommended fire, tune them in the config.

**Step 8: Run full quality gates**

```bash
npx tsc --noEmit && npx eslint src app --max-warnings 0 && npm run build && npx vitest run --coverage --reporter=dot --coverage.reporter=json
```
Expected: all pass.

**Step 9: Commit**

```bash
git add eslint.config.mjs package.json
git rm .eslintrc.cjs
git commit -m "refactor(lint): migrate ESLint 8→9 flat config (eslint.config.mjs)"
```

---

## Task 4: Update documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `SUIVI_DEV.md`
- Modify: `README.md`

**Step 1: Update CLAUDE.md**

- ESLint section: reference `eslint.config.mjs` instead of `.eslintrc.cjs`
- Config files table: `.eslintrc.cjs` → `eslint.config.mjs`
- Pre-push section: mention dot reporter

**Step 2: Update SUIVI_DEV.md**

- Mark ESLint v9 upgrade as done in TODO Priority 5
- Mark pre-push Windows fix as done in TODO Priority 5
- Update "Etat du projet" table if needed
- Add new audit session entry

**Step 3: Update README.md**

- Update Stack technique table: ESLint 8 → ESLint 9
- Update Fichiers de configuration table: `.eslintrc.cjs` → `eslint.config.mjs`

**Step 4: Commit**

```bash
git add CLAUDE.md SUIVI_DEV.md README.md
git commit -m "docs: update references for ESLint 9 flat config and pre-push fix"
```

---

## Task 5: Update memory

**Files:**
- Modify: `C:\Users\pierr\.claude\projects\C--Dev-nos-joueurs-en-tournoi\memory\MEMORY.md`
- Modify: `C:\Users\pierr\.claude\projects\C--Dev-nos-joueurs-en-tournoi\memory\quality.md`
- Modify: `C:\Users\pierr\.claude\projects\C--Dev-nos-joueurs-en-tournoi\memory\todos.md`

Update memory files to reflect:
- ESLint 9 flat config (eslint.config.mjs)
- Pre-push fix (dot reporter)
- Updated TODO status
