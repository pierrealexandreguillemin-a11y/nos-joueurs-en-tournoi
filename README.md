# Nos Joueurs en Tournoi

Application de suivi en temps reel des tournois d'echecs FFE (Federation Francaise des Echecs).
Choisissez votre club, suivez vos joueurs, validez les resultats ronde par ronde.

**Production** : https://nos-joueurs-en-tournoi.vercel.app

## Fonctionnalites

- **Choix dynamique du club** : detection automatique des clubs depuis la page FFE Stats
- **Scraping automatique** des resultats FFE (parsing HTML optimise via Cheerio)
- **Appariements en direct** : numero de table, couleur (Blancs/Noirs), adversaire, elo adversaire
- **Affichage filtre** des joueurs du club selectionne
- **Synchronisation multi-appareils** via Upstash Redis KV
- **Multi-evenements** : gerer plusieurs tournois simultanement
- **Partage QR Code** : partage d'evenements par scan ou lien URL
- **Export/Import JSON** : sauvegarde et partage offline
- **Validation par ronde** : cocher les resultats verifies
- **Statistiques club** : total points, moyenne, par ronde
- **Interface Miami Vice** : glassmorphism, animations desactivables
- **Responsive** : mobile-first design

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 3, Radix UI, Framer Motion |
| Langage | TypeScript 5 (strict mode) |
| Validation | Zod 4 |
| Storage client | localStorage (namespace par club) |
| Storage serveur | Upstash Redis (`@upstash/redis`) |
| Rate limiting | `@upstash/ratelimit` (sliding window, persistant) |
| Auth API | HMAC-SHA256 avec anti-replay (5 min) |
| Analytics | Vercel Analytics (Core Web Vitals) |
| Tests | Vitest 4, Testing Library, jsdom |
| Linting | ESLint 9 (flat config, security, sonarjs, typescript-eslint) |
| CI | Husky pre-push (6 quality gates) |
| Deploy | Vercel (auto-deploy on push) |

## Demarrage rapide

### Prerequis

- Node.js >= 22.x
- npm >= 10.x

### Installation

```bash
git clone https://github.com/pierrealexandreguillemin-a11y/nos-joueurs-en-tournoi.git
cd nos-joueurs-en-tournoi
npm install
npm run dev
# Ouvrir http://localhost:3000
```

### Variables d'environnement

Copier `.env.example` vers `.env.local` et remplir :

| Variable | Requis | Description |
|----------|--------|-------------|
| `KV_REST_API_URL` | Production | URL Upstash Redis |
| `KV_REST_API_TOKEN` | Production | Token Upstash Redis |
| `NEXT_PUBLIC_SYNC_SECRET` | Production | Secret HMAC (expose cote client par design, voir `src/lib/hmac.ts`) |

En dev local, l'app fonctionne sans variables (fallback localStorage, pas de rate limiting).

## Scripts

| Commande | Action |
|----------|--------|
| `npm run dev` | Serveur de developpement (Turbopack) |
| `npm run build` | Build production |
| `npm run start` | Serveur production |
| `npm run lint` | ESLint (ts, tsx) |
| `npm test` | Vitest en mode watch |
| `npm run test:coverage` | Tests + couverture (seuils: 70/60/70/70) |
| `npm run test:e2e` | Tests E2E (Puppeteer + Chromium) |
| `npm run typecheck` | Verification TypeScript strict |
| `npm run duplication` | Detection code duplique (seuil 5%) |
| `npm run analyze` | Analyse du bundle (ouvre rapport navigateur) |

## Architecture

