#!/usr/bin/env node
/**
 * Design token conformance gate.
 *
 * Three failure modes, all three found in the real tree on 2026-08-15 while
 * rendering the design system previews:
 *
 *   1. COLLISION — a semantic surface token resolving to the exact same OKLCH
 *      triple as --background, which makes any component filled with it
 *      invisible against the page.
 *   2. FIGÉ — a component hardcoding a fixed Tailwind palette colour instead of
 *      a semantic token, which makes it blind to theme and mode.
 *   3. CONTRASTE — a `X` / `X-foreground` pair below WCAG 2.1 AA (4.5:1).
 *
 * Token values are resolved from globals.css itself — the CSS cascade is
 * replayed rather than restated, so the gate cannot drift from the stylesheet.
 *
 * Usage:  node scripts/check-design-tokens.mjs [root]
 *         `root` defaults to the cwd; pass a fixture directory to calibrate
 *         this gate against a known state. Calibration fixtures live in
 *         scripts/__fixtures__/ — see `npm run check:tokens:calibrate`.
 * Exit:   0 = clean, 1 = at least one finding.
 */
import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.argv[2] ?? '.';
const CSS_PATH = join(ROOT, 'src/styles/globals.css');
const UI_GLOBS = ['src/components/**/*.tsx', 'app/**/*.tsx'];
const AA_NORMAL_TEXT = 4.5;

const css = readFileSync(CSS_PATH, 'utf8');

/* ============================================================ css cascade */

