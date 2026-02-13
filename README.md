# 🏆 Hay Chess Tracker

Application web Progressive (PWA) pour le suivi en temps réel des résultats des tournois d'échecs FFE pour le club "Hay Chess".

## 📋 Vue d'ensemble

Hay Chess Tracker permet aux responsables de club et aux parents bénévoles de suivre facilement les résultats des joueurs du club lors des tournois FFE (Fédération Française des Échecs), avec synchronisation multi-appareils et partage par QR code.

### Fonctionnalités principales

- ✅ **Scraping automatique** des résultats FFE (parsing HTML optimisé)
- 📊 **Affichage filtré** des joueurs du club uniquement
- 🔄 **Synchronisation multi-appareils** via Upstash Redis KV
- 📱 **Progressive Web App** - Installation sur mobile/desktop
- 🎯 **Multi-événements** - Gérer plusieurs tournois simultanément
- 📤 **Export/Import JSON** - Sauvegarde et partage offline
- 🔗 **Partage QR Code** - Partage d'événements par scan
- 🎨 **Interface Cyberpunk** - Design Miami Vice glassmorphism
- ⚡ **Mode économie d'énergie** - Désactivation animations optionnelle
- 💾 **Sauvegarde locale** - localStorage + sync cloud
- 📈 **Statistiques automatiques** - Stats club par ronde
- 🌐 **Responsive** - Mobile-first design

## 🛠️ Stack technique

### Frontend
- **Next.js 16** (App Router + Turbopack)
- **React 19** + **TypeScript 5.5**
- **Tailwind CSS 3.4** - Styling
- **shadcn/ui** - Composants UI
- **Lucide React 0.553** - Icônes
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

## 📁 Structure du projet

```
hay-chess-tracker/
├── app/
│   ├── layout.tsx               # Root layout (Audiowide + Inter fonts)
│   ├── page.tsx                 # Page principale
│   ├── api/
│   │   ├── scrape/route.ts      # Proxy CORS pour FFE
│   │   ├── events/
│   │   │   ├── sync/route.ts    # Sync Upstash KV
│   │   │   └── fetch/route.ts   # Fetch depuis KV
│   └── manifest.json            # PWA manifest (2024 standards)
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── common/
│   │   │   └── FloatingParticles.tsx
│   │   ├── EventForm.tsx        # Formulaire création événement
│   │   ├── EventsManager.tsx    # Gestion multi-événements
│   │   ├── TournamentTabs.tsx   # Onglets tournois
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
│   │   ├── parser.ts            # Parser HTML FFE (deduplicate players)
│   │   ├── storage.ts           # localStorage management + export/import
│   │   ├── sync.ts              # Auto-sync avec Upstash
│   │   ├── kv.ts                # Upstash Redis client
│   │   └── utils.ts             # Utilitaires
│   ├── types/
│   │   └── index.ts             # Types TypeScript
│   └── styles/
│       ├── globals.css          # Styles cyberpunk + .no-animations
│       └── chess-logo.css       # Animations logo
├── docs/                        # Documentation technique
│   ├── architecture/
│   │   ├── API.md               # Documentation API
│   │   ├── ARCHITECTURE.md      # Architecture système
│   │   └── FFE-PARSER-REFERENCE.md # Référence parser FFE
│   ├── deployment/
│   │   ├── DEPLOYMENT.md        # Guide déploiement
│   │   ├── SECURITY.md          # Sécurité
│   │   └── UPSTASH-REDIS-SETUP.md # Configuration Redis
│   └── guides/
│       ├── CHECKLIST_TESTS_NORMES.md # Checklist tests
│       ├── GUIDE-RESPONSABLE-CLUB.md # Guide utilisateur
│       ├── IMPLEMENTATION-QUICK-WINS.md # Quick wins
│       ├── ROADMAP_TESTS.md     # Roadmap tests
│       ├── SESSION-NOTES.md     # Notes sessions
│       ├── SOLUTIONS-PARTAGE.md # Solutions partage
│       └── TOURNOIS-A-SUIVRE.md # Tournois à suivre
├── public/
│   ├── chess-logo.png           # Logo principal
│   ├── favicon*.png             # Multiple sizes (16/32/96)
│   └── apple-icon.png           # Apple touch icon
├── .husky/
│   ├── pre-commit               # ESLint check
│   └── pre-push                 # Full build test
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── .npmrc                       # legacy-peer-deps=true
└── vercel.json                  # Framework: nextjs
```

## 🚀 Installation

