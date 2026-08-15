# Audit design tokens — 2026-08-15

> Déclenché en rendant les aperçus du design system pour la synchro `claude.ai/design`.
> **7 findings, tous corrigés et sous gate.** Chaque chiffre de ce document est produit par une
> commande rejouable ; aucun n'est repris d'une source secondaire.

## Comment rejouer l'audit entier

```bash
npm run check:tokens:calibrate   # prouve que le gate échoue sur l'état fautif et passe sur l'état corrigé
npm run check:tokens             # attendu : exit 0, "0 collision(s), 0 fichier(s) à palette figée,
                                 #            0 paire(s) sous AA, 0 point(s) de fond sous AA,
                                 #            0 préfixe(s) manuel(s)."
```

Le gate est branché en **étape 5/7 du pre-push** (`.husky/pre-push`). Un push qui le rougit est bloqué.

**Pourquoi la calibration compte.** Un gate qui affiche « ok » sans avoir jamais été vu échouer ne
prouve rien — le contrôle 4 de cet audit a d'ailleurs affiché « ok » pendant une première version
alors qu'il ne mesurait **rien** (extraction du dégradé cassée). `check:tokens:calibrate` fait
tourner le gate sur deux arbres jumeaux, `scripts/__fixtures__/clean` et `.../broken`, ce dernier
portant une faute par classe de finding ; il exige exit 0 sur le premier, exit 1 **et** un marqueur
par classe sur le second.

---

## F1 — `--secondary` identique à `--background` (2 combinaisons sur 4)

**Symptôme.** Le bouton et le badge `secondary` n'avaient aucun fond visible sur la page.

| Combinaison | `--secondary` avant | `--background` | après |
|---|---|---|---|
| miami / dark | `0.3261 0.1066 255.1` | `0.3261 0.1066 255.1` | `0.4200 0.1066 255.1` |
| neutral / light | `0.975 0.005 260` | `0.975 0.005 260` | `0.89 0.005 260` |

Miami/light (`0.4000` vs `0.9750`) et neutral/dark (`0.35` vs `0.27`) étaient sains.

**Valeurs retenues.** miami/dark `0.4200` → 8.50:1 avec son foreground, écart de lightness 0.094
avec le fond. neutral/light `0.89` → 12.46:1, et distinct de `--muted` (0.93) et `--card` (0.96).

**Contrôle : `check-design-tokens.mjs` §1** — compare 6 tokens de surface à `--background` sur les 4
combinaisons.

---

## F2 — couleurs Tailwind figées dans 5 composants

Des couleurs de palette fixes (`bg-green-100`, `text-amber-600`, `from-amber-500`…) rendaient ces
composants aveugles au thème et au mode.

| Fichier | Avant | Après |
|---|---|---|
| `ui/badge.tsx` | `bg-green-100 text-green-800`, `bg-yellow-100`, `bg-blue-100` | `bg-success/warning/info` + `-foreground` |
| `ui/alert.tsx` | `bg-green-50 border-green-200 text-green-800`, idem jaune | teinte `/15` + bordure `/40`, texte `--foreground` |
| `DebugPanel.tsx` | `border-amber-500/50`, `text-amber-600`, `from-amber-500 to-orange-600` | `border-warning/50`, `text-warning-strong`, `from-warning-strong to-accent` |
| `ShareButton.tsx` | `text-green-600` | `text-success-strong` |
| `ShareEventModal.tsx` | `bg-green-100 border-green-500 text-green-700`, alerte ambre réimplémentée | tokens `success`, `<Alert variant="warning">` |

**Trois tokens créés** (`--success`, `--info`, plus la variante `*-strong`), déclarés **une seule
fois** dans la composition `:root` — les couleurs de statut ne dépendent ni du thème ni du mode :

```css
--status-l: 0.7200;      /* pastille claire */
--status-fg-l: 0.2200;   /* texte sombre dessus */
--warning: var(--status-l) 0.1600 65.0;
--success: var(--status-l) 0.1500 150.0;
--info:    var(--status-l) 0.1200 230.0;
```

`--warning` était auparavant déclaré **trois fois** avec les mêmes valeurs (bloc miami + les deux
blocs neutral) ; la dé-duplication fait partie du correctif.

**Pourquoi une variante `*-strong`.** Une pastille porte son propre fond, sa lightness peut donc être
invariante. Une icône dessinée **directement sur le fond de page** ne le peut pas : `--warning`
(L 0.72) sur un fond clair tombe à ~2.1:1. `--status-strong-l` suit le mode (0.78 sombre / 0.45
clair) et tient 6.04 à 7.77:1 dans les 4 combinaisons.

**Contrôle : §2** — scanne `src/components/**` et `app/**` (tests exclus) et rejette toute classe
`bg|text|border|ring|from|to|via|fill|stroke|…`-`<palette>`-`<nuance>`.

---

## F3 — `<alpha-value>` absent : 82 utilitaires d'opacité ne généraient aucun CSS

