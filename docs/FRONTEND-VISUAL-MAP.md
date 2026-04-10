# Cartographie Frontend — Theme, Effets et Animations

> Derniere mise a jour : 2026-04-10
> Inventaire complet du systeme visuel de l'application.

---

## 1. Identite visuelle : Miami Vice Cyberpunk

### Palette de couleurs

| Token | Valeur | Usage |
|-------|--------|-------|
| `miami-aqua` | `#008E97` | Couleur primaire, gradients, glows, tabs actifs |
| `miami-orange` | `#FC4F00` | Accent, glows secondaires, gradient titre |
| `miami-navy` | `#013369` | Fond profond, gradient endpoint, texte dense |
| `miami-aqua-light` | `#00A8B5` | Variante claire aqua |
| `miami-aqua-dark` | `#006B73` | Variante sombre aqua |
| `miami-orange-light` | `#FF6B2B` | Variante claire orange |
| `miami-gray` | `#8B9DC3` | Texte muted bleu-gris |

### Couleurs semantiques (CSS variables shadcn/ui)

Definies dans `:root` via `hsl(var(--name))` :

`background`, `foreground`, `primary`, `secondary`, `destructive`, `muted`, `accent`, `popover`, `card`, `border`, `input`, `ring`

### Crystal UI (mode clair)

| Variable | Valeur | Role |
|----------|--------|------|
| `--miami-crystal-bg` | `#f8fafc` | Fond light |
| `--miami-crystal-surface` | `#ffffff` | Surface carte |
| `--miami-crystal-border` | `#e2e8f0` | Bordure subtile |
| `--miami-crystal-text` | `#1e293b` | Texte principal |
| `--miami-crystal-text-muted` | `#64748b` | Texte secondaire |

### Gradient principal

```css
MIAMI_GRADIENT = linear-gradient(135deg, #008E97 0%, #013369 25%, #013369 75%, #008E97 100%)
```

### Typographie

| Police | Source | Variable CSS | Usage |
|--------|--------|-------------|-------|
| **Exo 2** | Google Fonts (`next/font/google`) | `--font-exo2` | Titres cyberpunk, `.cyberpunk-title` |
| **Satoshi** | Local (`src/fonts/satoshi-*.woff2`) | `--font-satoshi` | Body, UI, texte courant |

Chargement : `next/font/google` (Exo 2) + `localFont` (Satoshi 400/500/700), `display: swap`, `preload: true`.

---

## 2. Couches d'animation (fond vers surface)

```
z-index 1   | HalftoneWaves     — WebGL 2.0, GLSL shaders, 60fps
z-index 1   | BackgroundPaths   — SVG + Framer Motion, 36x2 paths
z-index 1/8 | FloatingParticles — CSS keyframes, 2 couches (back/front)
────────────|──────────────────────────────────────────────────────
z-index 10  | glass-surface/card — Glassmorphism statique (backdrop-blur, OKLCH)
z-index 10  | animate-shimmer   — CSS gradient sweep (Tailwind utility, 3s)
────────────|──────────────────────────────────────────────────────
surface     | UI Components     — Buttons, cards, tabs, dialogs, toasts
surface     | .cyberpunk-title  — Gradient text + glow animation
surface     | .chess-logo       — Pulse + glow + hover rotate
```

Toutes les couches de fond sont **lazy-loaded** (`next/dynamic`, `ssr: false`) et conditionnees par `animationsEnabled` (contexte React + localStorage).

---

## 3. Composants d'animation de fond

### 3.1 HalftoneWaves (WebGL 2.0)

| Propriete | Valeur |
|-----------|--------|
| **Fichier** | `src/components/HalftoneWaves.tsx` (287 lignes) |
| **Technique** | Fragment shader GLSL, Perlin noise + FBM + swirl |
| **Palette** | 20 couleurs sea gradient (navy sombre vers cyan clair) |
| **Blend** | `SRC_ALPHA, ONE_MINUS_SRC_ALPHA`, 15% opacity |
| **Loop** | `requestAnimationFrame`, uniforms `uTime` / `uResolution` |
| **Cleanup** | Suppression program + buffers on unmount |
| **Props** | Aucun (fullscreen fixe) |

