# Conformite ISO — Nos Joueurs en Tournoi

Ce document trace la conformite du projet aux normes ISO/IEC applicables au logiciel.

## Normes applicables

| Norme | Edition | Perimetre | Applicabilite |
|-------|---------|-----------|---------------|
| **ISO/IEC 25010:2023** | Systems and software quality models | Qualite produit (8 caracteristiques) | Integrale |
| **ISO/IEC 5055:2021** | Software quality measurement — Automated source code quality measures | Maintenabilite, fiabilite, securite, performance du code source | Integrale |
| **ISO/IEC 25023:2016** | Measurement of system and software product quality | Metriques pour chaque sous-caracteristique | Partielle (metriques applicables) |
| **OWASP Top 10:2021** | Web Application Security Risks | Securite applicative web | Integrale |

## ISO/IEC 25010:2023 — Qualite produit

### 1. Functional Suitability (Adequation fonctionnelle)

| Sous-caracteristique | Implementation | Evidence |
|---------------------|----------------|----------|
| **Functional completeness** | Scraping FFE 3 pages (Stats, Ls, Ga), CRUD evenements, validation par ronde, sync multi-devices, partage QR | 531 tests couvrant toutes les fonctionnalites |
| **Functional correctness** | Calculs points/Buchholz/performance conformes aux regles FFE, parser valide sur donnees reelles | `calculations.test.ts` (34 tests), `parser.test.ts` (46 tests) |
| **Functional appropriateness** | Interface 2 phases (clubs -> resultats) adaptee au workflow d'un accompagnateur de club | `TournamentTabs.test.tsx` (32 tests), `useTournamentSync.test.ts` (27 tests) |

### 2. Performance Efficiency (Efficacite des performances)

| Sous-caracteristique | Implementation | Evidence |
|---------------------|----------------|----------|
| **Time behaviour** | Lazy loading composants (EventForm, ShareEventModal, DuplicateEventDialog), fetch parallele FFE (`Promise.all`) | `app/page.tsx` : `NextDynamic()`, `src/lib/scraper.ts` : `scrapeFFEPair()` |
| **Resource utilization** | React.memo sur 4 sub-components PlayerTable, props slicing (validation par joueur, pas objet global) | `PlayerTable.tsx` : `memo(PlayerRow)`, `playerValidation: Record<number, boolean>` |
| **Capacity** | Rate limiting Upstash (30 req/min scrape, 10 req/min events), body limit 1 MB | `proxy.ts`, `app/api/events/sync/route.ts` |

**Monitoring** : Vercel Analytics (Core Web Vitals : LCP, FID, CLS) via `<Analytics />` dans `app/layout.tsx`.

**Diagnostic** : `npm run analyze` (bundle analyzer) pour identifier les chunks lourds.

### 3. Compatibility (Compatibilite)

| Sous-caracteristique | Implementation | Evidence |
|---------------------|----------------|----------|
| **Co-existence** | Namespace par club (`nos-joueurs:{slug}:*`) isole les donnees localStorage et Redis | `kv.test.ts` (21 tests), `storage.test.ts` (isolation inter-clubs), `integration.test.ts` |
| **Interoperability** | browserslist (last 2 Chrome/Firefox/Safari/Edge), crypto.subtle guard | `package.json`, `src/lib/hmac.ts` : `isCryptoSubtleAvailable()` |

### 4. Usability (Utilisabilite)

| Sous-caracteristique | Implementation | Evidence |
|---------------------|----------------|----------|
| **Appropriateness recognizability** | Ecran onboarding, messages d'erreur contextuels FFE | `ClubOnboarding.tsx`, `scraper.ts` : messages traduits |
| **Learnability** | Workflow 2 phases guide, boutons explicites (Actualiser, Changer de club) | `TournamentTabs.tsx` |
| **Operability** | Raccourci Ctrl+R refresh, toggle animations, responsive mobile-first | `useTournamentSync.ts` : keydown handler |
| **User error protection** | Validation formulaire (min 3 chars, URL FFE whitelist), dialog confirmation suppression | `EventForm.test.tsx` (25 tests), `DuplicateEventDialog.tsx` |
| **Accessibility** | Skip link, `role="status"`, `aria-live`, `aria-label` sur nav | `app/page.tsx` : `<a href="#main-content" className="sr-only">` |

