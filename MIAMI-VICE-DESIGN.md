# Miami Vice — Design System for nos-joueurs-en-tournoi

> Format: VoltAgent `awesome-claude-design` 9-sections. Drop this file into Claude Design (assets panel) as the canonical source of truth for this project. Extracted from `src/styles/globals.css` (698 lines) on 2026-04-19.

## 1. Visual Theme & Atmosphere

**Two themes, two materials.**

- **`data-theme="miami"`** — cyberpunk glassmorphism, electric neon glow, aqua/orange/navy tricolor reminiscent of Miami Vice 1984 + Miami Dolphins. Dense atmosphere, high contrast, display typography Exo 2 with gradient clip-to-text titles. Use case: primary identity of the tournament tracker, energy of a live event.
- **`data-theme="neutral"`** — liquid glass aesthetic inspired by Apple iOS 26. Larger blur (24px), higher saturation (180%), ::before refraction gradient overlay, ambient orbs in the background. Airy, sophisticated, professional. Use case: admin dashboards, long reading sessions, accessibility-focused views.

Each theme × 2 modes (dark/light) = 4 complete palettes. Switch via `[data-theme]` + `[data-mode]` on `<html>`.

**Ambient elements**: three orb overlays (`--orb-1/2/3`) create subtle atmospheric glow behind content, drifting at 28s / 32s / 36s staggered timings. WebGL HalftoneWaves shader (287 lines GLSL) and BackgroundPaths (72 SVG paths in Framer Motion) reinforce the ambient layer without stealing focus.

## 2. Color Palette & Roles

All colors expressed in **OKLCH with C+H decomposition**. Never use hex; the hex reference shown in comments is for documentation only.

### Miami theme (chromatic identity)

| Role | C / H | Hex reference | Usage |
|------|-------|---------------|-------|
| Primary | C=0.1003 H=202.7 | `#008E97` aqua | CTAs, active links, primary buttons |
| Secondary | C=0.1066 H=255.1 | `#013369` navy | Headers, dark surfaces, secondary buttons |
| Accent | C=0.2193 H=37.7 | `#FC4F00` orange | Emphasis, notifications, hover states |
| Destructive | C=0.2082 H=25.4 | `#E04500`-like | Errors, delete actions |
| Warning | C=0.1600 H=65.0 | amber | Cautions, pending states |
| Muted | C=0.0364 H=259.7 | near-achromatic navy | Backgrounds, disabled text |

**Neon tokens** (reduced-brightness WCAG AA variants for glow effects):
- `--neon-aqua: 0.65 0.10 202.7`
- `--neon-orange: 0.58 0.22 37.7`

### Neutral theme (achromatic + accent)

| Role | OKLCH | Usage |
|------|-------|-------|
| Primary | `0.575 0.2 260` dark / `0.546 0.195 263` light | purple-blue accent |
| Accent | `0.55 0.17 145` dark / `0.55 0.161 145` light | green complement |
| Background dark | `0.27 0 0` | dark gray (NOT near-black — deliberate) |
| Background light | `0.975 0.005 260` | off-white with faint blue tint |
| Secondary light | `0.89 0.005 260` | surface below the background, clear of muted/card |

### Status colours (theme- and mode-invariant)

Semantics do not belong to a brand identity, so `warning`, `success` and `info` are identical in all
four combinations — a light chip carrying dark text — declared once in the `:root` composition:

| Token | OKLCH | Paired foreground | Contrast |
|-------|-------|-------------------|----------|
| `--warning` | `0.72 0.16 65` | `0.22 0 0` | 6.72:1 |
| `--success` | `0.72 0.15 150` | `0.22 0 0` | 7.41:1 |
| `--info` | `0.72 0.12 230` | `0.22 0 0` | 7.16:1 |

**`*-strong` variants** — same hue drawn directly on the page background (icons, standalone text),
where there is no chip surface to lean on. Lightness follows the mode: `--status-strong-l` is 0.78 in
dark, 0.45 in light. Classes: `text-success-strong`, `text-warning-strong`, `text-info-strong`.

> Every lightness on this page is measured, not chosen by eye. Replay with
> `npm run check:tokens` — 56 token pairs and 16 backdrop points, all at or above WCAG AA 4.5:1.
> The dark-mode lightnesses of `primary`, `accent` and `destructive` were corrected on 2026-08-15
> (they measured 2.51–3.95:1). See `docs/DESIGN-TOKENS-AUDIT-2026-08-15.md`.