**Effet visuel :** Vagues procedurales animees avec distorsions organiques et gradients de couleurs ocean. Texture type halftone generee en temps reel par le GPU.

### 3.2 BackgroundPaths (Framer Motion SVG)

| Propriete | Valeur |
|-----------|--------|
| **Fichier** | `src/components/BackgroundPaths.tsx` (68 lignes) |
| **Technique** | `motion.path` — `pathLength`, `pathOffset`, `opacity` |
| **Paths** | 72 (36 x 2 layers, positions -1 et +1) |
| **Duree** | 20-30s (randomise `secureRandom()`) |
| **Couleurs** | `rgba(15,23,42, 0.1+i*0.03)` (slate avec opacity croissante) |
| **Stroke** | 0.5-1.59px, classe `text-miami-aqua opacity-20` |
| **Easing** | Linear, infinite repeat |

**Effet visuel :** Chemins SVG qui se dessinent progressivement avec des pulsations d'opacite, creant un effet de profondeur en couches.

### 3.3 FloatingParticles (CSS Keyframes)

| Propriete | Valeur |
|-----------|--------|
| **Fichier** | `src/components/common/FloatingParticles.tsx` (125 lignes) |
| **Technique** | `@keyframes floatUp` injecte via `<style>` tag |
| **Mouvement** | translateY(100vh -> -5vh) + drift X +/-8px + scale(0->1->0) |
| **Duree** | 15-40s/particule, delay -20s a 0s |
| **Couche back** | z:1, `filter: blur(0.5px)`, 70% opacity |
| **Couche front** | z:8, `box-shadow` glow, vitesse acceleree |
| **Couleurs** | 40% aqua `#008E97`, 60% white `rgba(255,255,255,0.6)` |
| **Props** | `density` (defaut 50), `speed` (defaut 1) |
| **GPU** | `transform: translateZ(0)` force la couche GPU |

**Trajectoire keyframe (floatUp) :**

```
  0% : translateY(100vh) scale(0),   opacity 0
  5% : translateY(95vh)  scale(0.5), opacity 0.8
 15% : translateY(85vh)  scale(1),   opacity 1
 85% : translateY(15vh)  scale(1),   opacity 1
 95% : translateY(5vh)   scale(0.5), opacity 0.8
100% : translateY(-5vh)  scale(0),   opacity 0
```

### 3.4 ShimmerEffect (CSS via Tailwind)

> **Note :** Le composant `ShimmerEffect.tsx` a ete supprime. L'effet shimmer est desormais un utilitaire CSS defini dans `tailwind.config.js` (`animate-shimmer`, 3s linear infinite).

---

## 4. Glassmorphism — 2 classes utilitaires + inline

> **Note :** Les classes `.miami-card` et `.glass-surface` ont ete renommees. Le composant `MiamiGlass.tsx` a ete supprime. Le glassmorphism est desormais entierement via CSS variables OKLCH dans `globals.css`.

### 4.1 `.glass-card` (carte principale)

```css
.glass-card {
  border-radius: var(--radius);
  padding: 1.5rem;
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  background: oklch(var(--glass-tint) / var(--glass-bg-opacity-card));
  border: 1px solid oklch(1 0 0 / var(--glass-border-opacity-card));
  box-shadow: 0 1px 2px oklch(0 0 0 / var(--glass-shadow-opacity)),
              0 4px 16px oklch(0 0 0 / var(--glass-shadow-opacity-card)),
              inset 0 1px 0 oklch(1 0 0 / var(--glass-inset-opacity-card));
}
```

**Usage :** Cards tournois, stats, PairingsTable.

### 4.2 `.glass-surface` (surface interactive)

```css
.glass-surface {
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  background: oklch(var(--glass-tint) / var(--glass-bg-opacity));
  border: 1px solid oklch(1 0 0 / var(--glass-border-opacity));
  box-shadow: 0 1px 2px oklch(0 0 0 / var(--glass-shadow-opacity)),
              0 4px 16px oklch(0 0 0 / var(--glass-shadow-opacity-card)),
              inset 0 1px 0 oklch(1 0 0 / var(--glass-inset-opacity));
}
```