### 5. Reliability (Fiabilite)

| Sous-caracteristique | Implementation | Evidence |
|---------------------|----------------|----------|
| **Maturity** | 531 tests (25 suites), pre-push gate bloquant, 0 warning ESLint | `.husky/pre-push` (6 gates) |
| **Availability** | Fail-open rate limiter (Redis down -> pass-through) | `proxy.ts` : try/catch, `proxy.test.ts` : "fails open when Redis throws" |
| **Fault tolerance** | Erreurs FFE (404, 500, timeout) -> messages utilisateur, pas de crash | `scraper.test.ts` (8 tests), `TournamentTabs.test.tsx` : "handles API timeout error gracefully" |
| **Recoverability** | localStorage persiste hors-ligne, sync cloud restaure les donnees | `storage.test.ts` (56 tests), `sync.test.ts` (12 tests) |

### 6. Security (Securite)

| Sous-caracteristique | Implementation | Evidence |
|---------------------|----------------|----------|
| **Confidentiality** | CSP `frame-ancestors 'none'`, CORS restrictif, namespace isolation | `vercel.json` |
| **Integrity** | HMAC-SHA256 anti-replay (5 min), Zod validation stricte, body limit 1 MB | `hmac.test.ts` (16 tests), `schemas.test.ts` (18 tests), `routes.test.ts` |
| **Non-repudiation** | Token HMAC lie au slug + timestamp (tracabilite par club) | `src/lib/hmac.ts` |
| **Accountability** | Vercel deploy logs, rate limit headers (`X-RateLimit-Remaining`) | `proxy.ts` |
| **Authenticity** | SSRF prevention (whitelist hostname), HSTS preload | `app/api/scrape/route.test.ts` (5 tests) |

### 7. Maintainability (Maintenabilite)

| Sous-caracteristique | Implementation | Evidence |
|---------------------|----------------|----------|
| **Modularity** | Storage split (core + share), lib/ modules <80 lignes, types centralises | `src/lib/storage-core.ts`, `src/lib/storage-share.ts` |
| **Reusability** | `SLUG_REGEX` reutilise (validation.ts -> schemas.ts), `createClubStorage()` partout | DRY enforce |
| **Analysability** | ESLint complexity max 15, cognitive-complexity max 15, code duplication < 5% | `eslint.config.mjs`, `.husky/pre-push` gate 4 |
| **Modifiability** | TypeScript strict, alias `@/`, co-localisation tests | `tsconfig.json` |
| **Testability** | 531 tests, coverage v8 (seuils 70/60/70/70), mocks explicites | `vitest.config.ts` |

### 8. Portability (Portabilite)

| Sous-caracteristique | Implementation | Evidence |
|---------------------|----------------|----------|
| **Adaptability** | Vercel + Next.js (edge runtime compatible), browserslist 4 navigateurs | `package.json` |
| **Installability** | `npm install && npm run dev`, zero config locale requise | `README.md` |
| **Replaceability** | Interfaces TypeScript decrivent les contrats, pas les implementations | `src/types/index.ts` |

---

## ISO/IEC 5055:2021 — Mesures automatisees du code source

### Maintenabilite

| Mesure | Seuil | Outil | Configuration |
|--------|-------|-------|---------------|
| Complexite cyclomatique | max 15 | ESLint `complexity` | `eslint.config.mjs` |
| Complexite cognitive | max 15 | SonarJS `cognitive-complexity` | `eslint.config.mjs` |
| Profondeur d'imbrication | max 4 | ESLint `max-depth` | `eslint.config.mjs` |
| Longueur de fonction | max 80 lignes | ESLint `max-lines-per-function` | `eslint.config.mjs` |
| Duplication de code | < 5% | jscpd `--threshold 5` | `.husky/pre-push` gate 4 |
| Strings dupliquees | error | SonarJS `no-duplicate-string` | `eslint.config.mjs` |

