# Design System — Nos Joueurs en Tournoi

> Version 1.0 — 12 avril 2026
> Source de verite : `src/styles/globals.css`, `tailwind.config.js`

---

## Table des matieres

1. [Vision et principes](#1-vision-et-principes)
2. [Architecture des tokens](#2-architecture-des-tokens)
3. [Couleurs](#3-couleurs)
4. [Typographie](#4-typographie)
5. [Espacement et mise en page](#5-espacement-et-mise-en-page)
6. [Rayons de bordure et ombres](#6-rayons-de-bordure-et-ombres)
7. [Materiau Glassmorphism](#7-materiau-glassmorphism)
8. [Composants](#8-composants)
9. [Animation et mouvement](#9-animation-et-mouvement)
10. [Accessibilite](#10-accessibilite)
11. [Design responsive](#11-design-responsive)
12. [Guide d'utilisation](#12-guide-dutilisation)

---

## 1. Vision et principes

### Identite

**Nos Joueurs en Tournoi** est un tracker de tournois d'echecs FFE (Federation Francaise des Echecs). L'interface doit communiquer :

- **Precision** — les donnees de tournoi sont critiques, la lisibilite prime
- **Dynamisme** — un tournoi en cours est vivant, l'interface doit le refléter
- **Accessibilite** — utilise par des benevoles en salle de tournoi, sur laptop ou mobile

### Deux identites visuelles

Le systeme supporte deux themes, chacun avec un mode clair et sombre :

| Theme | Esthetique | Police | Ton |
|-------|-----------|--------|-----|
| **Miami Vice** | Cyberpunk neon, gradients animes, glows | Exo 2 | Energique, futuriste |
| **Neutral** | Liquid glass, orbes ambientes, frosted | Satoshi | Raffine, sobre |

### Principes de design

1. **Tokens, pas de valeurs en dur** — chaque couleur, espacement et rayon utilise une variable CSS
2. **Decomposition OKLCH** — les couleurs sont composees via Lightness + Chroma + Hue, jamais en hex/rgb
3. **Glass-first surfaces** — les cartes et surfaces utilisent `backdrop-filter` plutot que des fonds opaques
4. **Motion avec respect** — toutes les animations respectent `prefers-reduced-motion`
5. **Semantic, pas decoratif** — chaque choix visuel a un role fonctionnel

---

## 2. Architecture des tokens

### Decomposition en 3 couches

Le systeme de couleurs repose sur une decomposition OKLCH en 3 couches independantes. Cela permet de generer **4 experiences visuelles distinctes** (2 themes x 2 modes) a partir d'un seul jeu de tokens semantiques.

```
Couche 1 — Theme (data-theme)     definit Chromaticite (C) + Teinte (H)
Couche 2 — Mode  (data-mode)      definit Luminosite (L)
Couche 3 — Composition (:root)    assemble L + C + H en tokens semantiques
```

### Flux de composition

```
[data-theme="miami"]              [data-mode="dark"]
  --primary-c: 0.1003               --primary-l: 0.5890
  --primary-h: 202.7

                    :root
                      --primary: var(--primary-l) var(--primary-c) var(--primary-h)
                                 = 0.5890 0.1003 202.7

                    tailwind.config.js
                      primary: "oklch(var(--primary))"
                               = oklch(0.5890 0.1003 202.7)
```

### Categorie des tokens

| Categorie | Composition | Exemples |
|-----------|------------|----------|
| **Chromatiques** | L + C + H | `--primary`, `--accent`, `--destructive` |
| **Quasi-achromatiques** | L + C_muted + H_muted | `--background`, `--muted`, `--card`, `--border` |
| **Purs achromatiques** | L + 0 + 0 | `--foreground`, `--primary-foreground` |
| **Glass** | Opacites + blur | `--glass-bg-opacity`, `--glass-blur` |

### Exception : Neutral theme

Le theme Neutral **contourne** la decomposition L/C/H et definit des tokens finaux directement (`--primary: 0.65 0.2 260`). Raison : les gris neutres achromatic (C=0) ne sont pas composables via le meme C+H que les couleurs chromatiques.

### Fichiers source

| Fichier | Role |
|---------|------|
| `src/styles/globals.css` | Tokens CSS, glass, animations — **source de verite** |
| `tailwind.config.js` | Extension Tailwind (couleurs, polices, rayons, animations) |
| `app/layout.tsx` | Chargement des polices (Google Fonts + local) |

---

## 3. Couleurs

### 3.1 Palette semantique

Chaque token semantique est expose en Tailwind via `oklch(var(--token))`.

| Token | Role | Utilisation |
|-------|------|-------------|
| `primary` | Couleur directrice | CTA, liens, elements actifs, focus ring |
| `secondary` | Couleur de support | Fond alternatif, hierarchie secondaire |
| `accent` | Couleur d'emphase | Badges, indicateurs, differenciateur |
| `destructive` | Actions dangereuses | Bouton supprimer, alertes d'erreur |
| `warning` | Avertissement | Alertes non-critiques |
| `muted` | Attenuation | Fond grise, texte desactive |
| `background` | Fond de page | `<body>`, zone principale |
| `foreground` | Texte principal | Corps de texte, icones |
| `card` | Fond de carte | Surfaces elevees |
| `popover` | Fond de popup | Menus deroulants, tooltips |
| `border` | Bordures | Separateurs, contours de champs |
| `input` | Bordure d'input | Champs de formulaire |
| `ring` | Focus ring | Indicateur de focus clavier |

Chaque token chromatique possede un `-foreground` associe (texte sur cette couleur).

### 3.2 Miami Vice — Chromatic identity

| Token | C | H | Description visuelle |
|-------|---|---|---------------------|
| `primary` | 0.1003 | 202.7 | Aqua neon |
| `secondary` | 0.1066 | 255.1 | Navy profond |
| `accent` | 0.2193 | 37.7 | Orange vif |
| `destructive` | 0.2082 | 25.4 | Rouge-orange |
| `warning` | 0.1600 | 65.0 | Ambre |

**Palette neon** (usage restraint, WCAG AA) :
- `--neon-aqua: 0.65 0.10 202.7` — glows, titres, bordures actives
- `--neon-orange: 0.58 0.22 37.7` — accents, hover, gradients

### 3.3 Neutral — Chromatic identity

| Token | C | H | Description visuelle |
|-------|---|---|---------------------|
| `primary` | 0.1950 | 263.0 | Violet-bleu |
| `secondary` | 0.0300 | 260.0 | Quasi-achromatique bleu |
| `accent` | 0.1610 | 145.0 | Vert emeraude |
| `destructive` | 0.2150 | 27.0 | Rouge |

### 3.4 Luminosite par mode

| Token | Dark (L) | Light (L) |
|-------|----------|-----------|
| `background` | 0.3261 | 0.9750 |
| `foreground` | 1.0000 | 0.2200 |
| `primary` | 0.5890 | 0.4500 |
| `secondary` | 0.3261 | 0.4000 |
| `accent` | 0.6647 | 0.5500 |
| `destructive` | 0.6356 | 0.5000 |
| `muted` | 0.2753 | 0.9300 |
| `muted-foreground` | 0.7100 | 0.5000 |
| `card` | 0.2753 | 0.9600 |
| `border` | 0.7100 | 0.8000 |

### 3.5 Couleurs non-token (a eviter)

Les badges `success`, `warning`, `info` utilisent des couleurs Tailwind en dur (`bg-green-100`, `bg-yellow-100`, `bg-blue-100`). Celles-ci ne s'adaptent pas aux themes. Usage tolere uniquement dans les badges semantiques.

---

## 4. Typographie

### 4.1 Familles de polices

| Police | Source | Variable CSS | Graisses | Usage |
|--------|--------|-------------|----------|-------|
| **Exo 2** | Google Fonts | `--font-exo2` | 400, 500, 700 | Theme Miami — titres et corps |
| **Satoshi** | Local WOFF2 | `--font-satoshi` | 400, 500, 700 | Theme Neutral — titres et corps |

Chaque theme definit `--font-display` et `--font-body` vers la police du theme. Tailwind expose `font-display` et `font-body`.

### 4.2 Chargement

- **Exo 2** : `next/font/google`, `display: swap`, `preload: true`
- **Satoshi** : `next/font/local` (3 fichiers WOFF2), `display: swap`, `preload: false`
- Fallback : `system-ui, sans-serif`

### 4.3 Echelle typographique

Utilise l'echelle Tailwind standard :

| Element | Classe Tailwind | Taille | Graisse | Usage |
|---------|----------------|--------|---------|-------|
| Titre principal (h1) | `text-2xl md:text-3xl lg:text-4xl` | 1.5-2.25rem | 700 | "NOS JOUEURS EN TOURNOI" |
| Titre section (h2) | `text-2xl` | 1.5rem | 700 | Titres de dialog |
| Titre carte (h3) | `text-lg` | 1.125rem | 700 | Noms d'evenements, sections |
| Corps | `text-sm` / `text-base` | 0.875-1rem | 400 | Texte courant, tableaux |
| Label | `text-xs` | 0.75rem | 600 | Dates, metadata, badges |

### 4.4 Styles speciaux

**Cyberpunk Title** (Miami uniquement) :
```css
.cyberpunk-title {
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: linear-gradient(90deg, neon-aqua, neon-orange, ...);
  -webkit-background-clip: text;
  animation: gradient-shift 3s, cyberpunk-glow-reduced 2s;
}
```

**Dialog Title Gradient** (tous themes) :
```css
.dialog-title-gradient {
  font-weight: 700;
  background: linear-gradient(to right, primary, secondary);
  -webkit-background-clip: text;
}
```

---

## 5. Espacement et mise en page

### 5.1 Echelle d'espacement

Utilise l'echelle Tailwind 4px (0.25rem) standard :

| Token | Valeur | Usage typique |
|-------|--------|--------------|
| `gap-1` | 0.25rem (4px) | Entre boutons icones compacts |
| `gap-2` | 0.5rem (8px) | Entre elements inline |
| `gap-3` | 0.75rem (12px) | Entre champs de formulaire |
| `gap-4` | 1rem (16px) | Entre sections de carte |
| `gap-6` | 1.5rem (24px) | Entre groupes de contenu |
| `p-4` | 1rem (16px) | Padding interne des surfaces |
| `p-6` | 1.5rem (24px) | Padding des cartes et dialogs |
| `p-4 md:p-8` | 16-32px | Padding de page (responsive) |

### 5.2 Conteneur

```js
container: {
  center: true,
  padding: "2rem",
  screens: { "2xl": "1400px" }
}
```

Le contenu principal est centre avec `max-w-7xl mx-auto`.

### 5.3 Systeme de layout

- **Page** : `min-h-screen` avec fond gradient ou orbes
- **Header** : `flex items-center justify-between`, padding responsive `p-4 md:p-8`
- **Main** : `max-w-7xl mx-auto`, padding responsive
- **Formulaires** : `space-y-4` entre champs, `gap-2` label/input
- **Tableaux** : `overflow-x-auto` avec colonne sticky a gauche

---

## 6. Rayons de bordure et ombres

### 6.1 Rayons de bordure

| Token | Miami | Neutral | Usage |
|-------|-------|---------|-------|
| `--radius` (lg) | 0.75rem | 1.25rem | Cartes, dialogs, surfaces |
| md | 0.5rem | 1rem | Boutons, inputs |
| sm | 0.25rem | 0.75rem | Badges, petits elements |

Le theme Neutral utilise des rayons plus larges pour l'esthetique "liquid glass".

### 6.2 Ombres

Les ombres sont construites a partir de tokens d'opacite, pas de valeurs en dur :

**Glass surface** :
```css
box-shadow:
  0 1px 2px oklch(0 0 0 / var(--glass-shadow-opacity)),
  0 4px 16px oklch(0 0 0 / var(--glass-shadow-opacity-card)),
  inset 0 1px 0 oklch(1 0 0 / var(--glass-inset-opacity));
```

**Glass card** (plus elevee) :
```css
box-shadow:
  0 1px 2px oklch(0 0 0 / var(--glass-shadow-opacity)),
  0 4px 16px oklch(0 0 0 / var(--glass-shadow-opacity-card)),
  inset 0 1px 0 oklch(1 0 0 / var(--glass-inset-opacity-card));
```

**Hover** :
```css
box-shadow:
  0 2px 4px oklch(0 0 0 / ...),
  0 8px 28px oklch(0 0 0 / ...),
  inset 0 1px 0 oklch(1 0 0 / ...),
  0 0 20-24px [glow]; /* neon (Miami) ou glass-glow (Neutral) */
```

---

## 7. Materiau Glassmorphism

### 7.1 Deux niveaux de surface

| Classe | Usage | Blur | Opacite fond |
|--------|-------|------|-------------|
| `.glass-surface` | Surfaces interactives (onglets, boutons, lignes) | `var(--glass-blur)` | `var(--glass-bg-opacity)` |
| `.glass-card` | Cartes principales (tournois, stats, formulaires) | `var(--glass-blur)` | `var(--glass-bg-opacity-card)` |

### 7.2 Parametres par theme

| Parametre | Miami | Neutral |
|-----------|-------|---------|
| Blur | 15px | 24px |
| Saturation | 130% | 180% |
| Fond teinte | Blanc pur (1 0 0) | Bleu froid (0.25 0.015 250 dark / 0.95 0.015 250 light) |

### 7.3 Opacites par mode (theme Miami)

| Token | Dark | Light |
|-------|------|-------|
| `--glass-bg-opacity` | 0.05 | 0.55 |
| `--glass-bg-opacity-card` | 0.12 | 0.65 |
| `--glass-border-opacity` | 0.12 | 0.22 |
| `--glass-border-opacity-card` | 0.18 | 0.30 |
| `--glass-shadow-opacity` | 0.08 | 0.03 |

### 7.4 Refraction (Neutral uniquement)

Le theme Neutral ajoute un overlay `::before` de refraction sur les surfaces glass :

```css
.glass-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--glass-ref-1) 0%, var(--glass-ref-2) 40%, transparent 60%);
  opacity: 0.85;       /* 1.0 au hover */
}
```

**Important** : Les elements `position: fixed` (dialogs) sont exclus via `:not(.fixed)` pour eviter les conflits de positionnement.

### 7.5 Dialog glass — opacite renforcee

Les dialogs et alert-dialogs utilisent une opacite de fond elevee pour garantir la lisibilite :

```css
[role="dialog"].glass-card,
[role="alertdialog"].glass-card {
  background: oklch(var(--background) / 0.96);
}
```

### 7.6 Regles d'utilisation

| Faire | Ne pas faire |
|-------|-------------|
| Utiliser `.glass-card` pour les conteneurs principaux | Imbriquer des `.glass-card` dans des `.glass-card` |
| Utiliser `.glass-surface` pour les elements interactifs | Appliquer `.glass-card` sur des elements `position: fixed` sans `.fixed` |
| Laisser le backdrop-filter creer la profondeur | Ajouter des `background` opaques en dur sur des surfaces glass |

---

## 8. Composants

### 8.1 Button

**Fichier** : `src/components/ui/button.tsx`

#### Variants (7)

| Variant | Apparence | Quand utiliser |
|---------|-----------|---------------|
| `default` | Fond `primary`, texte blanc | Action principale (CTA) |
| `gradient` | Degrade `primary` vers `secondary`, ombre portee | CTA mis en avant (ex: "Nouvel evenement") |
| `destructive` | Fond rouge, texte blanc | Suppression, action dangereuse |
| `outline` | Bordure, fond transparent | Action secondaire |
| `secondary` | Fond `secondary`, texte blanc | Action tertiaire |
| `ghost` | Transparent, hover colore | Action subtile, icones inline |
| `link` | Texte souligne, style lien | Navigation textuelle |

#### Tailles (4)

| Taille | Dimensions | Quand utiliser |
|--------|-----------|---------------|
| `default` | h-10, px-4 | Standard |
| `sm` | h-9, px-3 | Dans les tableaux, barres compactes |
| `lg` | h-11, px-8 | Hero, CTA prominent |
| `icon` | h-10, w-10 | Bouton icone seul |

#### Etats

- **Focus** : `ring-2 ring-ring ring-offset-2` (visible uniquement au clavier via `focus-visible`)
- **Disabled** : `opacity-50, pointer-events-none`
- **Hover** : opacite reduite ou changement de fond selon le variant

### 8.2 Badge

**Fichier** : `src/components/ui/badge.tsx`

| Variant | Fond | Texte | Usage |
|---------|------|-------|-------|
| `default` | `primary` | `primary-foreground` | Statut actif ("Actif") |
| `secondary` | `secondary` | `secondary-foreground` | Information neutre |
| `destructive` | `destructive` | `destructive-foreground` | Erreur |
| `outline` | Transparent + bordure | `foreground` | Label discret |
| `success` | `green-100` | `green-800` | Succes |
| `warning` | `yellow-100` | `yellow-800` | Avertissement |
| `info` | `blue-100` | `blue-800` | Information |

Forme : `rounded-full`, taille : `px-2.5 py-0.5 text-xs font-semibold`.

### 8.3 Card

**Fichier** : `src/components/ui/card.tsx`

Structure : `Card > CardHeader > CardTitle + CardDescription` + `CardContent` + `CardFooter`.

Utilise generalement avec la classe `.glass-card` pour l'effet glassmorphism.

### 8.4 Dialog

**Fichier** : `src/components/ui/dialog.tsx`

Structure Radix UI : `Dialog > DialogTrigger + DialogContent > DialogHeader + children`.

Comportement :
- **Position** : `fixed`, centre viewport (`top-50% left-50% translate`)
- **Taille max** : `max-w-lg` (defaut), surcharge possible (`sm:max-w-[600px]`)
- **Hauteur max** : `max-h-[85vh]` avec `overflow-y-auto`
- **Overlay** : `bg-black/80`, fixe, couvre tout le viewport
- **Close** : bouton X en haut a droite
- **Animation** : `zoom-in-95`, `fade-in-0` a l'ouverture

### 8.5 Table

**Fichier** : `src/components/ui/table.tsx`

Structure : `Table > TableHeader > TableRow > TableHead` + `TableBody > TableRow > TableCell`.

Specificites :
- **Scroll horizontal** : `overflow-x-auto` sur le conteneur
- **Colonne sticky** : `position: sticky; left: 0; z-index: 10` pour le nom du joueur
- **Row striping** : classes `.table-row-even` / `.table-row-odd` (voir section 7)
- **Fond sticky** : `backdrop-filter: blur(8px)` (pas de fond opaque)

### 8.6 Tabs

**Fichier** : `src/components/ui/tabs.tsx`

Base : Radix UI Tabs. `TabsList` utilise `.glass-surface` comme base.

### 8.7 Input

**Fichier** : `src/components/ui/input.tsx`

- Taille : `h-10 px-3 py-2`
- Bordure : `border-input` (token semantique)
- Focus : `ring-2 ring-ring ring-offset-2`
- Etat invalide : `aria-[invalid=true]:border-destructive`
- Placeholder : `text-muted-foreground`

### 8.8 Alert Dialog

**Fichier** : `src/components/ui/alert-dialog.tsx`

Identique a Dialog mais sans fermeture au clic exterieur (comportement Radix natif pour les actions destructives). Meme `max-h-[85vh] overflow-y-auto`.

---

## 9. Animation et mouvement

### 9.1 Couches d'animation (fond vers surface)

```
z:-2   AmbientOrbs        Neutral uniquement, 3 orbes blur(80px), 28-36s
z:1    HalftoneWaves      Miami uniquement, WebGL 2.0 GLSL, 60fps
z:1    BackgroundPaths    Miami uniquement, 72 SVG paths Framer Motion, 20-30s
z:1/8  FloatingParticles  Miami uniquement, CSS keyframes, 15-40s
z:10   Glass surfaces     Tous themes, backdrop-filter statique
```

Toutes les couches de fond sont **lazy-loaded** (`next/dynamic`, `ssr: false`).

### 9.2 Animations de surface

| Animation | Theme | Duree | Easing | Element |
|-----------|-------|-------|--------|---------|
| `gradient-shift` | Miami | 3s, infini | ease | `.cyberpunk-title` background |
| `cyberpunk-glow-reduced` | Miami | 2s, infini | ease-in-out | `.cyberpunk-title` text-shadow |
| `logo-pulse` | Miami | 3s, infini | ease-in-out | `.chess-logo` opacity |
| `logo-glow` | Miami | 2s, infini | ease-in-out | `.chess-logo` drop-shadow |
| `fade-up` | Neutral | 0.6s, once | cubic-bezier(0.16,1,0.3,1) | Entree des elements |
| `shimmer` | Tous | 3s, infini | linear | Skeleton loading |

### 9.3 Animations d'entree (Neutral)

Le theme Neutral utilise des entrees decalees :

```css
.fade-up { animation: fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
.delay-1 { animation-delay: 0.05s; }
.delay-2 { animation-delay: 0.12s; }
.delay-3 { animation-delay: 0.20s; }
.delay-4 { animation-delay: 0.28s; }
.delay-5 { animation-delay: 0.35s; }
```

### 9.4 Transitions globales

```css
html[data-theme]     { transition: background-color 0.5s ease; }
body, .glass-surface,
.glass-card          { transition: background 0.4s, color 0.3s, border-color 0.3s, box-shadow 0.4s; }
```

### 9.5 Controle utilisateur

- **Toggle** : `AnimationsToggle` (Miami uniquement) desactive via classe `.no-animations`
- **Preference systeme** : `prefers-reduced-motion: reduce` force `animation-duration: 0.01ms`

### 9.6 Principes de mouvement

| Faire | Ne pas faire |
|-------|-------------|
| Utiliser des durees 0.2-0.6s pour les interactions UI | Depasser 1s pour une animation declenchee par l'utilisateur |
| Privilegier CSS (`transition`, `@keyframes`) | Utiliser requestAnimationFrame pour des animations simples |
| Utiliser `cubic-bezier(0.16, 1, 0.3, 1)` pour les entrees | Utiliser `linear` pour les entrees (reserve aux boucles infinies) |
| Decaler les entrees avec `animation-delay` progressif | Animer plus de 5 elements simultanement |

---

## 10. Accessibilite

### 10.1 Standards vises

- **WCAG 2.1 AA** — contraste, navigation clavier, lecteur d'ecran
- **Tests** : `@axe-core/puppeteer` en E2E (voir `e2e/accessibility.e2e.ts`)

### 10.2 Navigation clavier

- **Skip link** : `<a href="#main-content">Aller au contenu principal</a>` (`.sr-only`, visible au focus)
- **Focus ring** : `focus-visible:ring-2 ring-primary ring-offset-2` sur tous les interactifs
- **Dialogs** : focus trap via Radix UI, fermeture Escape, restauration du focus
- **Menus** : Escape pour fermer, Enter/Space pour activer

### 10.3 Attributs ARIA

| Pattern | Attributs | Composant |
|---------|----------|-----------|
| Bouton icone | `aria-label`, icone `aria-hidden="true"` | Tous les boutons icones |
| Toggle | `aria-pressed` | ViewToggle, ThemeSwitcher |
| Menu | `aria-expanded`, `aria-haspopup="menu"` | ClubHeader dropdown |
| Champ invalide | `aria-invalid`, `aria-describedby` | EventForm validation |
| Region dynamique | `role="status"`, `aria-live="polite"` | Indicateurs de chargement |
| Action destructive | `role="alertdialog"` | DeleteConfirmDialog |

### 10.4 Mouvement reduit

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 10.5 Contraste

- Les neon (`--neon-aqua`, `--neon-orange`) ont une luminosite OKLCH reduite pour maintenir un ratio AA
- Le cyberpunk glow utilise des text-shadow a intensite reduite (`cyberpunk-glow-reduced`)
- `--muted-foreground` est toujours differencie de `--background` (min 0.08 L delta)

---

## 11. Design responsive

### 11.1 Breakpoints

Breakpoints Tailwind par defaut :

| Token | Largeur min | Usage |
|-------|------------|-------|
| `sm` | 640px | Passage mobile -> layout horizontal |
| `md` | 768px | Tablette, header complet |
| `lg` | 1024px | Desktop, tableaux larges |
| `xl` | 1280px | Grand ecran |
| `2xl` | 1400px | Max-width du conteneur |

### 11.2 Patterns responsifs

**Header** :
- Mobile : titre + icone empiles, nav wrap
- Desktop : titre + icone en ligne, nav horizontale

**Formulaires** :
- Mobile : `flex-col`, champs empiles
- Desktop : `flex-row`, champs cote a cote

**Tableaux** :
- Toujours `overflow-x-auto` avec scroll horizontal
- Colonne nom du joueur sticky a gauche sur tous les ecrans

**Dialogs** :
- `max-h-[85vh] overflow-y-auto` : s'adapte a toute hauteur d'ecran
- Header interne : `flex-col sm:flex-row` pour empiler les boutons sur mobile

**Padding de page** :
```
Mobile : p-4 (16px)
Desktop : md:p-8 (32px)
```

---

## 12. Guide d'utilisation

### 12.1 Pour les developpeurs

#### Ajouter une couleur semantique

1. Definir `--new-c` et `--new-h` dans chaque bloc `[data-theme]` de `globals.css`
2. Definir `--new-l` dans chaque bloc `[data-mode]`
3. Composer dans `:root` : `--new: var(--new-l) var(--new-c) var(--new-h)`
4. Exposer dans `tailwind.config.js` : `new: "oklch(var(--new))"`

#### Creer une surface glass

```tsx
// Surface interactive (onglet, bouton outline)
<div className="glass-surface rounded-lg p-4">...</div>

// Carte avec elevation
<div className="glass-card">...</div>

// NE PAS combiner glass-card avec position: fixed sans la classe .fixed
```

#### Utiliser un composant

```tsx
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

<Button variant="gradient" size="lg">Action principale</Button>
<Button variant="ghost" size="icon" aria-label="Partager">
  <Share2 className="w-4 h-4" aria-hidden="true" />
</Button>
<Badge variant="success">Termine</Badge>
```

### 12.2 Pour les designers

#### Palette de travail

Le design system utilise l'espace colorimetrique **OKLCH** (Oklab Lightness-Chroma-Hue), qui garantit une luminosite perceptuellement uniforme. Cela signifie que deux couleurs avec la meme valeur L ont la meme luminosite percue, contrairement a HSL.

Pour convertir en hex pour les outils de design :

| Token | Miami Dark | Miami Light | Neutral Dark | Neutral Light |
|-------|-----------|------------|-------------|--------------|
| Primary | oklch(0.59 0.10 203) | oklch(0.45 0.10 203) | oklch(0.65 0.20 260) | oklch(0.55 0.20 263) |
| Accent | oklch(0.66 0.22 38) | oklch(0.55 0.22 38) | oklch(0.70 0.17 145) | oklch(0.63 0.16 145) |
| Background | oklch(0.33 0.11 255) | oklch(0.98 0.11 255) | oklch(0.27 0 0) | oklch(0.98 0.01 260) |

Utiliser [oklch.com](https://oklch.com) pour les conversions interactives.

#### Principes visuels

1. **Glass plutot que solide** — les surfaces ne sont jamais completement opaques (sauf les dialogs)
2. **Profondeur par le blur** — la hierarchie visuelle est creee par le `backdrop-filter`, pas par la couleur de fond
3. **Neon avec restraint** — les couleurs neon (Miami) sont des accents, jamais des fonds larges
4. **Mouvement signifiant** — chaque animation communique un etat (chargement, entree, feedback)

### 12.3 Pour les stakeholders

#### Identite de marque

**Nos Joueurs en Tournoi** propose deux experiences visuelles :

- **Miami Vice** — une esthetique cyberpunk neon qui evoque l'energie d'un tournoi en cours. Gradients animes, glows aqua/orange, particules flottantes. Adaptee aux ecrans de presentation en salle de tournoi.

- **Neutral** — une esthetique sobre et raffinee, liquid glass avec des orbes atmospheriques. Adaptee a l'utilisation quotidienne, moins de distraction visuelle.

Les deux themes partagent la meme structure de donnees et les memes interactions. Le choix du theme est une preference utilisateur, commutable instantanement.

#### Principes de marque

| Principe | Expression |
|----------|-----------|
| **Precision** | Tableaux lisibles, donnees alignees, validation instantanee |
| **Dynamisme** | Animations subtiles, feedback visuel immediat, mise a jour en temps reel |
| **Accessibilite** | Navigation clavier complete, contraste AA, mouvement desactivable |
| **Elegance** | Surfaces glass, typographie soignee, palettes coherentes |

---

## Annexes

### A. Fichiers du design system

| Fichier | Role |
|---------|------|
| `src/styles/globals.css` | Tokens, glass, animations, striping — **source de verite** |
| `tailwind.config.js` | Extension Tailwind (couleurs, polices, rayons) |
| `src/components/ui/*.tsx` | Composants primitifs (button, badge, card, dialog, table, tabs, input, alert-dialog, checkbox, label) |
| `app/layout.tsx` | Chargement polices, providers theme/animations |
| `docs/FRONTEND-VISUAL-MAP.md` | Inventaire detaille des effets visuels |
| `docs/playground-neutral.html` | Playground interactif du theme Neutral |
| `docs/font-compare-miami.html` | Comparaison typographique Miami |

### B. Outils et dependances

| Outil | Version | Role |
|-------|---------|------|
| Tailwind CSS | 4.x | Framework utilitaire |
| `tailwindcss-animate` | plugin | Animations d'entree/sortie (Radix) |
| Radix UI | latest | Primitifs accessibles (Dialog, Tabs, AlertDialog, Checkbox) |
| shadcn/ui | — | Composants pre-styles au-dessus de Radix |
| Framer Motion | latest | Animations SVG (BackgroundPaths) |
| Lucide React | latest | Icones |
| Sonner | latest | Notifications toast |

### C. Historique des decisions

| Date | Decision | Raison |
|------|----------|--------|
| 2026-03 | OKLCH au lieu de HSL | Luminosite perceptuellement uniforme, support natif CSS |
| 2026-03 | Decomposition L/C/H | Permet 4 variantes (2 themes x 2 modes) sans duplication |
| 2026-03 | Neutral bypasses L/C/H | Les gris achromatiques (C=0) ne composent pas avec les memes C+H |
| 2026-03 | Glass surfaces | Profondeur sans z-index complexe, esthetique moderne |
| 2026-03 | Satoshi local | Independance CDN, performance, controle typographique |
| 2026-04 | Dialog glass opacity 0.96 | Lisibilite du texte sur overlay, surtout mobile |
| 2026-04 | `:not(.fixed)` pour glass refraction | Eviter le conflit position:relative vs position:fixed |