**Usage :** TabsList, event cards inactifs, DuplicateEventDialog.

### 4.4 Glassmorphism inline (composants specifiques)

**PageHeader / EmptyState :**
```css
background: rgba(255, 255, 255, 0.22);
backdrop-filter: blur(15px) saturate(130%);
border: 1px solid rgba(255, 255, 255, 0.28);
box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 16px rgba(0,0,0,0.15);
```

**ClubOnboarding card :**
```css
background: rgba(255, 255, 255, 0.22);
backdrop-filter: blur(15px) saturate(130%);
border: 1px solid rgba(255, 255, 255, 0.28);
```

**ClubHeader menu dropdown :**
```css
background: rgba(255, 255, 255, 0.95);
backdrop-filter: blur(10px);
border: 1px solid rgba(0, 142, 151, 0.3);
box-shadow: 0 4px 16px rgba(0,0,0,0.15);
```

---

## 5. Keyframes CSS globales

Definies dans `src/styles/globals.css` et `tailwind.config.js`.

| Nom | Duree | Easing | Effet | Utilise par |
|-----|-------|--------|-------|-------------|
| `cyberpunk-glow-reduced` | 2s | ease-in-out infinite | Text-shadow oscillation aqua/orange | `.cyberpunk-title` |
| `gradient-shift` | 3s | ease infinite | Background-position 0%->100% | `.cyberpunk-title` |
| `logo-pulse` | 3s | ease-in-out infinite | Opacity 1->0.85->1 | `.chess-logo` |
| `logo-glow` | 2s | ease-in-out infinite | Drop-shadow aqua->orange | `.chess-logo` |
| `chess-gradient-shift` | - | - | SVG stop-color animation | Logo SVG |
| `shimmer` | 3s | linear infinite | Bg-position sweep | `ShimmerEffect` |
| `accordion-down` | 0.2s | ease-out | Height 0 -> var | Accordion shadcn/ui |
| `accordion-up` | 0.2s | ease-out | Height var -> 0 | Accordion shadcn/ui |
| `floatUp` | 15-40s | linear infinite | Trajectoire particule | `FloatingParticles` |

---

## 6. Titre Cyberpunk (`.cyberpunk-title`)

```css
.cyberpunk-title {
  font-family: var(--font-exo2);
  font-weight: 400;
  letter-spacing: 0.05em;
  background: linear-gradient(90deg, #00A8CC, #E04500, #00A8CC, #E04500, #00A8CC);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-shift 3s ease infinite, cyberpunk-glow-reduced 2s ease-in-out infinite;
  filter: drop-shadow(0 0 12px rgba(0, 168, 204, 0.25));
}
```

**Technique :** Gradient clip-to-text avec animation de position pour effet de "lumiere qui se deplace". Glow text-shadow en parallele.

---

## 7. Logo Echecs (`.chess-logo`)

```css
.chess-logo {
  animation: logo-pulse 3s ease-in-out infinite, logo-glow 2s ease-in-out infinite;
  filter: drop-shadow(0 0 8px rgba(0, 168, 204, 0.4));
  transition: transform 0.3s ease;
}
.chess-logo:hover {
  transform: scale(1.1) rotate(-5deg);
  filter: drop-shadow(0 0 12px rgba(224, 69, 0, 0.6));
}
```

**Technique :** Double animation (pulse opacity + glow shift). Hover interactif avec scale+rotate et changement de couleur du glow (aqua->orange).

---

## 8. Micro-interactions UI

### 8.1 Boutons (shadcn/ui + variant `miami`)

| Variant | Style de base | Hover | Focus |
|---------|---------------|-------|-------|
| `gradient` | `bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg` | `opacity-90` | `ring-2 ring-ring ring-offset-2` |
| `default` | `bg-primary text-primary-foreground` | `bg-primary/90` | idem |
| `destructive` | `bg-destructive text-destructive-foreground` | `bg-destructive/90` | idem |
| `outline` | `border border-input bg-background` | `bg-accent text-accent-foreground` | idem |
| `secondary` | `bg-secondary text-secondary-foreground` | `bg-secondary/80` | idem |
| `ghost` | transparent | `bg-accent text-accent-foreground` | idem |
| `link` | `text-primary underline-offset-4` | `underline` | idem |