`tailwind.config.js` déclarait `primary: "oklch(var(--primary))"` sans `<alpha-value>`. Tailwind 3.4
ne peut alors pas injecter l'alpha et **supprime purement l'utilitaire**.

Preuve dans les deux sens, avec le CLI Tailwind sur la config de `HEAD` puis sur la config corrigée :

```bash
printf '<div class="bg-primary/80 border-primary/30"></div>' > /tmp/probe.html
git show HEAD:tailwind.config.js > tailwind.before.js
npx tailwindcss -c tailwind.before.js -i src/styles/globals.css -o /tmp/before.css --content /tmp/probe.html
npx tailwindcss -c tailwind.config.js  -i src/styles/globals.css -o /tmp/after.css  --content /tmp/probe.html
diff /tmp/before.css /tmp/after.css
```

```diff
+ .border-primary\/30 { border-color: oklch(var(--primary) / 0.3); }
+ .bg-primary\/80     { background-color: oklch(var(--primary) / 0.8); }
```

Les deux règles sont **absentes** avant, présentes après. **82 occurrences** dans le code (37 classes
distinctes) étaient concernées : `border-primary/30` (13), `bg-primary/10` (12), `text-primary/80`
(5), `bg-destructive/90` (4), tous les `hover:bg-*/80|90`…

```bash
grep -rEoh '\b(bg|text|border|ring|from|to|via)-(primary|secondary|destructive|muted|accent|popover|card|background|foreground|border|input|ring)(-foreground)?/[0-9]+' src app --include=*.tsx | sort | uniq -c | sort -rn
```

**Correction de mon diagnostic initial.** J'ai d'abord attribué à ce défaut le bouton `variant="gradient"`
sans fond. C'était faux : le diff ci-dessus montre que `from-primary` / `to-secondary` **étaient**
générés avant le correctif (sous la forme `oklch(var(--primary))`, sans alpha). Le bouton
« Commencer » paraissait transparent à cause de `disabled:opacity-50`, le champ club étant vide —
comportement voulu. Vérifié dans le navigateur, champ rempli : `background-image:
linear-gradient(to right, oklch(0.55 0.1003 202.7), oklch(0.42 0.1066 255.1))`, entièrement opaque.

---

## F4 — 12 paires token / token-foreground sous WCAG AA

`docs/ISO-COMPLIANCE.md` annonçait la conformité AA. La mesure la contredisait.

Conversion OKLCH → sRGB implémentée selon Ottosson, avec clipping de gamut (encodage gamma, clamp
[0,1], décodage) puis luminance relative WCAG. **Auto-testée** : blanc contre noir doit donner
21.00:1, sinon le gate sort en code 2 et ne rapporte rien.

| Combinaison | Paire | Avant | Correction | Après |
|---|---|---|---|---|
| miami/dark | primary | **3.95** | L 0.5890 → 0.5500 | 4.59 |
| miami/dark | accent | **3.36** | L 0.6647 → 0.5850 | 4.62 |
| miami/dark | destructive | **3.78** | L 0.6356 → 0.5850 | 4.66 |
| miami/dark | warning | **2.57** | texte blanc → L 0.22 | 6.72 |
| miami/light | warning | 5.03 | idem, unifié | 6.72 |
| neutral/dark | primary | **3.37** | L 0.65 → 0.575 | 4.51 |
| neutral/dark | accent | **2.51** | L 0.70 → 0.55 | 4.52 |
| neutral/dark | destructive | **3.55** | L 0.65 → 0.59 | 4.54 |
| neutral/dark | warning | **2.57** | texte blanc → L 0.22 | 6.72 |
| neutral/dark | muted-fg | **4.39** | L 0.60 → 0.61 | 4.57 |
| neutral/light | accent | **3.32** | L 0.627 → 0.55 | 4.54 |
| neutral/light | warning | **3.15** | texte blanc → L 0.22 | 6.72 |

**Arbitrage retenu (hybride, validé par le propriétaire).** Les surfaces de marque
(primary, destructive, accent) sont assombries et gardent leur texte blanc — delta maximal 0.15 de
lightness. Les couleurs de statut (ambre, vert, bleu) passent en **pastille claire + texte sombre**,
le standard de l'industrie : le blanc sur ambre demandait de descendre l'ambre à L 0.575, ce qui en
fait un brun doré. `--ring` suit `--primary` (0.5500) pour rester cohérent.

L'aqua Miami perd 0.039 de lightness, l'ambre ne bouge pas.

**Contrôle : §3** — 14 paires × 4 combinaisons = **56 paires**, seuil 4.5:1 (texte normal ; les badges
sont en 12 px semibold, donc hors « grand texte » WCAG).

---

## F5 — le contraste était mesuré contre le mauvais calque

Trouvé sur question du propriétaire : *« et les backgrounds, ils ne sont pas dans le design system ? »*