**Rule**: In neutral theme, grays are truly achromatic (C=0). Never tint the grays; the atmosphere comes from orbs and glass refraction, not from colored backgrounds.

## 3. Typography Rules

**Two fonts, strict role separation.**

| Font | Files | Role |
|------|-------|------|
| **Exo 2** (Google Fonts) | `next/font/google`, weights 400/600/700/800 | Display only — `.cyberpunk-title`, h1, h2 marketing. Used for gradient clip-to-text titles with glow animation. |
| **Satoshi** (local woff2) | `src/fonts/satoshi-400.woff2`, `500.woff2`, `700.woff2` | Body, UI, labels, captions. Default for all non-display text. |

**Assignment by theme**:
- Miami theme: `--font-display: Exo 2`, `--font-body: Exo 2` (both assigned to Exo 2 per current config — intentional cyberpunk identity)
- Neutral theme: `--font-display: Satoshi`, `--font-body: Satoshi` (both Satoshi — sophisticated liquid-glass identity)

**Anti-pattern documented**: Never use Space Grotesk. Labeled "AI slop" in the project's design audit. Avoid Inter for display purposes in miami theme; Exo 2 is the canonical display font.

**Never**:
- Mix Exo 2 on body text in neutral theme
- Use Exo 2 under 24px (not designed for it, legibility drops)
- Introduce a third font family — the palette is intentionally dual

## 4. Component Stylings

### Glass materials — the two first-class components

**`.glass-surface`** — base frosted surface (sidebars, panels, navigation):
```css
backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
background: oklch(var(--glass-tint) / var(--glass-bg-opacity));
border: 1px solid oklch(1 0 0 / var(--glass-border-opacity));
box-shadow:
  0 1px 2px oklch(0 0 0 / var(--glass-shadow-opacity)),
  0 4px 16px oklch(0 0 0 / var(--glass-shadow-opacity-card)),
  inset 0 1px 0 oklch(1 0 0 / var(--glass-inset-opacity));
```

**`.glass-card`** — elevated surface (cards, modals, dialogs). Same backdrop-filter + border but with card-tier opacity tokens, `border-radius: var(--radius)` and `padding: 1.5rem`.

**13 tokens drive glass per theme × mode** (all OKLCH):

| Token | Miami dark | Miami light | Neutral dark | Neutral light |
|-------|:----------:|:-----------:|:------------:|:-------------:|
| `--glass-blur` | 15px | 15px | 24px | 24px |
| `--glass-saturate` | 130% | 130% | 180% | 180% |
| `--glass-bg-opacity` | 0.05 | 0.55 | 0.38 | 0.35 |
| `--glass-bg-opacity-card` | 0.12 | 0.65 | 0.42 | 0.40 |
| `--glass-border-opacity` | 0.12 | 0.22 | 0.10 | 0.14 |
| `--glass-inset-opacity` | 0.15 | 0.22 | 0.06 | 0.12 |
| `--glass-shadow-opacity` | 0.08 | 0.03 | 0.22 | 0.04 |
| `--glass-tint` | — | — | `0.25 0.015 250` | `0.95 0.015 250` |

Neutral theme adds `--glass-ref-1`, `--glass-ref-2` (gradient refraction via `::before` pseudo-element), `--glass-glow` (hover box-shadow outer glow), `--glass-border-hover`.

### Other components

- **`.cyberpunk-title`** — display h1/h2 with animated gradient clip-to-text (keyframes `gradient-shift` 3s). WCAG-compliant reduced intensity variant `cyberpunk-glow-reduced` (2s). Logo variant: `.logo-pulse` + `.logo-glow` alternating aqua↔orange.
- **`.menu-dropdown`** — popover with `oklch(var(--popover) / 0.95)` background, 10px blur, primary-tinted border (0.3 alpha), 15% black drop shadow.
- **`.page-background`** — full-bleed linear gradient using semantic tokens (primary → secondary → secondary → primary at 0/25/75/100%). No hex.
- **Dialog glass** — `[role="dialog"].glass-card` overrides to `oklch(var(--background) / 0.96)` for readability over overlays.
- **Ambient orbs** — three absolute-positioned divs consuming `--orb-1/2/3`, drifting via `orb-drift` keyframes at 28/32/36s (staggered).

