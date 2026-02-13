# 🎯 AUDIT PERFORMANCE & ACCESSIBILITÉ - HAY CHESS TRACKER

**Objectif**: Atteindre 95+ sur tous les scores Lighthouse (Performance, Accessibilité, Best Practices, SEO)

---

## 📋 INSTRUCTIONS STRICTES CLAUDE.AI

### ⚠️ RÈGLES ABSOLUES

1. **ZÉRO ERREUR TOLÉRÉE** - Le code doit être 100% fonctionnel
2. **TESTS REQUIS** - Valider chaque modification avec `npm run build` et `npm run lint`
3. **NORMES STRICTES** - TypeScript strict mode + ESLint + Next.js 16 best practices
4. **DOCUMENTATION** - Commenter chaque optimisation avec le score gagné
5. **COMMIT ATOMIQUE** - Un commit par catégorie d'optimisation

---

## 🔍 PHASE 1 - DIAGNOSTIC INITIAL

### Script d'analyse automatique

Créer le fichier: `scripts/lighthouse-audit.js`

```javascript
#!/usr/bin/env node
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: 'json',
    port: chrome.port,
  };

  const runnerResult = await lighthouse(url, options);
  await chrome.kill();

  const { lhr } = runnerResult;

  const scores = {
    performance: Math.round(lhr.categories.performance.score * 100),
    accessibility: Math.round(lhr.categories.accessibility.score * 100),
    bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
    seo: Math.round(lhr.categories.seo.score * 100),
  };

  console.log('📊 LIGHTHOUSE SCORES:');
  console.log(`Performance:     ${scores.performance}/100`);
  console.log(`Accessibility:   ${scores.accessibility}/100`);
  console.log(`Best Practices:  ${scores.bestPractices}/100`);
  console.log(`SEO:            ${scores.seo}/100`);

  // Extraire les opportunités d'amélioration
  const opportunities = lhr.audits;
  const improvements = [];

  for (const [key, audit] of Object.entries(opportunities)) {
    if (audit.score !== null && audit.score < 1) {
      improvements.push({
        category: audit.title,
        impact: audit.numericValue,
        description: audit.description,
        recommendations: audit.details?.items || []
      });
    }
  }

  await fs.writeFile(
    'lighthouse-report.json',
    JSON.stringify({ scores, improvements }, null, 2)
  );

  return { scores, improvements };
}

// Lancer sur localhost:3000
const url = process.argv[2] || 'http://localhost:3000';
runLighthouse(url).then(({ scores }) => {
  const allAbove95 = Object.values(scores).every(score => score >= 95);
  process.exit(allAbove95 ? 0 : 1);
});
```

**Installation**:
```bash
npm install --save-dev lighthouse chrome-launcher
```

**Exécution**:
```bash
# Lancer le serveur de dev
npm run dev &

# Attendre 5 secondes
sleep 5

# Lancer l'audit
node scripts/lighthouse-audit.js http://localhost:3000
```

---

## 🚀 PHASE 2 - OPTIMISATIONS PERFORMANCE

### 2.1 Images (Target: +15 points)

**Checklist obligatoire**:
- [ ] Toutes les images utilisent Next.js Image component
- [ ] Format WebP avec fallback
- [ ] Lazy loading activé
- [ ] Attributs width/height explicites
- [ ] Placeholder blur pour CLS

**Template de correction**:
```tsx
// ❌ AVANT
<img src="/logo.png" alt="Logo" />

// ✅ APRÈS
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={100}
  placeholder="blur"
  blurDataURL="data:image/png;base64,iVBORw0KG..."
  loading="lazy"
/>
```

### 2.2 Fonts (Target: +10 points)

**Fichier**: `app/layout.tsx`

```tsx
// Ajouter display: 'swap' et preload
import { Inter, Audiowide } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // ✅ Évite FOIT
  preload: true,   // ✅ Précharge
  fallback: ['system-ui', 'arial'], // ✅ Fallback
});

const audiowide = Audiowide({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['cursive'],
});
```

### 2.3 Bundle Size (Target: +20 points)

**Créer**: `next.config.js` optimizations

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compression
  compress: true,

  // Tree shaking optimisé
  swcMinify: true,

  // Analyse du bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Framer Motion séparé (gros bundle)
          framer: {
            name: 'framer',
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            priority: 40,
          },
          // Radix UI séparé
          radix: {
            name: 'radix',
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            priority: 30,
          },
        },
      };
    }
    return config;
  },

  // Headers de cache agressifs
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 2.4 Code Splitting (Target: +15 points)

**Fichier**: `src/components/TournamentTabs.tsx`

```tsx
// Importer dynamiquement les composants lourds
import dynamic from 'next/dynamic';

const EventsManager = dynamic(() => import('./EventsManager'), {
  loading: () => <div className="animate-pulse">Chargement...</div>,
  ssr: false, // Client-only si nécessaire
});

const PlayerTable = dynamic(() => import('./PlayerTable'), {
  loading: () => <TableSkeleton />,
});
```

---

## ♿ PHASE 3 - ACCESSIBILITÉ (Target: 100/100)

### 3.1 Semantic HTML

**Checklist WCAG 2.1 AA**:
- [ ] Tous les boutons ont aria-label ou texte visible
- [ ] Toutes les images ont alt descriptif
- [ ] Structure heading logique (h1 > h2 > h3)
- [ ] Form labels associés aux inputs
- [ ] Focus visible sur tous les éléments interactifs
- [ ] Contraste couleurs ≥ 4.5:1