const escapeSelector = sel => sel.replace(/[[\]"().]/g, m => `\\${m}`);

const blocksOf = sel => {
  const pattern = new RegExp(`^\\s*${escapeSelector(sel)}\\s*\\{([\\s\\S]*?)^\\s*\\}`, 'gm');
  return [...css.matchAll(pattern)].map(m => m[1]);
};

const blockOf = sel => blocksOf(sel)[0] ?? '';

const declarationsOf = sel => {
  const out = {};
  for (const m of blockOf(sel).matchAll(/(--[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
};

// Precedence, weakest first. :root lives in @layer base, so every theme and
// mode selector outranks it — which is what lets neutral bypass composition.
const environmentFor = (theme, mode) => ({
  ...declarationsOf(':root'),
  ...declarationsOf(`[data-mode="${mode}"]`),
  ...declarationsOf(`[data-theme="${theme}"]`),
  ...declarationsOf(`[data-theme="${theme}"][data-mode="${mode}"]`),
});

const resolve = (env, value, depth = 0) => {
  if (value == null || depth > 12) return value;
  const substituted = value.replace(/var\((--[\w-]+)\)/g, (_, name) =>
    resolve(env, env[name], depth + 1) ?? ''
  );
  return substituted
    .replace(/calc\(([^()]+)\)/g, (whole, expr) =>
      /^[\d\s.+\-*/]+$/.test(expr) ? String(Function(`return (${expr})`)()) : whole
    )
    .trim();
};

const COMBOS = ['miami', 'neutral'].flatMap(theme =>
  ['dark', 'light'].map(mode => ({ name: `${theme}/${mode}`, env: environmentFor(theme, mode) }))
);

const tokenOf = (env, name) => {
  const raw = resolve(env, env[`--${name}`]);
  return raw ? raw.split(/\s+/).map(Number) : null;
};

/* ================================================ oklch -> sRGB -> contrast */

const oklchToLinearRgb = (L, C, H) => {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const long = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const medium = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const short = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ];
};

const gammaEncode = u => (u <= 0.0031308 ? 12.92 * u : 1.055 * u ** (1 / 2.4) - 0.055);
const gammaDecode = u => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4);
const clamp01 = u => Math.min(1, Math.max(0, u));

// Gamut-clip the way a display does: encode, clamp, decode back.
const relativeLuminance = triple => {
  const [r, g, b] = oklchToLinearRgb(...triple).map(u => gammaDecode(clamp01(gammaEncode(u))));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (x, y) => {
  const [lighter, darker] = [relativeLuminance(x), relativeLuminance(y)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

// Calibration of the maths itself: pure white against pure black is 21:1 by
// definition. If this drifts, every number below is worthless.
const SELF_TEST = contrastRatio([1, 0, 0], [0, 0, 0]);
if (Math.abs(SELF_TEST - 21) > 0.01) {
  console.error(`conversion OKLCH cassée : blanc/noir = ${SELF_TEST.toFixed(4)}:1, attendu 21`);
  process.exit(2);
}

/* =================================================== finding 1: collisions */

const SURFACE_TOKENS = ['secondary', 'card', 'muted', 'popover', 'accent', 'primary'];

const collisions = [];
console.log('1. surfaces sémantiques confondues avec --background\n');
for (const { name, env } of COMBOS) {
  const background = tokenOf(env, 'background');
  for (const token of SURFACE_TOKENS) {
    const surface = tokenOf(env, token);
    if (!surface || !background) continue;
    if (surface.join(' ') !== background.join(' ')) continue;
    collisions.push({ combo: name, token });
    console.log(`  COLLISION  ${name.padEnd(14)} --${token} = --background = ${background.join(' ')}`);
  }
}
if (collisions.length === 0) console.log('  ok         aucune');

/* ================================================ finding 2: frozen palette */

// Tailwind palette utilities carry a numeric shade; semantic ones never do.
const PALETTE = /\b(?:bg|text|border|ring|from|to|via|fill|stroke|divide|placeholder|caret|decoration|outline|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;
const IS_TEST = /\.(test|spec|e2e)\.tsx?$/;

const frozen = [];
console.log('\n2. couleurs Tailwind figées dans les composants\n');
for (const glob of UI_GLOBS) {
  for (const file of globSync(glob, { cwd: ROOT })) {
    if (IS_TEST.test(file)) continue;
    const hits = [...new Set(readFileSync(join(ROOT, file), 'utf8').match(PALETTE) ?? [])];
    if (hits.length) frozen.push({ file: file.replace(/\\/g, '/'), hits });
  }
}
if (frozen.length === 0) {
  console.log('  ok         aucune');
} else {
  for (const { file, hits } of frozen) {
    console.log(`  FIGÉ       ${file}`);
    console.log(`             ${hits.join(', ')}`);
  }
}

/* ==================================================== finding 3: contrast */

const PAIRS = [
  ['foreground', 'background'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
  ['destructive-foreground', 'destructive'],
  ['warning-foreground', 'warning'],
  ['success-foreground', 'success'],
  ['info-foreground', 'info'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['muted-foreground', 'muted'],
  // Status hues drawn straight on the page background (icons, standalone text).
  ['warning-strong', 'background'],
  ['success-strong', 'background'],
  ['info-strong', 'background'],
];

const belowAa = [];
console.log(`\n3. contraste WCAG AA des paires token / token-foreground (seuil ${AA_NORMAL_TEXT}:1)\n`);
for (const { name, env } of COMBOS) {
  for (const [foreground, surface] of PAIRS) {
    const fg = tokenOf(env, foreground);
    const bg = tokenOf(env, surface);
    if (!fg || !bg || fg.some(Number.isNaN) || bg.some(Number.isNaN)) {
      belowAa.push({ combo: name, pair: `${foreground} / ${surface}`, ratio: null });
      console.log(`  ABSENT     ${name.padEnd(14)} ${foreground} / ${surface}`);
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    if (ratio >= AA_NORMAL_TEXT) continue;
    belowAa.push({ combo: name, pair: `${foreground} / ${surface}`, ratio });
    console.log(`  SOUS AA    ${name.padEnd(14)} ${ratio.toFixed(2).padStart(5)}:1  ${foreground} / ${surface}`);
  }
}
if (belowAa.length === 0) {
  console.log(`  ok         ${COMBOS.length * PAIRS.length} paires >= ${AA_NORMAL_TEXT}:1`);
}

/* ============================ finding 4: text on the real backdrop layer */

// --background is not what the reader actually sees. In the miami theme the
// content sits on the .page-background gradient (primary -> secondary), and in
// the neutral theme on --background with three translucent orbs floating over
// it. Measuring against --background alone overstates the real contrast.

// oklch() arguments nest — oklch(var(--primary)) — so parentheses have to be
// balanced rather than matched with [^)]+, which stops at the inner one.
const oklchArgumentsIn = value => {
  const found = [];
  const opener = /oklch\(/g;
  let match;
  while ((match = opener.exec(value))) {
    let depth = 1;
    let i = match.index + match[0].length;
    while (i < value.length && depth > 0) {
      if (value[i] === '(') depth += 1;
      else if (value[i] === ')') depth -= 1;
      i += 1;
    }
    found.push(value.slice(match.index + match[0].length, i - 1).trim());
  }
  return found;
};

// Later rules win at equal specificity, so keep the last one that paints.
const backgroundValueOf = sel => {
  const painting = blocksOf(sel).filter(b => /background:/.test(b));
  return painting.length ? painting.at(-1).match(/background:\s*([^;]+);/)?.[1].trim() : null;
};

const backdropsFor = (theme, mode) => {
  // Weakest first; `[data-mode] .page-background` and `[data-theme] .page-background`
  // tie on specificity, and the theme rule comes later in the file.
  let painted = null;
  for (const sel of [
    '.page-background',
    `[data-mode="${mode}"] .page-background`,
    `[data-theme="${theme}"] .page-background`,
  ]) {
    painted = backgroundValueOf(sel) ?? painted;
  }
  // A transparent page-background hands the job back to body.
  if (painted === 'transparent') painted = backgroundValueOf(`[data-theme="${theme}"] body`);
  return painted ? oklchArgumentsIn(painted) : [];
};

// Composite a translucent orb over an opaque backdrop, in linear-light sRGB.
const compositeOver = (source, alpha, backdrop) => {
  const [sr, sg, sb] = oklchToLinearRgb(...source);
  const [br, bg, bb] = oklchToLinearRgb(...backdrop);
  return [sr * alpha + br * (1 - alpha), sg * alpha + bg * (1 - alpha), sb * alpha + bb * (1 - alpha)];
};

const luminanceOfLinear = ([r, g, b]) => {
  const [lr, lg, lb] = [r, g, b].map(u => gammaDecode(clamp01(gammaEncode(u))));
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

const ratioFromLuminances = (a, b) => {
  const [lighter, darker] = [a, b].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

const backdropFindings = [];
let backdropSamples = 0;
console.log('\n4. contraste du texte sur le calque de fond réel (dégradé de page + orbes)\n');
for (const { name, env } of COMBOS) {
  const [theme] = name.split('/');
  const foreground = tokenOf(env, 'foreground');
  const orbs = ['orb-1', 'orb-2', 'orb-3']
    .map(orb => resolve(env, env[`--${orb}`]))
    .filter(Boolean)
    .map(value => {
      const inner = value.match(/oklch\(([^)]+)\)/)?.[1] ?? '';
      const [triple, alpha] = inner.split('/').map(p => p.trim());
      return { triple: triple.split(/\s+/).map(Number), alpha: Number(alpha ?? 1) };
    })
    .filter(orb => orb.triple.length === 3 && orb.triple.every(n => !Number.isNaN(n)));

  for (const stop of backdropsFor(theme, name.split('/')[1])) {
    const resolved = resolve(env, stop);
    const triple = resolved.split('/')[0].trim().split(/\s+/).map(Number);
    if (triple.length !== 3 || triple.some(Number.isNaN)) continue;

    // Worst case seen by the reader: bare stop, and the stop under each orb.
    const candidates = [
      { label: 'nu', luminance: relativeLuminance(triple) },
      ...orbs.map((orb, i) => ({
        label: `orbe ${i + 1}`,
        luminance: luminanceOfLinear(compositeOver(orb.triple, orb.alpha, triple)),
      })),
    ];
    for (const { label, luminance } of candidates) {
      backdropSamples += 1;
      const ratio = ratioFromLuminances(relativeLuminance(foreground), luminance);
      if (ratio >= AA_NORMAL_TEXT) continue;
      backdropFindings.push({ combo: name, stop: resolved, label, ratio });
      console.log(
        `  SOUS AA    ${name.padEnd(14)} ${ratio.toFixed(2).padStart(5)}:1  --foreground sur ${resolved} (${label})`
      );
    }
  }
}
// A silent zero would look identical to a check that measured nothing, so the
// sample count is reported and an empty measurement is itself a failure.
if (backdropSamples === 0) {
  backdropFindings.push({ combo: '-', stop: '-', label: 'aucun point mesuré', ratio: null });
  console.log('  MUET       aucun point de fond mesuré — extraction du calque cassée');
} else if (backdropFindings.length === 0) {
  console.log(`  ok         ${backdropSamples} points de fond mesurés, tous >= ${AA_NORMAL_TEXT}:1`);
}

/* ================================= finding 5: hand-written vendor prefixes */

// Declaring `-webkit-backdrop-filter` next to the standard property makes the
// build pipeline (Lightning CSS, driven by browserslist) drop the unprefixed
// one and keep only the prefixed form. Chrome 151 no longer honours the
// -webkit- alias — CSS.supports('-webkit-backdrop-filter', 'blur(4px)') is
// false — so the glass blur silently stopped applying. Let the tooling emit
// prefixes; never hand-write them.
const HAND_PREFIXED = /^\s*-(?:webkit|moz|ms|o)-(backdrop-filter|filter|backface-visibility|user-select)\s*:/gm;

const prefixed = [...css.matchAll(HAND_PREFIXED)].map(m => m[1]);
console.log('\n5. préfixes vendeur écrits à la main dans globals.css\n');
if (prefixed.length === 0) {
  console.log('  ok         aucun — les préfixes sont laissés au pipeline');
} else {
  for (const property of new Set(prefixed)) {
    console.log(`  PRÉFIXÉ    -webkit-${property} (${prefixed.filter(p => p === property).length} fois)`);
  }
  console.log('             le pipeline supprime alors la propriété standard');
}

/* ==================================================================== verdict */

const total = collisions.length + frozen.length + belowAa.length + backdropFindings.length + prefixed.length;
console.log(
  `\n${collisions.length} collision(s), ${frozen.length} fichier(s) à palette figée, ` +
    `${belowAa.length} paire(s) sous AA, ${backdropFindings.length} point(s) de fond sous AA, ` +
    `${prefixed.length} préfixe(s) manuel(s).`
);
process.exit(total > 0 ? 1 : 0);