## 5. Layout Principles

- **Mobile-first.** Designed for phones at tournament venues. Tablet and desktop are progressive enhancements.
- **Glass panels float over a colored background.** Never solid cards on solid backgrounds — the atmosphere is the `.page-background` gradient + orbs, and glass surfaces punch through it.
- **Radius divergence**: `--radius: 0.75rem` in Miami (sharper, more cyberpunk), `--radius: 1.25rem` in Neutral (softer, more liquid).
- **French UI by default**. Typography accommodates accented characters fluently. Keep line-length under 70 characters for long French phrases.
- **Chess-specific components** render with dense tabular data: Elo ratings, round pairings, player tables. Use `.glass-card` with reduced padding (1rem instead of 1.5) for dense grids.

## 6. Depth & Elevation

**The two glass materials are the depth system.** No traditional shadow scale — glass carries depth via backdrop-filter blur + inset highlights.

### Miami theme — electric glow elevation
Hover on any `.glass-*` element adds a `0 0 20px oklch(var(--neon-aqua) / 0.15)` outer glow with a soft aqua border (`oklch(var(--neon-aqua) / 0.3)`). Elevation is **electric**, not physical.

### Neutral theme — liquid glass elevation
The `::before` refraction pseudo-element simulates a curved glass surface. Hover increases opacity of the refraction gradient (from 0.85 to 1.0) and adds a colored glow via `--glass-glow` (primary-tinted blur 24px). Border transitions to a brighter variant via `--glass-border-hover`.

**Rule**: Never use `box-shadow: 0 X Y Z rgba(0,0,0,.X)` for elevation. Use `.glass-surface` → `.glass-card` → `[role="dialog"].glass-card` as the stacking order. Dropdowns use `.menu-dropdown` specifically.

## 7. Do's and Don'ts

**Do**
- ✅ Use OKLCH tokens via `oklch(var(--primary))`. Never hex.
- ✅ Route all surfaces through `.glass-surface` or `.glass-card`.
- ✅ Respect `prefers-reduced-motion` (the `@media` block at line 343 zeroes all animations).
- ✅ Use `--font-display` for titles only (≥24px), `--font-body` everywhere else.
- ✅ Let `data-theme` + `data-mode` on `<html>` drive theming; never hardcode theme-specific values in components.
- ✅ Keep page backgrounds as gradients of semantic tokens (`.page-background`).
- ✅ Add theme transitions via the already-defined `0.5s ease` on `html[data-theme]`.

**Don't**
- ❌ Inline hex colors (`#008E97`, `#FC4F00`) — they exist in the code for reference only; always use OKLCH via CSS vars.
- ❌ Use Tailwind `bg-white/10 backdrop-blur-xl` instead of `.glass-surface`. Route through the utility.
- ❌ Mix Exo 2 and Satoshi in the same component.
- ❌ Introduce Space Grotesk, Geist, or Inter as display fonts. Exo 2 in miami theme, Satoshi in neutral, full stop.
- ❌ Add solid `box-shadow` for elevation — use glass materials.
- ❌ Hand-write `-webkit-backdrop-filter`. Declaring the prefix yourself makes Lightning CSS drop the
  standard property, and Chrome 151 no longer honours the `-webkit-` alias
  (`CSS.supports('-webkit-backdrop-filter','blur(4px)')` is `false`) — the blur silently dies.
  Write `backdrop-filter` alone and let the pipeline prefix it.
- ❌ Declare a semantic colour in `tailwind.config.js` without `<alpha-value>`. Without it Tailwind
  cannot inject the alpha and **drops the utility entirely**: `bg-primary/10`, `border-primary/30`
  and every `hover:bg-*/80` emit no CSS at all.
- ❌ Remove `prefers-reduced-motion` — it's a WCAG 2.3.3 hard requirement.
- ❌ Disable the ambient orbs silently — they are part of the identity.

## 8. Responsive Behavior

