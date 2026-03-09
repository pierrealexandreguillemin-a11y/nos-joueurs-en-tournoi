# CLAUDE.md — Conventions pour Claude Code

Ce fichier documente les conventions, patterns et decisions architecturales du projet.
Il sert de reference pour Claude Code et tout contributeur.

## Commandes essentielles

```bash
npm run dev             # Dev server (Turbopack)
npm test                # Vitest watch
npx vitest run          # Tests single run (CI)
npm run build           # Build production
npm run lint            # ESLint
npm run typecheck       # tsc --noEmit
npm run duplication     # jscpd seuil 5%
npm run analyze         # Bundle analyzer
```

## Principes

### DRY (Don't Repeat Yourself)

- `SLUG_REGEX` : defini dans `src/lib/validation.ts`, reutilise dans `schemas.ts`
- Redis : `src/lib/kv.ts` centralise l'acces, `proxy.ts` reutilise les memes env vars
- Storage : `storage.ts` re-exporte `storage-core.ts` + `storage-share.ts`
- Types : `src/types/index.ts` est la source unique des interfaces

### KISS (Keep It Simple, Stupid)

- Pas de `useCallback` premature : `React.memo` seul suffit sur PlayerTable
- Pas de Playwright E2E : `browserslist` + Puppeteer/Chromium suffisent
- Pas de feature flags : modifier le code directement
- Pas de fallback complet pour `crypto.subtle` : juste un guard + warning

### Leverage existing code

