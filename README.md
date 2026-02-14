# Nos Joueurs en Tournoi

Application web Progressive (PWA) pour le suivi en temps réel des résultats des tournois d'échecs FFE, avec choix dynamique du club.

## Vue d'ensemble

Nos Joueurs en Tournoi permet aux responsables de club et aux parents bénévoles de suivre facilement les résultats des joueurs de **n'importe quel club** lors des tournois FFE (Fédération Française des Échecs), avec synchronisation multi-appareils et partage par QR code.

### Fonctionnalités principales

- **Choix dynamique du club** - Détection automatique des clubs depuis la page FFE Stats
- **Scraping automatique** des résultats FFE (parsing HTML optimisé)
- **Affichage filtré** des joueurs du club sélectionné
- **Synchronisation multi-appareils** via Upstash Redis KV
- **Progressive Web App** - Installation sur mobile/desktop
- **Multi-événements** - Gérer plusieurs tournois simultanément
- **Export/Import JSON** - Sauvegarde et partage offline
- **Partage QR Code** - Partage d'événements par scan
- **Interface Cyberpunk** - Design Miami Vice glassmorphism
- **Mode économie d'énergie** - Désactivation animations optionnelle
- **Sauvegarde locale** - localStorage + sync cloud
- **Statistiques automatiques** - Stats club par ronde
- **Responsive** - Mobile-first design

## Stack technique

### Frontend
- **Next.js 16** (App Router + Turbopack)
- **React 19** + **TypeScript 5.5**
- **Tailwind CSS 3.4** - Styling
- **shadcn/ui** - Composants UI
- **Lucide React** - Icônes
- **Sonner** - Toast notifications
- **QRCode.react** - Génération QR codes

### Backend & Infrastructure
- **Vercel Edge Functions** - API Routes
- **Upstash Redis** - KV Storage pour sync
- **Cheerio** - HTML parsing (scraping FFE)
- **Node.js 22.x**

### Stockage
- **localStorage** - Données événements et validations (offline-first)
- **Upstash KV** - Synchronisation cloud optionnelle

## Structure du projet

```
nos-joueurs-en-tournoi/
├── app/
│   ├── layout.tsx               # Root layout (Audiowide + Inter fonts)
│   ├── page.tsx                 # Page principale
│   ├── api/
│   │   ├── scrape/route.ts      # Proxy CORS pour FFE
│   │   ├── events/
│   │   │   ├── sync/route.ts    # Sync Upstash KV
│   │   │   └── fetch/route.ts   # Fetch depuis KV
│   └── manifest.json            # PWA manifest
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── common/
│   │   │   └── FloatingParticles.tsx
│   │   ├── ClubSelector.tsx     # Sélection dynamique du club
│   │   ├── EventForm.tsx        # Formulaire création événement
│   │   ├── EventsManager.tsx    # Gestion multi-événements
│   │   ├── TournamentTabs.tsx   # Onglets tournois (2 phases)
│   │   ├── PlayerTable.tsx      # Tableau joueurs
│   │   ├── ClubStats.tsx        # Stats club + titre événement
│   │   ├── ShareButton.tsx      # Bouton partage global
│   │   ├── ShareEventModal.tsx  # Modal partage QR code
│   │   ├── AnimationsToggle.tsx # Toggle animations (économie batterie)
│   │   ├── DuplicateEventDialog.tsx
│   │   ├── BackgroundPaths.tsx
│   │   └── HalftoneWaves.tsx
│   ├── contexts/
│   │   └── AnimationsContext.tsx # Context global animations
│   ├── lib/
│   │   ├── parser.ts            # Parser HTML FFE (Stats + Ls + Ga)
│   │   ├── storage.ts           # localStorage management + export/import
│   │   ├── sync.ts              # Auto-sync avec Upstash
│   │   ├── kv.ts                # Upstash Redis client
│   │   └── utils.ts             # Utilitaires
│   ├── types/
│   │   └── index.ts             # Types TypeScript (ClubInfo, Event, etc.)
│   └── styles/
│       ├── globals.css          # Styles cyberpunk + .no-animations
│       └── chess-logo.css       # Animations logo
├── public/
│   ├── chess-logo.png           # Logo principal
│   ├── manifest.json            # PWA manifest
│   ├── favicon*.png             # Multiple sizes (16/32/96)
│   └── apple-icon.png           # Apple touch icon
├── .husky/
│   ├── pre-commit               # ESLint check
│   └── pre-push                 # Full build test
├── vitest.config.ts
├── vitest.setup.ts
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── .npmrc                       # legacy-peer-deps=true
└── vercel.json                  # Framework: nextjs + security headers
```