- **Breakpoints**: standard Tailwind (`sm: 640`, `md: 768`, `lg: 1024`, `xl: 1280`). No custom breakpoints.
- **Glass blur scales down on mobile**: consider reducing `--glass-blur` to 10px on viewports <640px for performance (optional, not yet implemented).
- **Orbs hide on mobile**: the three `--orb-*` overlays can be hidden at `max-width: 640px` to reduce GPU cost on tournament phones.
- **Tables**: chess data tables collapse to card lists on mobile. Use `.glass-card` per row with internal grid.
- **Touch targets**: minimum 44px (WCAG 2.5.5). Tournament users navigate with thumbs in venues with low light.
- **Reduced motion**: at `prefers-reduced-motion: reduce`, all orbs freeze, `cyberpunk-title` gradient stops, glass transitions become instant.

## 9. Agent Prompt Guide

When generating components for this design system, apply the following rules automatically.

### Default stack for new components

```tsx
// Always wrap surfaces in .glass-surface or .glass-card
<div className="glass-card">
  <h2 className="font-display text-2xl">Titre</h2>  {/* Exo 2 via --font-display */}
  <p className="text-foreground">Body text via Satoshi.</p>
</div>
```

### Mapping prompt intent → system tokens

| User asks for… | Use |
|----------------|-----|
| "a card" | `.glass-card`, NOT a raw `<div>` with border + shadow |
| "a sidebar" or "a panel" | `.glass-surface` |
| "a dashboard" | `.page-background` wrapper + grid of `.glass-card` |
| "a modal" | `[role="dialog"].glass-card` (higher opacity) |
| "a dropdown" | `.menu-dropdown` (popover token) |
| "a primary button" | `bg-primary text-primary-foreground`, semantic tokens only |
| "red alert" | `bg-destructive text-destructive-foreground` |
| "heading" or "title" | `<h1 className="font-display cyberpunk-title">` |
| "warm accent" | `oklch(var(--accent))` — orange in miami, green in neutral |

### Page scaffolding template

```tsx
export default function Page() {
  return (
    <div className="page-background min-h-screen">
      {/* Ambient orbs already rendered globally via <AmbientOrbs /> */}
      <main className="container mx-auto p-4 space-y-4">
        <header className="glass-surface p-4 rounded-[var(--radius)]">
          <h1 className="font-display text-3xl cyberpunk-title">Page title</h1>
        </header>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <article className="glass-card">...</article>
          <article className="glass-card">...</article>
        </section>
      </main>
    </div>
  );
}
```

### When asked for "a chess dashboard"

Generate: `.page-background` shell + sticky header (`.glass-surface`) with club name + theme toggle + a responsive grid of `.glass-card` for players (name, Elo, current round, opponent). Use `font-display` on the club name, `font-body` on tabular data. Status badges use semantic tokens (`bg-accent` for active games, `bg-muted` for finished, `bg-destructive-foreground` for forfeits).

### Context & vocabulary

- Target users: French chess club managers (FFE = Fédération Française des Échecs).
- Domain vocabulary: licence, capitaine, ronde, appariement, Elo, Buchholz, interclubs, Papi file.
- Avoid English chess jargon when a French term exists ("appariement" not "pairing").
- Always respect **active/passive** players (joueurs actifs vs passifs) as a first-class distinction in any player list.

### Accessibility requirements

- Every interactive element must have a visible `:focus-visible` state using `oklch(var(--ring))`.
- Contrast ratios: 4.5:1 minimum body text, 3:1 for large text. Miami light mode: 15.7:1 (main text), 5.2:1 (primary button) documented.
- Every animation must have a zero-motion fallback under `prefers-reduced-motion`.
- Chess pieces rendered as Unicode (♔♕♖♗♘♙) require `lang="fr"` + `aria-label` in French.

### Fallback stack

If a token is missing in the user's prompt context (e.g., they paste Tailwind utilities without CSS vars), degrade gracefully:
1. `oklch(var(--primary))` → fallback `oklch(0.55 0.1 202.7)` (aqua)
2. Glass utilities → fallback `rgba(255,255,255,0.1)` + `backdrop-filter: blur(15px)`
3. Fonts → `system-ui, sans-serif`

Never silently swap to a generic design. If the system is not available, say so.

---

_Generated 2026-04-19 for Claude Design onboarding. Source of truth: `src/styles/globals.css`. Related wiki article: `C:/Dev/wiki/topics/architecture/miami-vice-design-system.md`._