**Tailles :** `default` (h-10 px-4), `sm` (h-9 px-3), `lg` (h-11 px-8), `icon` (h-10 w-10)

**Base commune :** `transition-colors`, `disabled:opacity-50 disabled:pointer-events-none`

### 8.2 Onglets (Tabs customises miami)

- **Container :** `.glass-surface border border-miami-aqua/20`
- **Inactif :** `text-muted-foreground`, hover `text-miami-aqua`
- **Actif :** `bg-gradient-to-r from-miami-aqua to-miami-navy text-white shadow-lg`
- **Focus :** `focus-visible:ring-2 ring-miami-aqua ring-offset-2`
- **Transition :** `transition-all`

### 8.3 Dialogs / AlertDialogs (Radix + tailwindcss-animate)

**Overlay :**
- Open : `fade-in-0`
- Close : `fade-out-0`

**Content :**
- Open : `fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%]`
- Close : `fade-out-0 zoom-out-95 slide-out-to-left-1/2 slide-out-to-top-[48%]`
- Duree : 200ms

### 8.4 Tables

- **Lignes alternees :** `bg-white/10` / `bg-miami-aqua/10`
- **Hover ligne :** `hover:bg-muted/50`, `transition-colors`
- **Selection :** `data-[state=selected]:bg-muted`

### 8.5 ClubHeader dropdown

- **Menu fond :** `rgba(255,255,255,0.95)` + `blur(10px)` + border aqua/30
- **Fermeture :** Escape key + click-away overlay fixe
- **Items standard :** `hover:bg-miami-aqua/10`
- **Item destructif :** `text-red-600 hover:bg-red-50`

### 8.6 EventsManager cards

- **Event actif :** `bg-gradient-to-r from-miami-aqua/20 to-miami-navy/10 border-miami-aqua/50 shadow-lg` + badge `CheckCircle2`
- **Event inactif :** `glass-surface hover:border-miami-aqua/30 hover:shadow-md`
- **Transition :** `transition-all`, cursor pointer

### 8.7 ViewToggle (Resultats / Appariements)

- **Actif :** `bg-gradient-to-r from-miami-aqua to-miami-navy text-white shadow-sm`
- **Inactif :** `text-muted-foreground hover:text-foreground`
- **Disabled :** `opacity-50 cursor-not-allowed`
- **Indicateur :** Pastille aqua `h-2.5 w-2.5` quand nouveaux appariements disponibles
- **Focus :** `focus-visible:ring-2 ring-miami-aqua ring-offset-2`

### 8.8 Refresh spinner

- `animate-spin` conditionnel sur icone `RefreshCw` pendant le chargement

### 8.9 ShareButton

- **Dialog titre :** gradient text clip aqua->navy
- **Bouton copier :** icone Copy -> Check (green-600) apres copie, reset apres 2000ms
- **QR Code :** container `glass-surface` avec fond blanc pour le QR

---

## 9. Badges semantiques

| Variant | Fond | Texte |
|---------|------|-------|
| `success` | `bg-green-100` | `text-green-800` |
| `warning` | `bg-yellow-100` | `text-yellow-800` |
| `info` | `bg-blue-100` | `text-blue-800` |
| `destructive` | `bg-destructive` | `text-destructive-foreground` |
| `default` | `bg-primary` | `text-primary-foreground` |
| `secondary` | `bg-secondary` | `text-secondary-foreground` |
| `outline` | transparent | `text-foreground` |

Base commune : `rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors`

---

## 10. Toasts (Sonner)

| Propriete | Valeur |
|-----------|--------|
| **Composant** | `<Toaster position="top-right" richColors />` |
| **Position** | Fixed top-right |
| **Mode** | `richColors` (couleurs semantiques automatiques) |
| **Selecteur DOM** | `[data-sonner-toast]` |
| **Caveat** | Non capture par `document.body.innerText` (position fixed) |

