# Audit design tokens — 2026-08-15

> Déclenché en rendant les aperçus du design system pour la synchro `claude.ai/design`.
> **11 findings, tous corrigés.** Chaque chiffre de ce document est produit par une
> commande rejouable ; aucun n'est repris d'une source secondaire.

## Comment rejouer l'audit entier

```bash
npm run check:tokens:calibrate   # prouve que le gate échoue sur l'état fautif et passe sur l'état corrigé
npm run check:tokens             # attendu : exit 0, "0 collision(s), 0 fichier(s) à palette figée,
                                 #            0 paire(s) sous AA, 0 point(s) de fond sous AA,
                                 #            0 préfixe(s) manuel(s), 0 token(s) hors gamut."
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
faire échouer le gate. Corrigé ; la calibration couvre désormais les 6 classes.

---

## F8 — 19 tokens hors gamut sRGB, dont 3 peints d'une autre couleur

Repéré en vérifiant le rendu du bundle : le panneau *miami · light* ressortait **cyan** là où la
doc annonce un blanc cassé.

`--background` composait sa chroma depuis `--secondary-c` (0.1066). À L 0.9750 cette chroma est
**inatteignable** : le canal bleu sRGB monte à 1.249 et se fait écrêter. La chroma maximale à cette
lightness et cette teinte est **0.0138** — soit 7,7 fois moins que ce qui était déclaré.

**« Hors gamut » n'est pas automatiquement un défaut.** Un néon volontairement saturé s'écrête vers
sa propre teinte : c'est l'usage normal d'OKLCH. Le défaut, c'est quand l'écrêtage peint *autre
chose*. La mesure discriminante est donc l'écart OKLab entre la couleur **déclarée** et la couleur
**réellement peinte**, pas le simple dépassement de gamut.

Les 19 tokens hors gamut se séparaient nettement :

| Écart OKLab | Tokens | Verdict |
|---|---|---|
| 0.0884 | `miami/light --background` | déclaré blanc cassé, peint cyan |
| 0.0579 | `--warning-strong` (les 2 thèmes, light) | teinte décalée |
| 0.0261 | `--info-strong` (light) | limite |
| 0.0175 à 0.0251 | `--accent`, `--primary`, `--ring`, `--card`, `--destructive`… | néon Miami délibéré |

**Corrections.**

- `--bg-c` introduit dans la composition, valant `--secondary-c` par défaut et **0.0130** en mode
  clair. Le fond retrouve son blanc cassé sans toucher à la surface `secondary`.
  Écart : **0.0884 → 0.0010**.
- Chroma des variantes `*-strong` ramenée sous le maximum atteignable à L 0.45 (la plus contrainte
  des deux lightness) : **0.1000 / 0.1200 / 0.0900** pour ambre / vert / bleu, contre 0.16 / 0.15 /
  0.12. Ces trois tokens avaient été introduits le jour même avec une chroma que rien ne pouvait
  peindre.
- Le néon Miami pré-existant (`--accent`, `--primary`, `--ring`) est **laissé tel quel** : écart
  maximal 0.0251, l'écrêtage y reste dans la teinte voulue. Le désaturer changerait l'identité.

**Contrôle : §6** — seuil OKLab **0.05**, posé sur la distribution mesurée et non au jugé : le néon
délibéré plafonne à 0.0251, les trois tokens réellement faux se tenaient entre 0.0579 et 0.0884.
Le seuil laisse une marge nette des deux côtés.

## F9 — `--accent-hover` déclaré trois fois, utilisé nulle part

Trouvé en enquêtant sur F8 : `--accent-hover` était déclaré dans les deux blocs neutral et dans la
composition, et n'était référencé ni dans `src/`, ni dans `app/`, ni dans `tailwind.config.js`, ni
ailleurs dans `globals.css`. Token mort, supprimé — avec son écart de gamut de 0.0400.

```bash
grep -rn "accent-hover" src app tailwind.config.js src/styles/globals.css
```

---

## F10 — le pool de tests échouait au démarrage sous charge

`npx vitest run` n'avait lancé que **18 fichiers / 385 tests** sur 28 / 571, avec 10 ×
`Timeout starting forks runner`.

**Cause racine**, lue dans la source et non devinée : `WORKER_START_TIMEOUT = 5e3` dans
`vitest/dist/chunks/cli-api.*.js` — 5 secondes en dur pour démarrer un worker, **sans option de
configuration**. Sur Windows, un processus Node froid sous contention CPU ne tient pas ce délai.

Le flake dépend de la charge : machine au repos, 3 runs sur 3 étaient propres. Il a donc fallu un
harnais qui sature les 12 cœurs avant de lancer la suite — `scripts/bench-vitest-pool.mjs`.

Mesures sur 12 cœurs saturés, 2 runs par configuration, **vitest 4.0.8** :

| Configuration | timeouts | résultat |
|---|---|---|
| forks parallèle (défaut) | 9 et 10 | exit 1 — un run n'a collecté que **19/28 fichiers** |
| forks `maxForks=3` | 10 et 10 | exit 1 — **réduire le nombre de workers ne change rien** |
| threads parallèle | 0 et 3 | pas immunisé |
| `fileParallelism: false` | 0 et 0 | exit 0, 4 runs sur 4 |

L'hypothèse « trop de workers simultanés » est **falsifiée par la mesure** : le problème est le boot
d'un worker isolé sous CPU affamé, pas leur nombre.

**Résolution.** Le correctif n'est finalement pas une option de config : `npm audit fix` a fait
passer vitest de 4.0.8 à **4.1.10**, où la même constante vaut `9e4` — **90 secondes**. L'upstream a
corrigé la cause. Re-mesuré sur 12 cœurs saturés en 4.1.10 :

| Configuration | timeouts | fichiers | durée |
|---|---|---|---|
| forks parallèle (défaut) | 0 et 0 | 28/28, 571/571 | 52 s / 44 s |
| `fileParallelism: false` | 0 et 0 | 28/28, 571/571 | 102 s / 112 s |

`fileParallelism: false` a donc été **retiré** : il aurait coûté le double du temps pour un problème
qui n'existe plus. `vitest.config.ts` garde un commentaire pointant vers le harnais.

```bash
node scripts/bench-vitest-pool.mjs 2   # sature les coeurs et compare les configurations
```

## F11 — `caniuse-lite` périmé de 10 mois, et une CVE critique dans vitest

`caniuse-lite` était en `1.0.30001751` ; chaque build affichait l'avertissement browserslist.
Mis à jour en **`1.0.30001809`**. Les cibles passent de `chrome 140/141` à `chrome 150/151`,
`safari 18.5` à `safari 26.3/26.4`.

Effet direct sur F6 : avec ces cibles, Lightning CSS n'émet plus **que** la propriété non préfixée.
Vérifié dans le CSS de production — `backdrop-filter` × 6, `-webkit-backdrop-filter` × 0.

**Effet de bord signalé** : `update-browserslist-db` fait un `npm install` puis un `npm uninstall`,
ce qui a retiré `baseline-browser-mapping` des devDependencies directes. Vérifié avant d'accepter :
aucun import dans le code, et le paquet reste fourni transitivement par `browserslist` et `next`.
La dépendance directe était redondante.

**Trouvé au passage** : `npm audit` remontait **1 vulnérabilité critique** — GHSA-5xrq-8626-4rwp,
CVSS 9.8, lecture et exécution de fichier arbitraire quand le serveur `vitest --ui` écoute. Le gate
6/7 du pre-push bloque sur `critical > 0`. `npm audit fix` l'a résolue en montant vitest à 4.1.10,
dans la plage `^4.0.5` déjà déclarée.

Restaient **4 vulnérabilités `high`**, toutes de la même racine : `extract-zip` (traversée de chemin
par lien symbolique, GHSA-jmr9-qjv8-65gv) via `@puppeteer/browsers` → `puppeteer` / `puppeteer-core`.
Leur correction demandait une montée majeure `puppeteer 24.43.1 → 25.7.0`. Appliquée, puis
**vérifiée** plutôt que supposée : toute la surface API que `e2e/` utilise a été rejouée contre un
serveur de dev réel — `launch`, `newPage`, `setViewport`, `setRequestInterception`, `on('request')`,
`goto`, `waitForSelector`, `click`, `type`, `waitForFunction`, `evaluate`, `reload`, `close`.

`npm audit` : **0 critical, 0 high, 0 moderate, 0 low**.

---

## Ce qui reste ouvert

- **Teintes d'alerte peu différenciées en thème miami.** Le fond de page miami est un navy saturé
  (C 0.1066) : une teinte de statut à 15 % ne décale pas assez la couleur, les trois variantes
  d'alerte se ressemblent. En thème neutral (fond achromatique) elles se distinguent nettement.
  Piste : monter l'alpha à 25–30 % pour miami uniquement.

## Périmètre non couvert par le gate

Le gate lit `globals.css` et le code source. Il ne rend rien. Il ne voit donc pas :
les contrastes composés sur les surfaces glass translucides, les états `:hover` / `:focus-visible`,
le contraste non-textuel des bordures (WCAG 1.4.11), les couleurs posées en style inline. Ces points
relèvent de `e2e/accessibility.e2e.ts` (axe-core) et de la revue visuelle.