```
app/
  layout.tsx              # Root layout (SEO, fonts, providers, analytics)
  page.tsx                # Page principale (SPA client-side)
  robots.ts               # robots.txt dynamique
  sitemap.ts              # sitemap.xml dynamique
  api/
    scrape/route.ts       # Proxy FFE scraping (SSRF-protected)
    events/
      sync/route.ts       # POST sync events vers Redis (HMAC + Zod + 1MB limit)
      fetch/route.ts      # GET fetch events depuis Redis (Zod slug validation)

src/
  components/
    ui/                   # Primitives UI (button, card, dialog, table, etc.)
    common/               # Composants partages (FloatingParticles, MiamiGlass, ShimmerEffect)
    PlayerTable.tsx       # Table des joueurs (React.memo optimized)
    TournamentTabs.tsx    # Onglets par tournoi (2 phases: clubs -> resultats)
    ViewToggle.tsx        # Toggle segmente Resultats / Appariements (aria-pressed)
    PairingsTable.tsx     # Table appariements du club (table, couleur, adversaire, elo)
    EventForm.tsx         # Formulaire creation evenement (lazy-loaded)
    EventsManager.tsx     # Gestion multi-evenements + sync cloud
    ShareEventModal.tsx   # Partage par QR code (lazy-loaded)
    DuplicateEventDialog.tsx # Dialog import doublon (lazy-loaded)
    ClubSelector.tsx      # Selection du club FFE
    ClubStats.tsx         # Statistiques par club et par ronde
    ClubOnboarding.tsx    # Ecran premier lancement
    ClubHeader.tsx        # Affichage club courant
    ShareButton.tsx       # Bouton partage global
    AnimationsToggle.tsx  # Toggle animations (economie batterie)
    BackgroundPaths.tsx   # Fond anime SVG
    HalftoneWaves.tsx     # Vagues WebGL
  contexts/
    ClubContext.tsx        # Identity club (slug, nom, persistence)
    AnimationsContext.tsx  # Toggle animations (preference utilisateur)
  hooks/
    useTournamentSync.ts  # Hook principal sync/refresh (Ctrl+R, fetch, commit)
  lib/
    hmac.ts               # HMAC-SHA256 token (anti-replay, clock-skew tolerance)
    schemas.ts            # Schemas Zod (validation API routes)
    validation.ts         # Regles metier (SLUG_REGEX, URLs FFE, noms)
    kv.ts                 # Client Redis namespace par club
    sync.ts               # Sync localStorage <-> Upstash (merge strategy)
    storage.ts            # Facade storage (re-exports core + share)
    storage-core.ts       # CRUD localStorage namespace par club
    storage-share.ts      # Encode/decode events pour partage URL (lz-string)
    parser.ts             # Parser HTML FFE (Stats, Ls, Ga, Rondes) via Cheerio
    scraper.ts            # Orchestration scraping FFE (error handling)
    club.ts               # Slugify, identity, migration legacy
    calculations.ts       # Calculs points, performance, Buchholz, tri
    formatters.ts         # Formatage affichage (noms, elo, scores, dates)
    random.ts             # Generateur aleatoire securise (crypto.getRandomValues)
    utils.ts              # cn() (clsx + tailwind-merge)
  types/
    index.ts              # Interfaces TypeScript (Event, Player, Tournament, Pairing, etc.)

proxy.ts                  # Rate limiting middleware (Next.js 16 convention)
vercel.json               # Headers securite (CSP, HSTS, CORS)
vitest.config.ts          # Config tests unitaires
vitest.config.e2e.ts      # Config tests E2E
vitest.setup.ts           # Setup jsdom + localStorage polyfill
```

## Tests

**531 tests** repartis dans **25 fichiers**. Framework : Vitest 4 + Testing Library + jsdom.

### Lancer les tests

```bash
npm test                  # Mode watch
npx vitest run            # Single run (CI)
npm run test:coverage     # Avec couverture
```

### Seuils de couverture

| Metrique | Seuil |
|----------|-------|
| Statements | 70% |
| Branches | 60% |
| Functions | 70% |
| Lines | 70% |

### Inventaire complet

#### Bibliotheques (`src/lib/`)