### Fiabilite

| Mesure | Seuil | Outil | Configuration |
|--------|-------|-------|---------------|
| Couverture statements | >= 70% | Vitest v8 | `vitest.config.ts` |
| Couverture branches | >= 60% | Vitest v8 | `vitest.config.ts` |
| Couverture fonctions | >= 70% | Vitest v8 | `vitest.config.ts` |
| Couverture lignes | >= 70% | Vitest v8 | `vitest.config.ts` |
| Types stricts | error | TypeScript strict | `tsconfig.json` |
| Variables inutilisees | error | TypeScript + ESLint | `tsconfig.json`, `eslint.config.mjs` |
| Fonctions imbriquees | error | SonarJS `no-nested-functions` | `eslint.config.mjs` |
| Conditionnels imbriques | error | SonarJS `no-nested-conditional` | `eslint.config.mjs` |

### Securite

| Mesure | Seuil | Outil | Configuration |
|--------|-------|-------|---------------|
| Vulnerabilites critiques | 0 | npm audit | `.husky/pre-push` gate 5 |
| Regles security | recommended | eslint-plugin-security | `eslint.config.mjs` |
| Pseudo-random | error | SonarJS `pseudo-random` | `eslint.config.mjs` |
| Regex lentes | error | SonarJS `slow-regex` | `eslint.config.mjs` |
| `any` explicite | error | @typescript-eslint/no-explicit-any | `eslint.config.mjs` |

### Performance

| Mesure | Seuil | Outil | Configuration |
|--------|-------|-------|---------------|
| Bundle size | diagnostic | @next/bundle-analyzer | `npm run analyze` |
| Core Web Vitals | monitoring | Vercel Analytics | `app/layout.tsx` |
| Regex lentes | error | SonarJS `slow-regex` | `eslint.config.mjs` |

---

## OWASP Top 10:2021 — Couverture