**Script de validation**:
```bash
npm install --save-dev axe-core
```

**Créer**: `scripts/a11y-check.js`

```javascript
const { AxePuppeteer } = require('@axe-core/puppeteer');
const puppeteer = require('puppeteer');

async function runA11yTest() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');

  const results = await new AxePuppeteer(page).analyze();

  console.log('♿ ACCESSIBILITÉ:');
  console.log(`Violations: ${results.violations.length}`);

  if (results.violations.length > 0) {
    results.violations.forEach((violation) => {
      console.log(`\n❌ ${violation.id}`);
      console.log(`   Impact: ${violation.impact}`);
      console.log(`   Description: ${violation.description}`);
      console.log(`   Nodes affectés: ${violation.nodes.length}`);
    });
    process.exit(1);
  }

  await browser.close();
  console.log('✅ Aucune violation WCAG détectée');
}

runA11yTest();
```

### 3.2 Keyboard Navigation

**Fichier**: `src/components/TournamentTabs.tsx`

```tsx
// Ajouter support clavier complet
<Tabs
  value={selectedEventId}
  onValueChange={setSelectedEventId}
  onKeyDown={(e) => {
    // Ctrl+N = Nouvel événement
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      setShowCreateDialog(true);
    }
    // Escape = Fermer modal
    if (e.key === 'Escape') {
      setShowCreateDialog(false);
    }
  }}
  // Focus trap dans les modals
  role="tablist"
  aria-label="Gestion des tournois"
>
```

### 3.3 Screen Reader Support

**Pattern pour tous les composants UI**:

```tsx
// Badge avec aria
<Badge
  variant="success"
  aria-label={`Score: ${points} points sur ${maxRounds} rondes`}
>
  {points}/{maxRounds}
</Badge>

// Button avec description
<Button
  onClick={handleSync}
  aria-label="Synchroniser les données avec le serveur Upstash"
  aria-busy={isSyncing}
>
  <RefreshCw className={isSyncing ? 'animate-spin' : ''} />
  <span className="sr-only">Synchronisation en cours</span>
</Button>
```

---

## 🎨 PHASE 4 - SEO & BEST PRACTICES

### 4.1 Metadata Next.js

**Fichier**: `app/layout.tsx`

```tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://hay-chess-tracker.vercel.app'),
  title: {
    default: 'HAY Chess Tracker - Suivi de tournois FFE',
    template: '%s | HAY Chess Tracker',
  },
  description: 'Application de suivi en temps réel des tournois d\'échecs FFE. Synchronisation automatique, statistiques par club, gestion multi-événements.',
  keywords: ['échecs', 'FFE', 'tournoi', 'chess', 'tracker', 'HAY'],
  authors: [{ name: 'Pierre Alexandre Guillemin' }],
  creator: 'Pierre Alexandre Guillemin',
  publisher: 'HAY Chess Club',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://hay-chess-tracker.vercel.app',
    title: 'HAY Chess Tracker',
    description: 'Suivi de tournois FFE en temps réel',
    siteName: 'HAY Chess Tracker',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HAY Chess Tracker',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HAY Chess Tracker',
    description: 'Suivi de tournois FFE en temps réel',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'YOUR_VERIFICATION_CODE', // À remplir
  },
};
```

### 4.2 Sitemap

**Créer**: `app/sitemap.ts`

```typescript
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://hay-chess-tracker.vercel.app',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];
}
```

### 4.3 Robots.txt

**Créer**: `app/robots.ts`

```typescript
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: 'https://hay-chess-tracker.vercel.app/sitemap.xml',
  };
}
```

---

## ✅ PHASE 5 - VALIDATION & COMMIT

### Checklist finale

```bash
# 1. Build sans erreurs
npm run build

# 2. Lint sans erreurs
npm run lint

# 3. Type check
npx tsc --noEmit

# 4. Lighthouse audit
node scripts/lighthouse-audit.js

# 5. Accessibilité
node scripts/a11y-check.js
```

### Structure de commit

```bash
git add .
git commit -m "perf: achieve Lighthouse 95+ scores

Performance optimizations (+50 points):
- Implement Next.js Image for all images with WebP
- Add font-display: swap for zero layout shift
- Split bundles: framer-motion, radix-ui separate chunks
- Dynamic imports for heavy components

Accessibility improvements (100/100):
- Add ARIA labels to all interactive elements
- Implement keyboard navigation (Ctrl+N, Escape)
- Ensure 4.5:1 color contrast ratio
- Add screen reader support with sr-only class

SEO & Best Practices:
- Complete OpenGraph metadata
- Add sitemap.xml and robots.txt
- Implement cache headers (31536000s)

Lighthouse scores:
- Performance: [XX]/100 → 95+/100
- Accessibility: [XX]/100 → 100/100
- Best Practices: [XX]/100 → 95+/100
- SEO: [XX]/100 → 95+/100

🤖 Generated with Claude AI
"
```

---

## 🎯 CRITÈRES DE SUCCÈS

**Acceptation par Claude Code = tous les points verts**:

- ✅ Performance ≥ 95/100
- ✅ Accessibility = 100/100
- ✅ Best Practices ≥ 95/100
- ✅ SEO ≥ 95/100
- ✅ `npm run build` succès
- ✅ `npm run lint` 0 erreurs
- ✅ `npx tsc --noEmit` 0 erreurs
- ✅ Aucune régression fonctionnelle

**Si un seul critère échoue** → Claude.ai doit corriger avant push.