## Installation

### Prérequis
- Node.js >= 22.x
- npm >= 10.x
- Compte Vercel (pour déploiement)
- Upstash Redis KV (optionnel, pour sync)

### Étapes

1. **Cloner le repository**
```bash
git clone https://github.com/pierrealexandreguillemin-a11y/nos-joueurs-en-tournoi.git
cd nos-joueurs-en-tournoi
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration environnement (optionnel)**
```bash
# Créer .env.local pour Upstash sync
KV_REST_API_URL=https://xxx.upstash.io
KV_REST_API_TOKEN=xxx
```

4. **Lancer en développement**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

5. **Build production**
```bash
npm run build
```

## Déploiement Vercel

### Configuration

1. **Connecter à Vercel**
- Aller sur [vercel.com](https://vercel.com)
- Cliquer "Import Project"
- Sélectionner le repository GitHub
- **IMPORTANT**: Choisir branche **`master`** comme Production Branch

2. **Configuration Vercel**
- Framework Preset: **Next.js**
- Root Directory: `.`
- Build Command: `npm run build` (auto-détecté)
- Output Directory: `.next` (auto-détecté)

3. **Connecter Upstash KV Storage (optionnel)**
- Dans Vercel Dashboard > Storage > Create > KV
- Connecter au projet nos-joueurs-en-tournoi
- Les env vars sont ajoutées automatiquement

4. **Déployer**
- Push sur `master` > déploiement automatique
- URL de production: `https://nos-joueurs-en-tournoi.vercel.app`

## Utilisation

### 1. Créer un événement

1. Cliquer sur "Créer un événement"
2. Entrer le nom de l'événement (ex: "Rapide de Salon 11 novembre")
3. Optionnel : entrer le nom du club (sinon détecté automatiquement)
4. Ajouter des tournois :
   - Nom de l'onglet (ex: "U12", "U14")
   - URL FFE résultats
5. Cliquer "Créer l'événement"

### 2. Suivre les résultats (flux en 2 phases)

**Phase 1 - Détection des clubs :**
1. Cliquer "Actualiser" sur un tournoi
2. L'app détecte automatiquement tous les clubs du tournoi via la page FFE Stats
3. Un dropdown apparaît avec la liste des clubs et leur nombre de joueurs

**Phase 2 - Résultats du club :**
4. Sélectionner votre club dans le dropdown
5. L'app charge automatiquement les résultats pour ce club
6. Visualiser :
   - Classement et ELO
   - Résultats par ronde (1/0/0.5)
   - Points cumulés
   - Buchholz et Performance
   - Stats club (total, moyenne)
   - Dernière mise à jour

### 3. Gérer plusieurs événements

1. Cliquer "Gérer les événements"
2. **Changer d'événement** : Cliquer sur un événement dans la liste
3. **Exporter** : Icône Upload > télécharge JSON
4. **Partager** : Icône Share > génère QR code + lien partage
5. **Supprimer** : Icône Trash (confirmation requise)
6. **Importer** : Icône Download > sélectionner fichier JSON

### 4. Partager un événement

**Via QR Code** :
1. Cliquer icône Share sur un événement
2. Scanner le QR code avec un téléphone
3. L'événement s'ouvre automatiquement (le choix du club est inclus)

**Via URL** :
1. Copier le lien de partage
2. L'envoyer par email/SMS
3. Le destinataire importe l'événement en 1 clic

## Architecture technique

### Parser FFE (3 pages)

Le parser utilise **3 pages FFE** :

1. **Action=Stats** : Statistiques du tournoi (liste des clubs)
2. **Action=Ls** : Liste des joueurs avec clubs
3. **Action=Ga** : Grille américaine avec résultats

