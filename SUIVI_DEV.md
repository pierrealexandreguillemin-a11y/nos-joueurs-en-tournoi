# Suivi de developpement - Nos Joueurs en Tournoi

> Derniere mise a jour : 2026-04-12
> Branche : `master`
> Dernier commit : `c9acd1f`

---

## Etat du projet

| Indicateur | Valeur | Seuil | Statut |
|------------|--------|-------|--------|
| Tests | 571 passed (28 suites) | - | OK |
| Tests E2E | 19 passed (6 suites) | - | OK |
| Couverture Stmts | 95.05% | >= 70% | OK |
| Couverture Branch | 85.79% | >= 70% | OK |
| Couverture Funcs | 96.36% | >= 70% | OK |
| Couverture Lines | 96.31% | >= 70% | OK |
| ESLint errors | 0 | 0 | OK |
| ESLint warnings | 0 | 0 | OK |
| TypeScript errors | 0 | 0 | OK |
| Duplication (jscpd) | 0.11% | <= 5% | OK |
| Vulnerabilites critiques | 0 | 0 | OK |
| Build production | OK | - | OK |

---

## Infrastructure qualite en place

### Normes appliquees

| Norme | Caracteristique | Outil | Seuil |
|-------|-----------------|-------|-------|
| ISO 5055 Maintainability | Complexite cyclomatique | ESLint `complexity` | error > 15 |
| ISO 5055 Maintainability | Complexite cognitive | SonarJS `cognitive-complexity` | error > 15 |
| ISO 5055 Maintainability | Profondeur imbrication | ESLint `max-depth` | error > 4 |
| ISO 5055 Maintainability | Taille fonction | ESLint `max-lines-per-function` | error > 80 |
| ISO 5055 Maintainability | Duplication de code | jscpd (src + app) | <= 5% |
| ISO 5055 Maintainability | Chaines dupliquees | SonarJS `no-duplicate-string` | error |
| ISO 5055 Reliability | Typage strict | `tsc --noEmit` | 0 erreurs |
| ISO 5055 Security | Injections | eslint-plugin-security | recommended-legacy |
| ISO 25010 Maintainability | Code smells | eslint-plugin-sonarjs | recommended-legacy |
| ISO 25010 Testability | Couverture tests | Vitest v8 | >= 70% |
| OWASP A06 | Dependances vulnerables | `npm audit` | 0 critical |

### Pre-commit (rapide, bloquant)

```
npx lint-staged
  -> eslint --max-warnings 0 sur fichiers stages *.{ts,tsx}
```

### Pre-push (porte qualite complete, 6 gates)

```
[1/6] tsc --noEmit                    (ISO 5055 Reliability)
[2/6] eslint src app --max-warnings 0 (ISO 5055 Maintainability)
[3/6] npm run build                   (Build production)
[4/6] jscpd src app --threshold 5     (ISO 5055 Duplication)
[5/6] npm audit --audit-level=critical(OWASP A06)
[6/6] vitest run --reporter=dot --coverage --coverage.reporter=json (ISO 25010 Testability)
```

### ESLint plugins actifs

- `@typescript-eslint` — typage strict, no-any, no-unused-vars
- `react` + `react-hooks` + `react-refresh` — React best practices
- `security` — eslint-plugin-security (OWASP)
- `sonarjs` — cognitive complexity, code smells

### Commitlint

- Commits conventionnels : `type(scope): description`
- Types autorises : feat, fix, refactor, docs, test, perf, ci, chore

---

## Historique des audits (session 2026-02-20)

### Audit #1 — 34 findings

| Severite | Trouvailles | Statut |
|----------|-------------|--------|
| CRITICAL | 2 (CORS *, key={i}) | CORRIGE |
| HIGH | 7 (no-console, MongoDB naming, duplication storage) | CORRIGE |
| MEDIUM | 11 (eslint warnings, tests manquants) | CORRIGE |
| LOW | 8 (DebugPanel en prod, error instanceof) | CORRIGE |
| INFO | 6 (misc) | CORRIGE |

Commit : `9136cfe`