- Reutiliser les schemas Zod de `schemas.ts` (pas re-valider manuellement)
- Reutiliser `createClubStorage(slug)` pour tout acces localStorage
- Reutiliser `getClientIP()` dans `proxy.ts` (pas dupliquer l'extraction IP)

## Convention de fichiers

### Structure

```
src/lib/foo.ts          # Module
src/lib/foo.test.ts     # Tests (co-localises)
app/api/x/route.ts      # API route
app/api/x/__tests__/    # Tests API routes
```

### Nommage

- **Composants** : PascalCase (`PlayerTable.tsx`)
- **Modules** : camelCase (`calculations.ts`)
- **Types** : PascalCase dans `src/types/index.ts`
- **Tests** : `describe('nom du module')` > `it('description en phrase')`

## TypeScript

- **Strict mode** active (`tsconfig.json`)
- **No `any`** : `@typescript-eslint/no-explicit-any: error`
- **No unused vars** : pattern `_` autorise (`argsIgnorePattern: '^_'`)
- **Alias** : `@/` pointe vers `./src/`
- **Target** : ES2020, module ESNext, resolution bundler

## ESLint

Config dans `eslint.config.mjs` (flat config ESLint 9). Regles ISO 5055 :

| Regle | Valeur | Norme |
|-------|--------|-------|
| `complexity` | max 15 | ISO 5055 Maintainability |
| `max-depth` | max 4 | ISO 5055 Maintainability |
| `max-lines-per-function` | max 80 | ISO 5055 Maintainability |
| `sonarjs/cognitive-complexity` | max 15 | ISO 5055 Reliability |
| `sonarjs/no-duplicate-string` | error | ISO 5055 Maintainability |
| `no-console` | warn/error only | ISO 5055 Reliability |

**Overrides tests** : `max-lines-per-function` et `no-duplicate-string` desactives dans `*.test.*`, `__tests__/**`, `*.e2e.*`.

## Tests

### Framework

- Vitest 4 + jsdom + Testing Library
- Setup : `vitest.setup.ts` (localStorage polyfill, jest-dom matchers)
- Config : `vitest.config.ts` (alias `@/`, coverage v8)
- E2E : `vitest.config.e2e.ts` (Puppeteer, 30s timeout, 120s hook timeout)

### E2E (e2e/)

- **Framework** : Vitest + Puppeteer (pas Playwright)
- **Config** : `vitest.config.e2e.ts`, run via `npx vitest run --config vitest.config.e2e.ts`
- **Target** : deployed app (`E2E_BASE_URL` ou `https://nos-joueurs-en-tournoi.vercel.app`)
- **Helpers** : `e2e/helpers.ts` (`launchBrowser`, `freshVisit`, `typeInto`, `waitForText`)
- **Mock FFE** : `refresh-results.e2e.ts` utilise `page.setRequestInterception(true)` pour mocker `/api/scrape`
- **Lighthouse** : `lighthouse.e2e.ts` utilise `chrome-launcher` + `lighthouse` (seuils : perf 40, a11y 80, bp 80, seo 85)
- **Accessibilite** : `accessibility.e2e.ts` utilise `@axe-core/puppeteer` (WCAG 2.1 AA)
- **Toasts Sonner** : `innerText` ne capture pas les toasts Sonner (position fixed) ; utiliser `[data-sonner-toast]` selector ou `textContent`

### Conventions

- **Co-localisation** : le test est a cote du fichier teste
- **Pas de snapshots** : assertions explicites uniquement
- **Mocks** : `vi.mock()` pour dependances externes (fetch, Redis, etc.)
- **Timers** : `vi.useFakeTimers()` + `vi.setSystemTime()` (jamais `advanceTimersByTime` negatif)
- **DOM** : Testing Library (`render`, `screen`, `userEvent`)
- **IP en tests** : utiliser `10.0.0.x` avec `eslint-disable sonarjs/no-hardcoded-ip`
- **Async** : `await import()` pour les modules qui lisent `process.env` au top-level

### Pattern test API route

```typescript
// Mocker les dependances avant l'import
vi.mock('@upstash/redis', () => ({ Redis: MockRedis }));
process.env.KV_REST_API_URL = 'https://fake.upstash.io';

// Import dynamique apres setup env
const { handler } = await import('./route');
```

## Commits

### Convention

Commits conventionnels (commitlint) :

```
feat(scope): description     # Nouvelle fonctionnalite
fix(scope): description      # Correction bug
perf(scope): description     # Optimisation performance
docs(scope): description     # Documentation
refactor(scope): description # Refactoring sans changement fonctionnel
chore(scope): description    # Maintenance (deps, config)
test(scope): description     # Ajout/modification tests
```

### Scopes frequents

`security`, `perf`, `bundle`, `render`, `compat`, `storage`, `sync`, `parser`

### Pre-commit hook

`lint-staged` : ESLint 0 warnings sur les fichiers modifies (`.ts`, `.tsx`).

### Pre-push hook (6 quality gates)

1. `tsc --noEmit` (TypeScript)
2. `eslint src app --max-warnings 0`
3. `next build` (production)
4. `jscpd --threshold 5` (duplication)
5. `npm audit` (0 critical)
6. `vitest run --reporter=dot --coverage --coverage.reporter=json` (534+ tests, dot reporter pour eviter stdout overflow Windows)

**Tout push qui echoue un gate est bloque.**

## Securite

### Headers (`vercel.json`)

- CSP : `default-src 'self'`, `frame-ancestors 'none'`, connect-src whitelist
- HSTS : `max-age=63072000; includeSubDomains; preload`
- CORS : origin unique `https://nos-joueurs-en-tournoi.vercel.app` sur `/api/*`
- X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy

### HMAC (`src/lib/hmac.ts`)

- Token format : `hex64:timestamp`
- Anti-replay : fenetre 5 min (`TOKEN_MAX_AGE_MS`)
- Clock skew : tolerance 10s (`CLOCK_SKEW_MS`)
- `NEXT_PUBLIC_SYNC_SECRET` : expose dans le bundle client par design (defense-in-depth, pas auth forte)
- Guard `crypto.subtle` : verifie `importKey` + `sign` avant utilisation

### Rate limiting (`proxy.ts`)

- Upstash Redis sliding window
- `/api/scrape` : 30 req/60s
- `/api/events/*` : 10 req/60s
- Fail-open : si Redis indisponible, laisse passer (try/catch)
- IP : `x-forwarded-for` > `x-real-ip` > `'unknown'`

### Validation API (`src/lib/schemas.ts`)

- Zod schemas strictes (pas de `.passthrough()`)
- Body size limit 1 MB sur sync route
- SSRF prevention sur scrape route (whitelist hostname)

## Architecture cles

### Namespace par club

Toutes les donnees sont isolees par slug de club :

```
localStorage key: "nos-joueurs:{clubSlug}:events"
Redis key:        "nos-joueurs:{clubSlug}:events"
```

`createClubStorage(slug)` retourne un objet avec toutes les operations CRUD scopees.

### Sync strategy

- **Push** : `syncToUpstash(clubSlug)` envoie le localStorage vers Redis
- **Pull** : `fetchFromUpstash(clubSlug)` recupere et merge
- **Merge** : union des events par ID, version locale prioritaire si conflit

### Lazy loading

Composants charges a la demande (click-triggered) :

```typescript
const EventForm = NextDynamic(() => import('@/components/EventForm'), { ssr: false });
const DuplicateEventDialog = NextDynamic(() => import('@/components/DuplicateEventDialog'), { ssr: false });
const ShareEventModal = dynamic(() => import('@/components/ShareEventModal'), { ssr: false });
```

Les composants de fond (HalftoneWaves, BackgroundPaths, FloatingParticles) sont aussi lazy-loaded.

### React.memo

`PlayerTable.tsx` : les 4 sub-components (`PlayerRow`, `RoundCell`, `ColumnHeadersRow`, `ClubTotalsRow`) sont wrappees avec `React.memo`.

**Important** : `PlayerRow` recoit `playerValidation: Record<number, boolean>` (slice par joueur), pas l'objet `validationState` complet, pour que memo soit effectif.

## Theme system

### Architecture OKLCH

- Deux themes : `miami` (cyberpunk) et `neutral` (liquid glass)
- Deux modes : `light` et `dark` via `data-theme` + `data-mode` sur `<html>`
- Couleurs : decomposition L/C/H (theme → C+H, mode → L)
- Exception : neutral dark/light overrides directs (pas de L/C/H)

### Neutral theme

- **Background** : gris achromatic (C=0), L=0.27 dark / L=0.975 light
- **Glass tint** : bleu froid subtil (C=0.015 H=250) pour elegance frosted glass
- **Ambient orbs** : 3 orbes floues derriere le contenu (body = bg opaque, page-background = transparent)
- **Orbs dark** : L=0.45-0.50, opacite 15-22% ; **light** : L=0.82-0.85, opacite 12-18%
- **`text-secondary`** : differencie du background (L=0.35 dark) — ne jamais egaliser avec `--background`

### Miami theme

- Neon tokens : `--neon-aqua`, `--neon-orange` (WCAG AA)
- `.cyberpunk-title` : gradient anime + glow (scope `[data-theme="miami"]` uniquement)
- `.chess-logo` : pulse + glow anime (Miami only)
- Background : HalftoneWaves + BackgroundPaths + FloatingParticles (Miami only, toggle via AnimationsToggle)

## Deploiement

- **Plateforme** : Vercel (auto-deploy on push to `master`)
- **Branch production** : `master`
- **Build** : Next.js 16 + Turbopack
- **Storage** : Upstash Redis (provisionne via Vercel Marketplace)
- **Pas de GitHub Actions** : CI via pre-push hooks + Vercel auto-deploy

## Fichiers de configuration

| Fichier | Role |
|---------|------|
| `next.config.ts` | Next.js + bundle analyzer + cache headers images |
| `vercel.json` | Headers securite, CORS, cache static |
| `tsconfig.json` | TypeScript strict, alias `@/` |
| `eslint.config.mjs` | ESLint 9 flat config + security + sonarjs + ISO 5055 |
| `vitest.config.ts` | Tests unitaires (jsdom, coverage v8) |
| `vitest.config.e2e.ts` | Tests E2E (30s timeout, 120s hook timeout) |
| `vitest.setup.ts` | localStorage polyfill + jest-dom |
| `tailwind.config.ts` | Theme Miami Vice + Neutral |
| `.husky/pre-commit` | lint-staged |
| `.husky/pre-push` | 6 quality gates |
