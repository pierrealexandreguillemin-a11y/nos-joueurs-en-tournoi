# Table Row Striping — Design Decision

**Date:** 2026-03-09
**Status:** Accepted
**Scope:** PlayerTable, PairingsTable

## Context

The app uses two themes (Miami, Neutral) with glassmorphism surfaces. Tables sit on `.glass-card` with `backdrop-filter: blur`. Row striping must feel integrated with the glass material, not painted on top.

## Problem

Previous approach used `bg-muted`/`bg-card` alternation — solid semantic tokens designed for surfaces, not for subtle row differentiation. This created:

- **Heavy visual weight**: rows looked like stacked opaque layers, not glass
- **Three-color artifacts**: sticky first column had its own bg, creating visible mismatches
- **Theme inconsistency**: `bg-foreground/10` and `bg-primary/3` rendered differently across Miami/Neutral

## Options Evaluated

### Option A — Frosted opacity bands

Even rows get a barely perceptible white (dark mode) or black (light mode) overlay. Odd rows stay transparent. The glass-card backdrop shows through both.

```css
/* Dark */  even row: oklch(1 0 0 / 0.03)
/* Light */ even row: oklch(0 0 0 / 0.02)
```

**Pros:**
- Invisible until needed — guides the eye without painting the row
- Material-native: works WITH the glass blur, not against it
- Theme-agnostic: no dependency on color tokens
- Sticky columns need no special treatment (transparent inherits correctly)

**Cons:**
- Very subtle — may not suffice for dense 15+ column tables
- No personality or brand connection

### Option B — Border-only rhythm

No background at all. Alternating border opacity (0.08 vs 0.03) creates rhythm.

**Pros:** Zero glass interference. Clean, editorial.
**Cons:** Insufficient for wide tournament tables with 10+ round columns. Hard to track rows horizontally.

### Option C — Primary hue whisper

Even rows get a 4% tint of `--primary`. In Miami, that's neon aqua; in Neutral, purple-blue.

```css
even row: oklch(var(--primary) / 0.04)
```

**Pros:**
- Ties striping to theme identity — rows "belong" to the design
- Creates a cold-glass effect in Neutral, a neon undertone in Miami
- Distinctive without being heavy

**Cons:**
- Slightly more opinionated
- Primary hue visible at 4% only in certain ambient lighting

## Decision

**Option A for Neutral** — pure subtlety. The liquid glass aesthetic demands minimal interference. Frosted bands respect the material.

**Option C for Miami** — personality. The cyberpunk theme benefits from neon aqua bleeding into table rows at ultra-low opacity. It creates an "everything glows" coherence.

## Implementation

CSS classes `.table-row-even` and `.table-row-odd` in `globals.css`, scoped by `[data-theme]`. Components apply these classes based on row index. Sticky columns use the same classes.

Hover uses a slightly stronger version of the same approach (not a different color).

### Row hierarchy

| Element | Even row | Odd row | Hover |
|---------|----------|---------|-------|
| **Neutral dark** | `oklch(1 0 0 / 0.03)` | transparent | `oklch(1 0 0 / 0.06)` |
| **Neutral light** | `oklch(0 0 0 / 0.025)` | transparent | `oklch(0 0 0 / 0.05)` |
| **Miami dark** | `oklch(var(--primary) / 0.05)` | transparent | `oklch(var(--primary) / 0.10)` |
| **Miami light** | `oklch(var(--primary) / 0.04)` | transparent | `oklch(var(--primary) / 0.08)` |

### Sticky column

No opaque background — uses `backdrop-filter: blur(8px)` to hide scrolling content without adding color. The row striping shows through uniformly.

### Total Club row

Keeps its existing `bg-gradient-to-r from-primary/10 to-secondary/10` — it's a summary row, not a data row. Sticky cell mirrors the same gradient.