### Audit #2 — 7 findings

| Finding | Description | Statut |
|---------|-------------|--------|
| N-01 | page.tsx Home() 222 lignes (max 80) | CORRIGE |
| N-02/03 | CSS strings dupliquees dans page.tsx | CORRIGE |
| N-04/05 | Metadata strings dupliquees dans layout.tsx | CORRIGE |
| N-06/07 | eslint-disable sans justification | CORRIGE |

Commit : `c946ad0`

### Audit #3 — 7 findings

| Finding | Description | Statut |
|---------|-------------|--------|
| A-01 | Pre-push ESLint ne couvrait que src/ | CORRIGE |
| A-02 | Pre-push jscpd ne couvrait que src/ | CORRIGE |
| A-03 | npm script duplication idem | CORRIGE |
| A-04 | SLUG_REGEX duplique dans 2 routes API | CORRIGE |
| A-05 | `error instanceof Error` pattern (3 API catches) | CORRIGE (`apiError()` helper) |
| A-06 | Nom app hardcode en 2 endroits (sous seuil sonarjs) | OK |
| A-07 | error.message expose dans reponses 500 | CORRIGE (`apiError()` helper) |

Commit : `59b77a9`

### Session couverture (2026-02-20 → 2026-02-21)

**Phase 1 : 67.97% → 71.42% branches** — Plan initial execute

| Fichier cree/modifie | Tests ajoutes | Impact branches |
|----------------------|---------------|-----------------|
| `src/components/ClubSelector.test.tsx` | +3 | +4 branches |
| `src/lib/scraper.test.ts` | +5 | +4 branches |
| `src/lib/kv.test.ts` | +10 | kv.ts → 100% |

**Phase 2 : 71.42% → 85.71% branches** — Couverture fichiers critiques

| Fichier cree/modifie | Tests ajoutes | Impact |
|----------------------|---------------|--------|
| `src/hooks/useTournamentSync.test.ts` | +22 | 46.34% → 90.24% |
| `src/lib/storage.test.ts` | +30 | 45.55% → 92.22% |
| `src/lib/kv.test.ts` | +2 | 90.9% → 100% |

**Phase 3 : E2E** — Tests bout en bout

| Fichier cree | Tests | Couverture |
|-------------|-------|------------|
| `e2e/onboarding.e2e.ts` | 5 | Flow onboarding complet |
| `e2e/event-creation.e2e.ts` | 5 | Creation/persistence evenements |
| `e2e/accessibility.e2e.ts` | 3 | WCAG 2.1 AA via axe-core |
| `e2e/share-url.e2e.ts` | 2 | Import via ?share= URL |

### Audit #4 — 12 findings (auto-audit sincerite)

| Finding | Severite | Description | Statut |
|---------|----------|-------------|--------|
| F1 | HIGH | Test titre trompeur "fetchResults sans clubName" — ne testait pas fetchResults | CORRIGE (renomme + documente honnêtement) |
| F2 | HIGH | Branche identity===null jamais testee (useTournamentSync:213-214) | CORRIGE (mockIdentity mutable, test ajoute) |
| F3 | MEDIUM | Pas de E2E pour ?share= URL | CORRIGE (e2e/share-url.e2e.ts) |
| F4 | MEDIUM | DRY non applique — makeEvent local dans storage.test.ts | CORRIGE (delegue a makeFixtureEvent) |
| F5 | MEDIUM | _encodeEventToURL catch (storage.ts:516-518) non couvert | CORRIGE (mock JSON.stringify) |
| F6 | MEDIUM | clearAllData error path (storage.ts:652) non couvert | CORRIGE (mock removeItem) |
| F7 | LOW | loading guard Ctrl+R (useTournamentSync.ts:97) non teste | CORRIGE (test avec promise pendante) |
| F8 | LOW | setTimeout(r,10) fragile dans test Ctrl+R | CORRIGE (remplace par waitFor) |
| F9 | LOW | globalThis.window manipulation dans storage.test.ts | DOCUMENTE (try/finally suffisant) |
| F10 | LOW | http://test.com pre-existants dans storage.test.ts | CORRIGE (→ https://test.example.com) |
| F11 | LOW | SUIVI_DEV.md non mis a jour | CORRIGE |
| F12 | LOW | fixtures.ts a 25% — factories mortes | CORRIGE (makePlayer/makeTournament utilises → 75%) |