### Prérequis
- Node.js >= 22.x
- npm >= 10.x
- Compte Vercel (pour déploiement)
- Upstash Redis KV (optionnel, pour sync)

### Étapes

1. **Cloner le repository**
```bash
git clone https://github.com/pierrealexandreguillemin-a11y/hay-chess-tracker.git
cd hay-chess-tracker
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

## 🌐 Déploiement Vercel

### Configuration automatique

1. **Push sur GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin master
```

2. **Connecter à Vercel**
- Aller sur [vercel.com](https://vercel.com)
- Cliquer "Import Project"
- Sélectionner le repository GitHub
- **IMPORTANT**: Choisir branche **`master`** comme Production Branch

3. **Configuration Vercel**
- Framework Preset: **Next.js** (PAS Vite!)
- Root Directory: `.`
- Build Command: `npm run build` (auto-détecté)
- Output Directory: `.next` (auto-détecté)
- Install Command: `npm install`

4. **Connecter Upstash KV Storage (optionnel)**
- Dans Vercel Dashboard → Storage → Create → KV
- Connecter au projet hay-chess-tracker
- Les env vars sont ajoutées automatiquement

5. **Déployer**
- Push sur `master` → déploiement automatique
- URL de production: `https://hay-chess-tracker.vercel.app`

## 📖 Utilisation

### 1. Créer un événement

1. Cliquer sur "Nouvel événement"
2. Entrer le nom de l'événement (ex: "Rapide de Salon 11 novembre")
3. Ajouter des tournois :
   - Nom de l'onglet (ex: "A", "B", "C")
   - URL FFE résultats (format `Action=Ga`)
4. Cliquer "Créer l'événement"

### 2. Suivre les résultats

1. Le titre de l'événement s'affiche en **Audiowide** dans la card Stats Club
2. Sélectionner un onglet tournoi
3. Cliquer "Actualiser" pour charger les résultats FFE
4. Les joueurs "Hay Chess" sont automatiquement filtrés
5. Visualiser :
   - Classement et ELO
   - Résultats par ronde (V/D/N)
   - Points cumulés
   - Buchholz et Performance
   - Stats club (total, moyenne)
   - Dernière mise à jour

### 3. Gérer plusieurs événements

1. Cliquer "Gérer les événements"
2. **Changer d'événement** : Cliquer sur un événement dans la liste
3. **Exporter** : Icône Upload → télécharge JSON
4. **Partager** : Icône Share → génère QR code + lien partage
5. **Supprimer** : Icône Trash (confirmation requise)
6. **Importer** : Icône Download → sélectionner fichier JSON
   - Si doublon détecté : choisir "Remplacer" ou "Conserver les deux"

### 4. Partager un événement

**Via QR Code** :
1. Cliquer icône Share sur un événement
2. Scanner le QR code avec un téléphone
3. L'événement s'ouvre automatiquement

**Via URL** :
1. Copier le lien de partage
2. L'envoyer par email/SMS
3. Le destinataire importe l'événement en 1 clic

### 5. Économiser la batterie

1. Cliquer sur l'icône ⚡ (à gauche du bouton Partager)
2. Les animations sont désactivées (particules, glows, transitions)
3. Re-cliquer pour réactiver

## 🔧 Architecture technique

### Parser FFE

Le parser nécessite **2 pages FFE** :

1. **Action=Ls** : Liste des joueurs avec clubs
2. **Action=Ga** : Grille américaine avec résultats

```typescript
// 1. Fetch via API route (proxy CORS)
const listUrl = getListUrl(tournament.url);
const resultsUrl = getResultsUrl(tournament.url);

const [responseList, responseResults] = await Promise.all([
  fetch('/api/scrape', {
    method: 'POST',
    body: JSON.stringify({ url: listUrl })
  }),
  fetch('/api/scrape', {
    method: 'POST',
    body: JSON.stringify({ url: resultsUrl })
  })
]);

// 2. Parse et croisement + déduplication
const { players, currentRound } = parseFFePages(htmlList, htmlResults);
```

### Déduplication joueurs

Un joueur peut apparaître plusieurs fois dans le HTML FFE. Le parser déduplique par nom :

```typescript
const seenNames = new Set<string>();
const players = playersRaw.filter(player => {
  if (seenNames.has(player.name)) {
    return false; // Skip duplicate
  }
  seenNames.add(player.name);
  return true;
});
```

### Stockage localStorage

```typescript
{
  currentEventId: "evt_123",
  events: [
    {
      id: "evt_123",
      name: "Rapide de Salon 11 novembre",
      createdAt: "2025-11-10T...",
      tournaments: [
        {
          id: "tour_456",
          name: "Tournoi A",
          url: "https://...",
          players: [...],
          lastUpdate: "2025-11-10T..."
        }
      ]
    }
  ]
}
```

### Synchronisation Cloud (Multi-Device)

La synchronisation multi-appareils est disponible via **Upstash Redis** avec contrôle manuel à la demande.

#### Fonctionnement

1. **Synchronisation manuelle** : Via boutons dans EventsManager modal
   - 📥 **Download** (header) : Import depuis fichier JSON local
   - ☁️↓ **CloudDownload** (header) : Télécharger depuis Upstash Redis
   - 📤 **Upload** (par événement) : Export vers fichier JSON local
   - ☁️↑ **CloudUpload** (par événement) : Envoyer tous les événements vers Upstash Redis

2. **Stratégie de merge** :
   - Les événements distants sont prioritaires lors du download cloud
   - Les événements locaux non-synchronisés sont ajoutés
   - Les validations sont fusionnées (union)
   - Le currentEventId distant est prioritaire

3. **Workflows typiques** :

| Action | Boutons à utiliser |
|--------|-------------------|
| Sauvegarder vers cloud | ☁️↑ CloudUpload (dans EventsManager) |
| Récupérer depuis cloud | ☁️↓ CloudDownload (header EventsManager) |
| Exporter en local | 📤 Upload (par événement) |
| Importer depuis local | 📥 Download (header EventsManager) |

#### Configuration Vercel

Les variables d'environnement sont **automatiquement configurées** lors de la connexion d'Upstash KV :

1. **Via Vercel Dashboard** :
   - Storage → Create → KV
   - Connecter au projet `hay-chess-tracker`
   - Variables ajoutées automatiquement :
     - `KV_REST_API_URL`
     - `KV_REST_API_TOKEN`

2. **Détection automatique** :
```typescript
// src/lib/kv.ts (ligne 5)
const kv = Redis.fromEnv(); // Auto-détecte les env vars
```

#### Logs de debug

Tous les logs sont préfixés `[Upstash Sync]` pour faciliter le debug en console :

```
[Upstash Sync] Starting upload... { eventsCount: 3, validationsCount: 5, ... }
[Upstash Sync] ✅ Upload successful: 3 events synced
[Upstash Sync] Starting download...
[Upstash Sync] Merging data... { remoteEvents: 3, localEvents: 3 }
[Upstash Sync] ✅ Download successful: 3 total events after merge
```

#### Workflow multi-device

1. **Device A** : Créer un événement → cliquer ☁️↑ CloudUpload
2. **Device B** : Ouvrir l'app → cliquer ☁️↓ CloudDownload → événement apparaît
3. **Vérifier Upstash Dashboard** :
   - Aller sur [upstash.com](https://console.upstash.com)
   - Database → `hay-chess-tracker:events`
   - Voir les données synchronisées

#### Fallback offline

- Si Upstash n'est pas disponible, l'app continue de fonctionner en mode **offline-first**
- Les données restent dans localStorage
- La sync cloud est accessible dès que la connexion revient

## 🎨 Style Cyberpunk UI

L'application utilise le style "Miami Vice" cyberpunk glassmorphism.

### Couleurs
- **Miami Aqua**: `#008E97` (bleu turquoise)
- **Miami Orange**: `#E04500` (orange vif)
- **Miami Navy**: `#013369` (bleu marine)

### Typography
- **Audiowide** - Titres principaux (HAY CHESS TRACKER, titres événements)
- **Inter** - Corps de texte

### Effets
- **Glassmorphism** : `backdrop-filter: blur(15px) saturate(130%)`
- **Gradient text** : `background: linear-gradient(90deg, #00A8CC, #E04500)` + `bg-clip-text`
- **Floating Particles** : 30 particules animées (Canvas 2D)
- **Halftone Waves** : Vagues WebGL animées
- **Background Paths** : Chemins SVG animés
- **Chess Logo** : Animation pulse + glow + rotation au hover
- **Désactivable** : Classe `.no-animations` pour économie batterie

## 📝 Scripts disponibles

```bash
# Développement
npm run dev          # Next.js dev server (port 3000)

# Production
npm run build        # Build Next.js
npm run start        # Start production server

# Code quality
npm run lint         # ESLint check

# Git hooks (automatiques)
npm run prepare      # Installer Husky
# Pre-commit: ESLint
# Pre-push: Full build test

# Vercel
vercel --prod        # Deploy to production
vercel inspect       # Inspecter un déploiement
```

## ✅ Qualité du code

### Tests
- ⚠️ **Tests à migrer** - Suite de tests Vitest à migrer vers Jest (Next.js)
- ✅ **0 ESLint errors** - 4 warnings seulement (fast-refresh)
- ✅ **Git hooks** - pre-commit (lint) + pre-push (build)

### Sécurité
- ✅ **0 vulnérabilités npm** en production
- ✅ Validation URLs FFE (whitelist echecs.asso.fr)
- ✅ User-Agent headers (anti-bot FFE)
- TODO: Rate limiting API scrape
- TODO: Headers sécurité CSP

### Performance
- ✅ **Next.js 16 Turbopack** - Build ultra-rapide
- ✅ **Static pages** - Homepage prérendue
- ✅ **Server-side scraping** - Pas de CORS client-side
- ⚠️ **Animations lourdes** - Mode économie d'énergie disponible
- TODO: Lazy loading des composants visuels

### Robustesse
- ✅ **Parser FFE testé** sur vraies pages FFE
- ✅ **Déduplication joueurs** (fix KOCH DAMIEN)
- ✅ **Gestion erreurs** - Messages contextuels
- ✅ **Offline-first** - localStorage + sync optionnelle
- TODO: Retry logic sur échecs réseau
- TODO: Logging/monitoring production

## 🐛 Dépannage

### Erreur "No Output Directory named 'dist' found"
- **Cause** : Vercel déploie la mauvaise branche ou Framework Preset = Vite
- **Solution** :
  1. Aller dans Vercel → Settings → Git
  2. Changer Production Branch → `master`
  3. Framework Preset → `Next.js` (PAS Vite!)
  4. Redéployer

### Erreur "WebGL2 not supported"
- HalftoneWaves nécessite WebGL2
- Si navigateur trop ancien, le composant ne s'affiche pas (graceful degradation)
- Désactiver les animations avec le bouton ⚡

### localStorage plein
- Limite: 5-10MB selon navigateur
- Solution:
  1. Exporter les événements importants (JSON)
  2. Supprimer les vieux événements
  3. Réimporter si besoin

### Parser FFE échoue
- Vérifier que l'URL contient `Action=Ga`
- Vérifier structure HTML FFE (peut changer)
- Messages d'erreur contextuels :
  - "Tournoi introuvable" (404)
  - "Le serveur FFE rencontre des problèmes" (500)
  - "Aucun joueur trouvé. Le tournoi n'a peut-être pas encore commencé."
- Regarder la console pour logs détaillés

### Upstash sync ne fonctionne pas
- **Vérifier les env vars** : Vercel Dashboard → Settings → Environment Variables
  - `KV_REST_API_URL` doit être présent
  - `KV_REST_API_TOKEN` doit être présent
- **Vérifier Upstash KV** : Dashboard → Storage → doit voir une instance KV connectée
- **Vérifier les logs console** : Rechercher `[Upstash Sync]` pour voir les erreurs
- **Tester les routes API** :
  ```bash
  # Upload test
  curl -X POST https://hay-chess-tracker.vercel.app/api/events/sync \
    -H "Content-Type: application/json" \
    -d '{"events":[],"validations":{},"currentEventId":""}'

  # Download test
  curl https://hay-chess-tracker.vercel.app/api/events/fetch
  ```
- **Fallback** : Si la sync échoue, l'app continue en mode offline avec localStorage

### Build errors
```bash
# Nettoyer et réinstaller
rm -rf node_modules .next
npm install
npm run build
```

## 🤝 Contribution

### Standards de code
- **TypeScript strict** activé
- **ESLint** configuré (0 errors tolérés)
- **Prettier** recommandé
- Commits conventionnels: `feat:`, `fix:`, `docs:`, `chore:`

### Avant de commit
1. ✅ Le build passe : `npm run build`
2. ✅ ESLint passe : `npm run lint`
3. ✅ Tester manuellement les fonctionnalités
4. ✅ Les hooks git s'exécutent automatiquement

### Branches
- **`master`** - Production (protected)
- Supprimer les branches après merge

## 📄 Licence

Propriétaire - Hay Chess Club

## 📧 Support

Pour toute question technique :
- Ouvrir une issue sur GitHub
- Contacter le responsable technique du club

---

**Status du projet** : ✅ PRODUCTION - Next.js 16, PWA, Sync multi-appareils

**Dernière mise à jour** : 10 Novembre 2025

**URL de production** : https://hay-chess-tracker.vercel.app