| Fichier | Tests | Couverture |
|---------|-------|------------|
| `hmac.test.ts` | 16 | Generation, verification, anti-replay 5 min, clock skew 10s, crypto.subtle check |
| `schemas.test.ts` | 28 | Schemas Zod : clubSlug, result, player, tournament, pairing, event, syncBody |
| `validation.test.ts` | 46 | URLs FFE, noms evenements/tournois, SLUG_REGEX (8 patterns) |
| `storage.test.ts` | 56 | CRUD, export/import, isolation inter-clubs, BVA limites, share URL encode/decode |
| `kv.test.ts` | 21 | Namespace KV, isolation clubs, key generation, edge cases |
| `club.test.ts` | 25 | Slugify determinisme, accents, BVA longueur, migration legacy, identity |
| `calculations.test.ts` | 34 | Points, performance, Buchholz, tri, moyenne elo, stats resultats |
| `formatters.test.ts` | 28 | Formatage noms, elo, scores, pourcentages, dates, club, ronde |
| `parser.test.ts` | 46 | Parser HTML FFE (Stats, Ls, Ga, Rondes), clubs, resultats, appariements, filterClubPairings |
| `sync.test.ts` | 13 | Sync Upstash POST/GET, merge strategy, error paths |
| `scraper.test.ts` | 8 | Scraping FFE, erreurs contextuelles |
| `utils.test.ts` | 11 | Merge class names, gestion Tailwind conflicts |
| `random.test.ts` | 7 | Distribution, unicite, plage [0,1) |

#### Composants (`src/components/`)

| Fichier | Tests | Couverture |
|---------|-------|------------|
| `PlayerTable.test.tsx` | 24 | Rendu table, headers dynamiques, rondes, validation checkboxes, persistence, edge cases |
| `EventForm.test.tsx` | 30 | Formulaire, ajout/suppression tournois, validation URL FFE, soumission, edge cases |
| `TournamentTabs.test.tsx` | 32 | Onglets, refresh 2 phases, changement club, dialog confirmation, appariements toggle, etats vides |
| `ViewToggle.test.tsx` | 11 | Toggle Resultats/Appariements, aria-pressed, focus-visible, badge, disabled, tooltip |
| `PairingsTable.test.tsx` | 11 | Table appariements, badges couleur, scope col, resultat/exempt/a-jouer, etat vide |
| `ClubStats.test.tsx` | 10 | Statistiques club par ronde |
| `ClubSelector.test.tsx` | 4 | Selection club dans dropdown |

#### Hooks

| Fichier | Tests | Couverture |
|---------|-------|------------|
| `useTournamentSync.test.ts` | 27 | Etat initial, identity null, refresh fetchClubs/fetchResults, selection club, Ctrl+R, appariements, persistence |

#### Integration

| Fichier | Tests | Couverture |
|---------|-------|------------|
| `integration.test.ts` | 4 | Workflow complet : slug -> save -> retrieve -> isolation verifiee |

#### API Routes

| Fichier | Tests | Couverture |
|---------|-------|------------|
| `scrape/route.test.ts` | 8 | Validation URL, prevention SSRF (whitelist hostname) |
| `events/routes.test.ts` | 16 | Sync/fetch, validation slug Zod, HMAC verification, body size 1MB |

#### Middleware

| Fichier | Tests | Couverture |
|---------|-------|------------|
| `proxy.test.ts` | 6 | Rate limiting 429, pass-through, fail-open Redis, extraction IP (x-forwarded-for, x-real-ip) |

### Conventions de test

- **Co-localisation** : `foo.test.ts` a cote de `foo.ts`
- **API routes** : `__tests__/` dans le dossier de la route
- **Nommage describe** : nom du module ou composant
- **Nommage it** : phrase descriptive (anglais ou francais)
- **Mocks** : `vi.mock()` pour dependances externes uniquement
- **Timers** : `vi.useFakeTimers()` + `vi.setSystemTime()` (pas `advanceTimersByTime` negatif)
- **DOM** : jsdom + Testing Library (`render`, `screen`, `userEvent`)
- **Pas de snapshots** : assertions explicites uniquement

## Securite

