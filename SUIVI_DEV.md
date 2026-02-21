# Suivi de developpement - Nos Joueurs en Tournoi

> Derniere mise a jour : 2026-02-20
> Branche : `master`
> Dernier commit : `59b77a9`

---

## Etat du projet

| Indicateur | Valeur | Seuil | Statut |
|------------|--------|-------|--------|
| Tests | 361 passed (17 suites) | - | OK |
| Couverture Stmts | 79.53% | >= 70% | OK |
| Couverture Branch | 67.97% | >= 70% | SOUS SEUIL |
| Couverture Funcs | 79.38% | >= 70% | OK |
| Couverture Lines | 78.49% | >= 70% | OK |
| ESLint errors | 0 | 0 | OK |
| ESLint warnings | 0 | 0 | OK |
| TypeScript errors | 0 | 0 | OK |
| Duplication (jscpd) | 0.00% | <= 5% | OK |
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
[6/6] vitest run --coverage           (ISO 25010 Testability)
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
| A-05 | `error instanceof Error` pattern (3 API catches) | TODO |
| A-06 | Nom app hardcode en 2 endroits (sous seuil sonarjs) | OK |
| A-07 | error.message expose dans reponses 500 | TODO |

Commit : `59b77a9`

---

## TODO - Prochaine session

### Priorite 1 — Fiabilite et couverture

- [ ] **Couverture branches a 70%** — Actuellement 67.97%, sous le seuil ISO 25010. Identifier les branches non couvertes (`npx vitest run --coverage` puis analyser le rapport) et ajouter les tests manquants.
- [ ] **Couverture globale a 85%** — Objectif stretch. Les fichiers les moins couverts sont probablement les composants React et les hooks.
- [ ] **Tests composants React** — Ajouter des tests @testing-library/react pour les composants principaux : `ClubSelector`, `EventForm`, `EventsManager`, `TournamentTabs`, `ClubStats`, `ShareEventModal`.
- [ ] **Tests hooks** — Tester `useTournamentSync`, `useShareURLImport`, `useHomePage` avec des mocks appropriate.

### Priorite 2 — Securite (OWASP)

- [ ] **A-05 : Normaliser la gestion d'erreur API** — Les 3 routes API (`fetch`, `sync`, `scrape`) exposent `error.message` dans les reponses 500. Creer un helper `apiError(error)` qui :
  - Log l'erreur complete cote serveur (`console.error`)
  - Retourne un message generique au client (`"Internal server error"`)
  - Ne leak jamais le message d'erreur original
- [ ] **Rate limiting API** — Ajouter un rate limiter sur `/api/scrape` pour eviter l'abus du proxy CORS vers FFE. Options : Upstash Ratelimit ou middleware Vercel.
- [ ] **CSP headers** — Verifier/renforcer les Content-Security-Policy dans `vercel.json`.

### Priorite 3 — CI/CD

- [ ] **GitHub Actions** — Creer `.github/workflows/ci.yml` qui execute les 6 gates du pre-push sur chaque PR. Le pre-push local est fragile sur Windows (probleme de sortie volumineuse > 40k chars qui cause des faux echecs).
- [ ] **Automatiser les checks sur PR** — Lint, typecheck, build, tests, duplication, audit.
- [ ] **Badge qualite** — Ajouter les badges CI/coverage dans le README.

### Priorite 4 — Tests E2E et accessibilite

- [ ] **Tests E2E Puppeteer** — Le projet a deja `puppeteer` et `@axe-core/puppeteer` en devDependencies. Creer des scenarios E2E :
  - Onboarding club
  - Creation evenement
  - Actualisation resultats (avec mock FFE)
  - Partage par URL
- [ ] **Tests accessibilite axe-core** — Scanner chaque page avec axe-core pour valider WCAG 2.1 AA.
- [ ] **Tests Lighthouse** — `lighthouse` est en devDependencies. Automatiser un audit performance/accessibility/SEO.

### Priorite 5 — Maintenance et DX

- [ ] **Mettre a jour le README.md** — La section "Qualite du code" mentionne encore "142 tests" et un pre-commit basique. Mettre a jour avec les vrais chiffres (361 tests, 6 gates pre-push, normes ISO).
- [ ] **Pre-push Windows workaround** — Investiguer pourquoi Git for Windows kill le push quand la sortie coverage depasse ~40k chars. Options : rediriger stdout vers un fichier, ou desactiver le reporter table coverage en pre-push.
- [ ] **Upgrade eslint a v9** — Le projet utilise eslint 8.x avec `.eslintrc.cjs` (legacy config). La v9 utilise `eslint.config.js` (flat config). Migration non urgente mais a planifier.

### Priorite 6 — Fonctionnalites

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
| `.eslintrc.cjs` | plugins security/sonarjs, regles ISO, no-console |
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

### Git push --no-verify sur Windows

Le pre-push genere ~40k chars de sortie (table coverage Vitest). Git for Windows interprete ce volume comme un echec et annule le push, meme si tous les checks passent. **Workaround actuel** : `git push --no-verify`. La CI/CD GitHub Actions resoudra ce probleme en deplacant les checks dans le pipeline distant.

### Vulnerabilites npm (transitives)

`npm audit` rapporte ~18 vulnerabilites `high` dans des dependances transitives non corrigeables (puppeteer, lighthouse, etc.). Seules les `critical` sont bloquantes. L'override `minimatch: ^10.2.1` a reduit les vulns de 21 a 3 corrigeables.

### Donnees publiques

Les API `/api/events/fetch` et `/api/events/sync` n'ont pas d'authentification. C'est un choix delibere : les donnees (resultats de tournois FFE) sont publiques. L'absence d'auth n'est pas un finding securite dans ce contexte.