```typescript
// Phase 1: Détection des clubs
const statsUrl = getStatsUrl(tournament.url);
const clubs = parseStatsClubs(htmlStats);

// Phase 2: Résultats filtrés par club
const listUrl = getListUrl(tournament.url);
const resultsUrl = getResultsUrl(tournament.url);
const { players, currentRound } = parseFFePages(htmlList, htmlResults, clubName);
```

### Stockage localStorage

```typescript
{
  currentEventId: "evt_123",
  events: [
    {
      id: "evt_123",
      name: "Rapide de Salon 11 novembre",
      clubName: "Mon Club",           // club sélectionné
      availableClubs: [               // clubs détectés
        { name: "Mon Club", playerCount: 5 },
        { name: "Autre Club", playerCount: 3 }
      ],
      createdAt: "2025-11-10T...",
      tournaments: [...]
    }
  ],
  validations: { ... }
}
```

### Synchronisation Cloud (Multi-Device)

Via **Upstash Redis** avec contrôle manuel :

| Action | Boutons |
|--------|---------|
| Sauvegarder vers cloud | CloudUpload (dans EventsManager) |
| Récupérer depuis cloud | CloudDownload (header EventsManager) |
| Exporter en local | Upload (par événement) |
| Importer depuis local | Download (header EventsManager) |

## Style UI

L'application utilise le style "Miami Vice" cyberpunk glassmorphism.

### Couleurs
- **Miami Aqua**: `#008E97`
- **Miami Orange**: `#E04500`
- **Miami Navy**: `#013369`

### Typography
- **Audiowide** - Titres principaux (NOS JOUEURS EN TOURNOI, titres événements)
- **Inter** - Corps de texte

### Effets
- **Glassmorphism** : `backdrop-filter: blur(15px) saturate(130%)`
- **Floating Particles** : 30 particules animées (Canvas 2D)
- **Halftone Waves** : Vagues WebGL animées
- **Désactivable** : Mode économie d'énergie

## Scripts disponibles

```bash
# Développement
npm run dev          # Next.js dev server (port 3000)

# Production
npm run build        # Build Next.js
npm run start        # Start production server

# Tests
npm test             # Vitest (142 tests)

# Code quality
npm run lint         # ESLint check

# Déploiement
vercel --prod        # Deploy to production
```

## Qualité du code

### Tests
- **142 tests Vitest** - 6 suites (parser, storage, 4 composants)
- **0 ESLint errors**
- **Git hooks** - pre-commit (lint) + pre-push (build)

### Sécurité
- Validation URLs FFE (whitelist echecs.asso.fr)
- Security headers dans vercel.json
- User-Agent headers (anti-bot FFE)

## Dépannage

### Parser FFE échoue
- Messages d'erreur contextuels :
  - "Tournoi introuvable" (404)
  - "Le serveur FFE rencontre des problèmes" (500)
  - "Aucun club détecté. Le tournoi n'a peut-être pas encore commencé."
  - "Aucun joueur {club} trouvé"
- Regarder la console pour logs détaillés

### Upstash sync ne fonctionne pas
- Vérifier les env vars dans Vercel Dashboard
- Vérifier les logs console `[Upstash Sync]`
- Tester les routes API :
  ```bash
  curl -X POST https://nos-joueurs-en-tournoi.vercel.app/api/events/sync \
    -H "Content-Type: application/json" \
    -d '{"events":[],"validations":{},"currentEventId":""}'

  curl https://nos-joueurs-en-tournoi.vercel.app/api/events/fetch
  ```

### Build errors
```bash
rm -rf node_modules .next
npm install
npm run build
```

## Contribution

### Standards de code
- **TypeScript strict** activé
- **ESLint** configuré (0 errors tolérés)
- Commits conventionnels: `feat:`, `fix:`, `docs:`, `chore:`

### Avant de commit
1. Le build passe : `npm run build`
2. Les tests passent : `npm test`
3. ESLint passe : `npm run lint`

## Licence

Propriétaire - Pierre Alexandre Guillemin

## Support

Pour toute question technique :
- Ouvrir une issue sur GitHub

---

**Status du projet** : PRODUCTION - Next.js 16, PWA, Sync multi-appareils

**URL de production** : https://nos-joueurs-en-tournoi.vercel.app