| Mesure | Implementation | Reference |
|--------|---------------|-----------|
| CSP | `default-src 'self'`, `frame-ancestors 'none'`, connect-src whitelist | `vercel.json` |
| HSTS | `max-age=63072000; includeSubDomains; preload` | `vercel.json` |
| CORS | Origin unique sur `/api/*` | `vercel.json` |
| Rate limiting | Upstash sliding window (30/min scrape, 10/min events) | `proxy.ts` |
| HMAC | SHA-256 + timestamp anti-replay (5 min, tolerance 10s) | `src/lib/hmac.ts` |
| SSRF | Whitelist `echecs.asso.fr` sur `/api/scrape` | `app/api/scrape/route.ts` |
| Body limit | 1 MB max sur POST `/api/events/sync` | `app/api/events/sync/route.ts` |
| Validation | Zod schemas strictes sur toutes les API routes | `src/lib/schemas.ts` |
| Headers | X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy | `vercel.json` |
| Fail-open | Rate limiter laisse passer si Redis indisponible | `proxy.ts` |

## Quality gates (pre-push)

Chaque `git push` execute automatiquement 6 controles (`.husky/pre-push`) :

| # | Controle | Norme | Commande |
|---|----------|-------|----------|
| 1 | TypeScript | ISO 5055 Reliability | `tsc --noEmit` |
| 2 | ESLint 0 warnings | ISO 5055 Maintainability | `eslint src app --max-warnings 0` |
| 3 | Build production | - | `next build` |
| 4 | Duplication < 5% | ISO 5055 Maintainability | `jscpd --threshold 5` |
| 5 | 0 vuln critique | OWASP A06 | `npm audit` (parse JSON, bloque sur critical) |
| 6 | Tests + couverture | ISO 25010 Testability | `vitest run --coverage` |

## Utilisation

### 1. Premier lancement

L'ecran d'onboarding demande le nom du club. Ce nom est slugifie (`"Hay Chess"` -> `"hay-chess"`) et sert de namespace pour isoler les donnees localStorage et Redis.

### 2. Creer un evenement

1. Cliquer "Creer un evenement"
2. Entrer le nom (min 3 caracteres)
3. Ajouter des tournois (nom + URL FFE `echecs.asso.fr`)
4. Valider

### 3. Suivre les resultats (2 phases)

**Phase 1 — Detection des clubs** : cliquer "Actualiser" -> l'app scrape la page FFE Stats -> dropdown des clubs detectes

**Phase 2 — Resultats et appariements** : selectionner votre club -> l'app charge les resultats filtres (Ls + Ga) et les appariements de la ronde en cours ou suivante. Un toggle "Resultats | Appariements" permet de basculer entre les deux vues.

### 4. Partager

- **QR Code** : bouton Share -> scanner
- **Lien URL** : copier le lien (encode lz-string dans `?share=`)
- **JSON** : export/import fichier

## Parser FFE

Le parser utilise 4 types de pages FFE (Federation Francaise des Echecs) :

| Page | Action | Donnees |
|------|--------|---------|
| Stats | `Action=Stats` | Liste des clubs + nombre de joueurs |
| Liste | `Action=Ls` | Joueurs avec club d'appartenance |
| Grille americaine | `Action=Ga` | Resultats par ronde, Buchholz, performance |
| Ronde | `Action=01..09` | Appariements : table, blancs/noirs, elo, resultat |

## Style UI

- **Palette** : Miami Aqua `#008E97`, Miami Orange `#E04500`, Miami Navy `#013369`
- **Typographie** : Audiowide (titres), Inter (corps)
- **Effets** : Glassmorphism (`backdrop-filter: blur(15px) saturate(130%)`), floating particles, halftone waves
- **Animations** : desactivables via toggle (economie batterie)

## Navigateurs supportes

```
last 2 Chrome versions
last 2 Firefox versions
last 2 Safari versions
last 2 Edge versions
```

## Depannage

### Parser FFE echoue

Messages d'erreur contextuels :
- "Tournoi introuvable" (404)
- "Le serveur FFE rencontre des problemes" (500)
- "Aucun club detecte. Le tournoi n'a peut-etre pas encore commence."
- "Aucun joueur {club} trouve"

### Sync ne fonctionne pas

- Verifier `KV_REST_API_URL` et `KV_REST_API_TOKEN` dans Vercel Dashboard > Settings > Environment Variables
- Verifier les logs console `[Upstash Sync]`

### Build errors

```bash
rm -rf node_modules .next
npm install
npm run build
```

## Licence

Projet prive — Pierre Alexandre Guillemin