| # | Risque | Statut | Implementation |
|---|--------|--------|----------------|
| A01 | Broken Access Control | Atenue | CORS restrictif, HMAC token, namespace isolation |
| A02 | Cryptographic Failures | Atenue | HMAC-SHA256, HSTS preload, pas de credentials stockes |
| A03 | Injection | Atenue | Zod validation, pas de SQL, cheerio parse HTML (pas d'eval) |
| A04 | Insecure Design | Atenue | TypeScript strict, schemas Zod, separation client/serveur |
| A05 | Security Misconfiguration | Atenue | CSP, X-Frame-Options, Permissions-Policy, X-Content-Type-Options |
| A06 | Vulnerable Components | Atenue | `npm audit` gate pre-push (0 critical), `npm audit --json` parse |
| A07 | Auth Failures | N/A | Pas d'auth utilisateur (app publique, HMAC = defense-in-depth) |
| A08 | Data Integrity Failures | Atenue | HMAC anti-replay, Zod stricte (pas `.passthrough()`), body limit |
| A09 | Logging Failures | Partiel | `console.warn` sur rate limit, Vercel deploy logs, pas de logging structure |
| A10 | SSRF | Atenue | Whitelist hostname `echecs.asso.fr` sur `/api/scrape` |

---

## Matrice de tracabilite tests -> exigences

### Security (ISO 25010 §6)

| Exigence | Fichier test | Tests |
|----------|-------------|-------|
| HMAC anti-replay | `hmac.test.ts` | 16 tests (generation, verification, expiration, clock skew, crypto check) |
| Zod validation API | `schemas.test.ts` | 28 tests (clubSlug, result, player, tournament, pairing, event, syncBody) |
| SSRF prevention | `scrape/route.test.ts` | 5 tests (URL manquante, mal formee, hostname attaquant, sous-domaine) |
| Rate limiting | `proxy.test.ts` | 6 tests (429, pass-through, fail-open, IP extraction) |
| Body size limit | `events/routes.test.ts` | 1 test (413 si > 1MB) |
| Slug validation | `events/routes.test.ts` | 2+ tests (slug invalide -> 400) |

### Reliability (ISO 25010 §5)

| Exigence | Fichier test | Tests |
|----------|-------------|-------|
| Fail-open rate limiter | `proxy.test.ts` | 1 test ("fails open when Redis throws") |
| Error handling FFE | `scraper.test.ts` | 8 tests (throwScrapeError) |
| Timeout handling | `TournamentTabs.test.tsx` | 1 test ("handles API timeout error gracefully") |
| localStorage persistence | `storage.test.ts` | 56 tests (CRUD, isolation, BVA) |
| Sync recovery | `sync.test.ts` | 4 tests (merge strategy) |

### Maintainability (ISO 5055)

| Exigence | Outil | Verification |
|----------|-------|-------------|
| Complexity <= 15 | ESLint | Pre-push gate 2 (0 warnings) |
| Duplication < 5% | jscpd | Pre-push gate 4 |
| Coverage >= 70% | Vitest v8 | Pre-push gate 6 |
| Types stricts | TypeScript | Pre-push gate 1 |
| Build valide | Next.js | Pre-push gate 3 |

### Performance (ISO 25010 §2)

| Exigence | Implementation | Verification |
|----------|---------------|-------------|
| Lazy loading | `NextDynamic()` sur 5 composants | Build OK (pre-push gate 3) |
| React.memo | 4 sub-components PlayerTable | `PlayerTable.test.tsx` (pas de regression) |
| Bundle analysis | @next/bundle-analyzer | `npm run analyze` (diagnostic) |
| CWV monitoring | Vercel Analytics | Dashboard Vercel (post-deploy) |

### Compatibility (ISO 25010 §3)

| Exigence | Implementation | Verification |
|----------|---------------|-------------|
| Browsers | browserslist (last 2 versions x 4 browsers) | `package.json` |
| crypto.subtle | Guard + warning | `hmac.test.ts` (2 tests) |
| Club isolation | Namespace `nos-joueurs:{slug}:*` | `kv.test.ts`, `integration.test.ts` |

---

## Quality gates — resume

```
git push
  |
  [1/6] tsc --noEmit                    ISO 5055 Reliability
  [2/6] eslint --max-warnings 0         ISO 5055 Maintainability
  [3/6] next build                      ISO 25010 Functional Suitability
  [4/6] jscpd --threshold 5             ISO 5055 Maintainability
  [5/6] npm audit (0 critical)          OWASP A06
  [6/6] vitest run --coverage --reporter=dot --coverage.reporter=json   ISO 25010 Testability
  |
  v
  All passed -> push accepted
```

## Score qualite

**Score estime : 4.5/5** (objectif atteint depuis score initial 4.3/5).

| Caracteristique ISO 25010 | Score | Justification |
|---------------------------|-------|---------------|
| Functional Suitability | 5/5 | Toutes les fonctionnalites couvertes par tests |
| Performance Efficiency | 4/5 | Lazy loading, memo, monitoring CWV. Pas de cache serveur (par design). |
| Compatibility | 4/5 | browserslist, crypto guard. Pas de tests cross-browser automatises. |
| Usability | 4/5 | Responsive, skip link, aria. Pas d'audit WCAG complet. |
| Reliability | 5/5 | 531 tests, fail-open, error handling, persistence |
| Security | 5/5 | HMAC, CORS, CSP, HSTS, rate limit, Zod, SSRF, body limit |
| Maintainability | 5/5 | ESLint ISO 5055, duplication < 5%, strict TS, 70%+ coverage |
| Portability | 4/5 | Vercel deploy, npm install. Pas de containerisation. |

**Moyenne : 4.5/5**