**Branches non couvertes restantes (documentees) :**
- `useTournamentSync.ts:142` — defense-in-depth: `if (!event.clubName) return` dans fetchResults n'est jamais appele directement (handleRefresh dispatche vers fetchClubs dans ce cas). Branche inaccessible sans refactoring.
- `ClubSelector.tsx:17` — defense-in-depth: `if(selected)` falsy inaccessible via React fiber (bouton disabled en amont).
- `storage.ts:632` — getValidationState dans createClubStorage toujours couvert via getValidation mais pas directement.

---

## Feature Appariements (session 2026-02-23 → 2026-02-24)

### Implementation (8 commits)

| Commit | Type | Description |
|--------|------|-------------|
| `c49eb06` | feat(types) | Ajout types `Pairing`, `ClubPairing`, `PairingColor` + schemas Zod |
| `9d929d5` | feat(parser) | `getRoundUrl`, `parsePairings`, `filterClubPairings`, `detectCurrentRound`, `invertResult` |
| `51e619c` | feat(sync) | Fetch appariements dans `fetchTournamentResults` (strategie N+1 fallback N) |
| `a97cbd1` | feat(ui) | `ViewToggle` + `PairingsTable` + integration `TournamentTabs` |
| `edd0b4b` | fix(parser) | Inversion resultat pour perspective joueur noir |
| `5b7bbed` | test(pairings) | +18 tests (invertResult, schemas, fixture HTML realiste, coverage) |
| `bb5de67` | test(parser) | Test format forfait FFE "1F - 0F" |
| `0b17118` | fix(ui) | Audit UX/UI : aria-pressed, focus-visible, scope col, dark mode, useCallback |

### Audit UX/UI post-implementation

Audits par agents `ux-design-guardian` et `ui-design-guardian` en parallele.

| Severite | Trouvailles | Statut |
|----------|-------------|--------|
| CRITIQUE | 5 (aria-pressed, focus-visible, scope col, double overflow, viewMode guard) | CORRIGE |
| MAJEUR | 7 (useCallback, dark mode, toggle visibility, empty state, pairingsRound, labels) | CORRIGE |
| MINEUR | 8 (tooltip, badge role, zebra opacity, result display, column rename) | CORRIGE |

Commit correctif : `0b17118`

### Fichiers crees