`--background` **n'est pas** ce que le lecteur voit. En thème miami, `.page-background` peint un
dégradé `--primary → --secondary → --primary` ; le contenu repose donc sur l'**aqua**, pas sur le
navy. En thème neutral, `.page-background` est `transparent`, c'est `body` qui porte `--background`,
avec **trois orbes translucides** par-dessus.

Conséquence directe : en miami/dark le texte de page reposait sur l'aqua à **3.95:1** avant F4 — le
fond de page lui-même échouait AA, et aucune mesure sur `--background` (12.51:1) ne pouvait le voir.

Après correction, les 16 points mesurés (4 butées de dégradé + orbes composés en sRGB linéaire) :

| Combinaison | point le plus serré | ratio |
|---|---|---|
| miami / dark | butée `--primary` `0.5500 0.1003 202.7` | **4.59:1** |
| miami / light | butée `0.92 …` | 13.17:1 |
| neutral / dark | fond sous l'orbe 1 | 8.93:1 |
| neutral / light | fond sous l'orbe 1 | 15.20:1 |

**Contrôle : §4** — rejoue la cascade CSS pour désigner la règle `background` gagnante par
combinaison, gère le renvoi vers `body` quand `.page-background` est `transparent`, extrait les
butées `oklch()` **à parenthèses équilibrées**, et compose chaque orbe sur chaque butée.

> Le contrôle §4 a d'abord affiché « ok » en ne mesurant **rien** : `oklch(var(--primary))` imbrique
> des parenthèses que l'extraction `[^)]+` coupait, et l'override `transparent` du thème neutral
> n'était pas géré. Le gate compte désormais ses échantillons et **échoue s'il n'en mesure aucun**
> (marqueur `MUET`). Un zéro silencieux est indiscernable d'un contrôle mort.

---

## F6 — le flou glassmorphism ne s'appliquait plus du tout

Trouvé sur remarque du propriétaire sur le liquid-glass.

`globals.css` écrivait le préfixe vendeur à la main :

```css
backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
-webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
```

Lightning CSS (transformateur CSS de Turbopack) supprime alors la propriété **standard** et ne sert
que la forme préfixée. Or **Chrome 151 a retiré l'alias `-webkit-`** :

```
CSS.supports('backdrop-filter',         'blur(4px)')  ->  true
CSS.supports('-webkit-backdrop-filter', 'blur(4px)')  ->  false
```

Sur le `.glass-card` réel, `getComputedStyle(el).backdropFilter` valait **`none`** dans les 4
combinaisons : ni flou, ni saturation. Tout l'effet verre était inerte.

**Correction** : supprimer les 4 déclarations préfixées à la main de `globals.css` et laisser le
pipeline émettre ce que les cibles browserslist demandent.

| | règle `.glass-card` servie | `getComputedStyle().backdropFilter` |
|---|---|---|
| avant | `-webkit-backdrop-filter: …` seul | `none` |
| après | `backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate))` | `blur(15px) saturate(1.3)` |

**Contrôle : §5** — rejette tout `-webkit-|-moz-|-ms-|-o-` écrit à la main sur `backdrop-filter`,
`filter`, `backface-visibility`, `user-select`.

---

## F7 — le verdict du gate n'additionnait pas les findings de fond

Le code de sortie ignorait `backdropFindings` : le contrôle §4 pouvait rapporter des échecs sans
faire échouer le gate. Corrigé ; la calibration couvre désormais les 5 classes.

---

## Ce qui reste ouvert

- **Le pool `forks` de Vitest échoue au démarrage sur cette machine Windows.**
  `npx vitest run --reporter=dot` n'a lancé que **18 fichiers / 385 tests** sur 28 / 571, avec
  10 × `Timeout starting forks runner`. Avec `--pool=threads`, **28 fichiers / 571 tests passent**.
  L'étape 7/7 du pre-push utilise le pool par défaut : elle est exposée au même flake.
  Non corrigé — ce n'est pas un défaut du design system et le changer touche la config de test.
- **`caniuse-lite` a 10 mois** (`1.0.30001751`) ; chaque build affiche l'avertissement browserslist.
  Sans lien avec F6 une fois les préfixes manuels retirés, mais à rafraîchir.
- **Teintes d'alerte peu différenciées en thème miami.** Le fond de page miami est un navy saturé
  (C 0.1066) : une teinte de statut à 15 % ne décale pas assez la couleur, les trois variantes
  d'alerte se ressemblent. En thème neutral (fond achromatique) elles se distinguent nettement.
  Piste : monter l'alpha à 25–30 % pour miami uniquement.

## Périmètre non couvert par le gate

Le gate lit `globals.css` et le code source. Il ne rend rien. Il ne voit donc pas :
les contrastes composés sur les surfaces glass translucides, les états `:hover` / `:focus-visible`,
le contraste non-textuel des bordures (WCAG 1.4.11), les couleurs posées en style inline. Ces points
relèvent de `e2e/accessibility.e2e.ts` (axe-core) et de la revue visuelle.