---

## 11. Accessibilite motion

| Mecanisme | Implementation |
|-----------|---------------|
| `prefers-reduced-motion` | `@media` query dans globals.css : toutes les animations a 0.01ms |
| Toggle UI | `AnimationsToggle` -> `AnimationsContext` -> classe `.no-animations` sur `<html>` |
| Persistance | `localStorage('animationsEnabled')` |
| `.no-animations` | Enfants : `animation-duration: 0.01ms !important`, `transition-duration: 0.01ms !important` |
| Skip link | `<a href="#main-content" className="sr-only focus:not-sr-only">` |
| Focus visible | Tous les composants interactifs : `focus-visible:ring-2` |
| Scrollbar custom | Webkit : 8px, track `bg-gray-100`, thumb `bg-gray-400 rounded` |

---

## 12. Stack technique visuel

| Couche | Outil | Version |
|--------|-------|---------|
| CSS framework | Tailwind CSS + `tailwindcss-animate` | - |
| Class merging | `clsx` + `tailwind-merge` (helper `cn()` dans `src/lib/utils.ts`) | - |
| Composants UI | shadcn/ui (Radix UI primitives + class-variance-authority) | - |
| Animations declaratives | Framer Motion | v12.23.24 |
| Rendu GPU | WebGL 2.0 (HalftoneWaves GLSL shaders) | - |
| Glassmorphism | CSS `backdrop-filter` natif | - |
| Fonts | `next/font/google` (Audiowide + Inter) | - |
| Icones | Lucide React | - |
| Notifications | Sonner | - |

---

## 13. Fichiers concernes

### Configuration

| Fichier | Role |
|---------|------|
| `tailwind.config.js` | Couleurs miami, keyframes shimmer/accordion, plugin animate |
| `src/styles/globals.css` | Variables CSS, keyframes cyberpunk, classes glass/card, reduced motion |
| `src/lib/utils.ts` | Helper `cn()` (clsx + tailwind-merge) |

### Composants d'animation

| Fichier | Technique | Lignes |
|---------|-----------|--------|
| `src/components/HalftoneWaves.tsx` | WebGL 2.0 + GLSL | 287 |
| `src/components/BackgroundPaths.tsx` | SVG + Framer Motion | 68 |
| `src/components/common/FloatingParticles.tsx` | CSS Keyframes | 125 |
| ~~`src/components/common/ShimmerEffect.tsx`~~ | Supprime — remplace par `animate-shimmer` (Tailwind utility) | — |
| ~~`src/components/common/MiamiGlass.tsx`~~ | Supprime — remplace par `.glass-surface` / `.glass-card` CSS | — |

### Controle des animations

| Fichier | Role |
|---------|------|
| `src/contexts/AnimationsContext.tsx` | Provider + hook `useAnimations()` |
| `src/components/AnimationsToggle.tsx` | Bouton toggle Zap/ZapOff |

### Composants UI (shadcn/ui customises)

| Fichier | Customisations notables |
|---------|------------------------|
| `src/components/ui/button.tsx` | Variant `miami` (gradient aqua->navy) |
| `src/components/ui/badge.tsx` | Variants `success`, `warning`, `info` |
| `src/components/ui/tabs.tsx` | Gradient actif miami, glass container |
| `src/components/ui/dialog.tsx` | Animations fade/zoom/slide 200ms |
| `src/components/ui/alert-dialog.tsx` | Idem dialog |
| `src/components/ui/card.tsx` | Base shadcn standard |
| `src/components/ui/table.tsx` | Hover `bg-muted/50` |
| `src/components/ui/input.tsx` | Focus ring standard |
| `src/components/ui/checkbox.tsx` | Radix checked state |
| `src/components/ui/label.tsx` | Standard |

### Integration page

| Fichier | Role |
|---------|------|
| `app/page.tsx` | Lazy-load animations, MIAMI_GRADIENT, glassmorphism inline |
| `app/layout.tsx` | Fonts Google (Audiowide + Inter), metadata |