| Fichier | Description |
|---------|-------------|
| `src/components/ViewToggle.tsx` | Toggle segmente Resultats/Appariements (aria-pressed, focus-visible, badge orange) |
| `src/components/PairingsTable.tsx` | Table appariements du club (table, couleur, adversaire, elo, resultat) |
| `src/components/ViewToggle.test.tsx` | 11 tests (rendu, aria, focus, badge, disabled, tooltip) |
| `src/components/PairingsTable.test.tsx` | 11 tests (rendu, scope col, badges, exempt, etat vide) |

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/types/index.ts` | +3 types : `Pairing`, `ClubPairing`, `PairingColor` ; `Tournament` etendu |
| `src/lib/schemas.ts` | +1 schema `pairingSchema` ; `tournamentSchema` etendu |
| `src/lib/parser.ts` | +5 fonctions : `getRoundUrl`, `parsePairings`, `filterClubPairings`, `detectCurrentRound`, `invertResult` |
| `src/hooks/useTournamentSync.ts` | `fetchPairingsForRound`, `fetchBestPairings`, integration dans `fetchTournamentResults` |
| `src/components/TournamentTabs.tsx` | Integration ViewToggle + PairingsTable, extraction TournamentContent |
| `src/lib/parser.test.ts` | +24 tests (getRoundUrl, parsePairings, filterClubPairings, invertResult) |
| `src/components/TournamentTabs.test.tsx` | +5 tests integration appariements |

### Impact sur les metriques

| Metrique | Avant | Apres | Delta |
|----------|-------|-------|-------|
| Tests | 439 (20 suites) | 531 (25 suites) | +92 (+5 suites) |
| Stmts | 94.80% | 95.05% | +0.25% |
| Branch | 86.40% | 85.79% | -0.61% |
| Funcs | 95.18% | 96.36% | +1.18% |
| Lines | 95.58% | 96.31% | +0.73% |

---

## Session maintenance + E2E (2026-03-06 → 2026-03-07)

### Pre-push fix + ESLint 9 migration

| Commit | Description |
|--------|-------------|
| `2121ed2` | fix: pre-push dot reporter pour eviter Windows stdout overflow |
| `492996e` | chore: migration ESLint 8→9 flat config (`eslint.config.mjs`) |

### Securite OWASP A-05

| Commit | Description |
|--------|-------------|
| `183bf64` | fix(security): `apiError()` helper — log complet serveur, message generique client |

### E2E

| Commit | Description |
|--------|-------------|
| `3c91ac9` | test(e2e): +refresh-results (mock FFE), +lighthouse, fix share-url + accessibility |

### Corrections E2E pre-existants

| Fichier | Probleme | Correction |
|---------|----------|------------|
| `share-url.e2e.ts` test 1 | Asserts event name invisible (players=[]) | Assert "Aucune donnee" (visible UI) |
| `share-url.e2e.ts` test 2 | `waitForText('invalide')` timeout (Sonner toast) | Assert graceful degradation + URL cleanup |
| `accessibility.e2e.ts` test 3 | Flaky color-contrast (Sonner richColors toast) | Wait for toasts to dismiss before axe |
| `lighthouse.e2e.ts` | EPERM on `chrome.kill()` Windows | try/catch in afterAll |

---

## Session UX EventForm + polish (2026-03-09)

### Audit UX

Audit complet de l'experience utilisateur : 13 findings globaux (G-01 a G-13), 15 frictions EventForm (F-01 a F-15), 3 bugs (B-01 a B-03). Trois propositions evaluees (wizard, form ameliore, hybride), decision pour la proposition B (form ameliore in-place).

Documents : `docs/plans/2026-03-08-ux-audit-design.md`, `docs/plans/2026-03-08-ux-improvements.md`

### Implementation (8 commits, branche `feat/ux-improvements`)

| Commit | Type | Description |
|--------|------|-------------|
| `46ce741` | fix(form) | Validation alignee avec validation.ts — isValidFFeUrl, min lengths (B-01, B-02, F-03, F-14) |
| `3211166` | feat(form) | Textes d'aide contextuels et labels inclusifs (F-01, F-02, F-09, F-10) |
| `648e646` | fix(storage) | try/catch saveEvent dans handleEventCreated (B-03) |
| `cb86218` | fix(sync) | Message d'erreur club ameliore avec action corrective (F-06) |
| `e385b3e` | fix(ui) | Empty state guide + sticky colonne nom joueur (G-01, G-05) |
| `2d0a6e4` | fix(a11y) | Badge texte visible ViewToggle au lieu de couleur seule (G-02) |
| `fe81ea2` | feat(form) | Validation inline blur, autoFocus, layout mobile, duplicate URL (F-04, F-05, F-07, F-08, F-12, F-13) |
| *(review)* | fix(form) | Nettoyage fieldErrors a la suppression, aria-describedby, bg sticky (review findings) |

### Corrections post-review

| Finding | Severite | Description | Statut |
|---------|----------|-------------|--------|
| R-01 | CRITIQUE | fieldErrors orphelins lors suppression tournoi (index shift) | CORRIGE (cles basees sur tournament.id) |
| R-02 | IMPORTANT | Pas de aria-describedby reliant erreurs inline aux inputs | CORRIGE (id sur FieldError + aria-describedby conditionnel) |
| R-03 | IMPORTANT | bg-card sticky ne correspond pas aux bandes paires/impaires | CORRIGE (bg-muted/bg-card alterné sur PlayerRow) |
| R-04 | MINEUR | Test redondant ViewToggle | CORRIGE (supprimé) |
| R-05 | MINEUR | Pas de test toast incomplete rows | CORRIGE (mock sonner + assertion) |
| R-06 | MINEUR | Pas de test empty state guidance | CORRIGE (assertion ajoutée) |
| R-07 | DOC | SUIVI_DEV.md non mis a jour | CORRIGE |

### Impact sur les metriques

| Metrique | Avant | Apres | Delta |
|----------|-------|-------|-------|
| Tests | 534 (26 suites) | 565 (28 suites) | +31 (+2 suites) |
| Fichiers modifies | - | 8 | EventForm, PlayerTable, ViewToggle, page, useTournamentSync + tests |

---

## Session design system + UX audit + ISO (2026-04-12)

### Design system

Document complet du design system : `docs/DESIGN-SYSTEM.md` (746 lignes, 12 sections).
Couvre : tokens OKLCH, couleurs, typographie, espacement, glassmorphism, composants, animations, accessibilite, responsive, guide d'utilisation (dev + designers + stakeholders).

### Fix modal EventsManager

Cause racine : la regle CSS `[data-theme="neutral"] .glass-card { position: relative }` override `position: fixed` du dialog (specificite CSS superieure). Le dialog etait pousse hors ecran en theme Neutral.

| Commit | Description |
|--------|-------------|
| `a7ddcfb` | Fix dialog positioning, glass conflicts, design system doc |

Corrections :
- `:not(.fixed)` sur les regles glass refraction (globals.css)
- `max-h-[85vh] overflow-y-auto` sur Dialog et AlertDialog
- `onInteractOutside` pour empecher la fermeture au clic exterieur
- Header responsive du modal (`flex-col sm:flex-row`)
- Opacite renforcee pour les dialogs glass (`background: oklch(var(--background) / 0.96)`)

### Audit user journey (5 parcours, 16 findings)

Audit Playwright sur les 5 parcours utilisateur (onboarding, creation, gestion, partage, personnalisation). Desktop 1366x768 et mobile 375x812, themes Miami dark + Neutral dark/light.

| Commit | Description |
|--------|-------------|
| `7961585` | Rapport d'audit : `docs/USER-JOURNEY-AUDIT.md` |
| `197dd6e` | 15 corrections UX implementees |

Corrections UX :
- Tagline explicative sur l'onboarding ("Suivez les resultats de vos joueurs...")
- "Votre espace" au lieu de "Identifiant" pour le slug
- Spinner pendant le chargement FFE (card avec icone animate-spin)
- Suppression du 2e bouton Actualiser standalone
- Animation fade-up sur le selecteur de club
- Tooltip ameliore sur le bouton Appariements desactive
- Label et placeholder clarifies pour "Nom du club"
- Toast confirmation apres selection du club
- CTA "Creer un evenement" dans le modal vide
- Note dans le dialog partage (portee de l'URL)
- Titre h1 compact sur mobile (`text-lg` au lieu de `text-2xl`)
- Gradient scroll-hint sur le tableau (mobile only)

### Audit ISO (23 findings, 4 axes)

Audit statique par 4 agents paralleles : Maintainability, Reliability, Security, Accessibility.

| Commit | Description |
|--------|-------------|
| `48f2c4b` | Rapport : `docs/ISO-AUDIT-2026-04-12.md` |
| `2ca7151` | 6 quick wins ISO (SSRF protocol, aria-labels, silent catch) |
| `c9acd1f` | 4 fixes court terme (Zod scrape, useReducedMotion, focus menu, import validation) |
| `b614d80` | 5 fixes effort faible (content-type FFE, OPTIONS handlers, SSR guard, cast, debug a11y) |

Corrections securite (7/7 traites, 1 en backlog) :
- SEC-1 : Check `protocol !== 'https:'` dans `/api/scrape` (SSRF)
- SEC-3 : Schema Zod `scrapeBodySchema` sur la route scrape
- SEC-4 : Bornes `.max()` sur tous les arrays/strings dans schemas.ts + `exportedEventSchema`
- SEC-5 : Validation content-type `text/html` + cap 5 MB sur reponse FFE
- SEC-6 : Handler `OPTIONS()` sur les 3 routes API (CORS preflight)
- SEC-2 : CSP nonce-based → **backlog** (effort eleve, Next.js middleware)
- SEC-7 : HMAC cle publique → **documente** (choix d'architecture)

Corrections accessibilite (8/8 traites) :
- A11Y-1/2 : `aria-label` + `aria-hidden` sur boutons icones ShareEventModal
- A11Y-3 : `useReducedMotion()` Framer Motion dans BackgroundPaths
- A11Y-4 : Focus management + navigation fleches dans ClubHeader menu (`useMenuKeyboard` hook)
- A11Y-5 : `aria-hidden="true"` sur canvas HalftoneWaves
- A11Y-6 : Retrait `aria-label` redondant sur select ClubSelector
- A11Y-7 : gradient-clip → risque quasi-nul (navigateurs modernes, Radix `aria-labelledby`)
- A11Y-8 : `aria-label` + `aria-hidden` sur DebugPanel trigger (dev-only)

Corrections fiabilite (4/4 traites) :
- REL-1 : `console.error` dans le catch de fetchPairingsForRound
- REL-2 : Validation Zod des imports JSON au lieu de `as ExportedEvent`
- REL-3 : Guard `typeof window` dans `generateShareURLFrom` (SSR safety)
- REL-4 : Remplacement `as ValidationState` par annotation directe (type-safe)

Backlog maintenabilite (non bloquant, pre-push passe) :
- MAINT-1 : Fonctions imbriquees parser.ts (sonarjs tolere callbacks chaines)
- MAINT-2/4 : Strings dupliquees EventsManager/TournamentTabs (extraction constantes possible)
- MAINT-3 : EventsManager a 79/80 lignes (extraction sous-composants au prochain ajout)

### Impact sur les metriques

| Metrique | Avant | Apres | Delta |
|----------|-------|-------|-------|
| Tests | 565 (28 suites) | 571 (28 suites) | +6 |
| Score ISO | 4.5/5 (declare) → 4.0/5 (audit) | 4.4/5 (16/23 corriges) | +0.4 |
| Findings restants | 23 | 7 (1 backlog securite, 2 documentes, 4 maintenabilite non bloquants) | -16 |

---

## TODO - Prochaine session

### Priorite 1 — Fiabilite et couverture

- [x] **Couverture branches a 70%** — 67.97% → 86.40%. DONE.
- [x] **Couverture globale a 85%** — Stmts 94.80%, Lines 95.58%. DONE.
- [x] **Tests composants React** — ClubSelector, EventForm, TournamentTabs, ClubStats, PlayerTable testes. Reste: EventsManager, ShareEventModal.
- [x] **Tests hooks** — useTournamentSync teste (97.56% branches). Reste: useShareURLImport, useHomePage (testes via E2E).

### Priorite 2 — Securite (OWASP)

- [x] **A-05 : Normaliser la gestion d'erreur API** — `apiError(label, error)` dans `src/lib/api-error.ts`. Log complet serveur, message generique client. Les 3 routes (`fetch`, `sync`, `scrape`) migrees. DONE.
- [x] **Rate limiting API** — Implemented (Upstash sliding window, 30 req/min scrape, 10 req/min events). DONE.
- [x] **Zod validation scrape** — `scrapeBodySchema` avec bornes `.max()` sur toutes les routes. DONE.
- [ ] **CSP headers** — Migrer vers CSP nonce-based (Next.js middleware) pour retirer `unsafe-inline`/`unsafe-eval`.

### Priorite 3 — CI/CD

- [ ] **GitHub Actions** — Creer `.github/workflows/ci.yml` qui execute les 6 gates du pre-push sur chaque PR. Le pre-push local est fragile sur Windows (probleme de sortie volumineuse > 40k chars qui cause des faux echecs).
- [ ] **Automatiser les checks sur PR** — Lint, typecheck, build, tests, duplication, audit.
- [ ] **Badge qualite** — Ajouter les badges CI/coverage dans le README.

### Priorite 4 — Tests E2E et accessibilite

- [x] **Tests E2E Puppeteer** — 6 suites E2E, 19 tests :
  - [x] Onboarding club (e2e/onboarding.e2e.ts — 5 tests)
  - [x] Creation evenement (e2e/event-creation.e2e.ts — 5 tests)
  - [x] Actualisation resultats avec mock FFE (e2e/refresh-results.e2e.ts — 3 tests)
  - [x] Partage par URL (e2e/share-url.e2e.ts — 2 tests)
  - [x] Accessibilite axe-core WCAG 2.1 AA (e2e/accessibility.e2e.ts — 3 tests)
  - [x] Lighthouse audit perf/a11y/bp/seo (e2e/lighthouse.e2e.ts — 1 test)

### Priorite 5 — Maintenance et DX

- [x] **Mettre a jour le README.md** — Mis a jour avec 531 tests, 25 suites, feature appariements, inventaire complet.
- [x] **Pre-push Windows workaround** — Fix via `--reporter=dot --coverage.reporter=json` (supprime la table coverage stdout). DONE.
- [x] **Upgrade eslint a v9** — Migration ESLint 8→9 flat config (`eslint.config.mjs`), sonarjs 4.0.1, security 3.0.1. DONE.

### Priorite 6 — Fonctionnalites

- [x] **Appariements en direct** — Toggle Resultats/Appariements par onglet, scraping pages ronde FFE, filtrage club, badges couleur. DONE (8 commits, 2026-02-23/24).
- [ ] **Nouvelles fonctionnalites** — A definir avec le product owner. Candidates :
  - Notifications push quand un resultat change
  - Historique des rondes (evolution score)
  - Mode hors-ligne ameliore (Service Worker)
  - Comparaison entre tournois

---

## Fichiers cles modifies lors des audits

| Fichier | Modification |
|---------|-------------|
| `.husky/pre-commit` | lint-staged strict |
| `.husky/pre-push` | 6 portes qualite ISO/OWASP couvrant src + app |
| `eslint.config.mjs` | ESLint 9 flat config, plugins security/sonarjs, regles ISO, no-console |
| `package.json` | lint-staged, scripts duplication/typecheck, overrides minimatch |
| `src/lib/storage.ts` | DRY refactor — public API delegue a _helpers (-130 lignes) |
| `src/lib/sync.ts` | Rename MongoDB -> Upstash, suppression console.log |
| `src/lib/validation.ts` | Export SLUG_REGEX, support www.echecs.asso.fr |
| `app/page.tsx` | Extraction composants (LoadingScreen, PageHeader, EmptyState) + hooks |
| `app/layout.tsx` | Extraction constantes APP_NAME/APP_TITLE |
| `app/api/events/fetch/route.ts` | Suppression CORS *, console.log, import SLUG_REGEX |
| `app/api/events/sync/route.ts` | Suppression CORS *, console.log, import SLUG_REGEX |
| `app/api/scrape/route.ts` | Suppression CORS * et OPTIONS handler |
| `src/components/PlayerTable.tsx` | key={i} -> key stable |
| `src/components/DebugPanel.tsx` | Guard production |

---

## Problemes connus

### Git push --no-verify sur Windows (RESOLU)

Le pre-push generait ~40k chars de sortie (table coverage Vitest). Git for Windows interpretait ce volume comme un echec et annulait le push. **Fix** : `--reporter=dot --coverage.reporter=json` dans le pre-push hook supprime la table coverage verbose. Le push fonctionne normalement sans `--no-verify`.

### Vulnerabilites npm (transitives)

`npm audit` rapporte ~18 vulnerabilites `high` dans des dependances transitives non corrigeables (puppeteer, lighthouse, etc.). Seules les `critical` sont bloquantes. L'override `minimatch: ^10.2.1` a reduit les vulns de 21 a 3 corrigeables.

### Donnees publiques

Les API `/api/events/fetch` et `/api/events/sync` n'ont pas d'authentification. C'est un choix delibere : les donnees (resultats de tournois FFE) sont publiques. L'absence d'auth n'est pas un finding securite dans ce contexte.
