# 📊 RÉSUMÉ AUDIT & DÉLÉGATION CLAUDE.AI

Date: 2025-11-11
Projet: HAY Chess Tracker
Status: ✅ Code propre TypeScript/ESLint atteint

---

## ✅ ÉTAT ACTUEL (Claude Code)

### Phase 1 & 2 - TERMINÉES

| Catégorie | Status | Résultat |
|-----------|--------|----------|
| **TypeScript** | ✅ | 0 erreurs (41 → 0) |
| **ESLint erreurs** | ✅ | 0 erreurs (2 → 0) |
| **ESLint warnings** | ✅ | 0 warnings (5 → 0) |
| **Build Next.js** | ✅ | Success |
| **Sécurité (npm audit)** | ✅ | 0 vulnérabilités |

### Tests Unitaires - PARTIELS ⚠️

```
✓ 12 tests passing
✗ 4 tests failing (parser.test.ts)
✗ 5 suites failing (configuration Vitest)
```

**Problèmes identifiés**:
- Vitest ne résout pas les imports `@/components/ui/*`
- `@testing-library/jest-dom` incompatible avec Vitest
- Environment jsdom mal configuré (window undefined)

**Action requise**: Corriger configuration Vitest (délégation possible à Claude.ai)

---

## 🎯 TÂCHES À DÉLÉGUER (Claude.ai Web)

### ⚡ PRIORITÉ 1 - Performance & Accessibilité

**Fichier d'instructions**: `.claude/prompts/PERFORMANCE-ACCESSIBILITY-AUDIT.md`

**Objectif**: Lighthouse scores ≥ 95/100 (tous)

**Temps estimé**: 3-4 heures

**Livrables attendus**:
1. Script `scripts/lighthouse-audit.js` fonctionnel
2. Toutes images converties en Next.js Image component
3. Fonts optimisées (display: swap, preload)
4. Bundle splitting (framer-motion, radix-ui)
5. Métadonnées SEO complètes (OpenGraph, Twitter)
6. Sitemap.xml et robots.txt
7. Score Lighthouse ≥ 95 sur tous axes
8. Accessibilité WCAG 2.1 AA (100/100)

**Critères d'acceptation**:
- ✅ `npm run build` succès
- ✅ `npm run lint` 0 erreurs
- ✅ `node scripts/lighthouse-audit.js` tous scores ≥ 95
- ✅ Aucune régression fonctionnelle

### 🔍 PRIORITÉ 2 - Code Quality & Complexité

**Fichier d'instructions**: `.claude/prompts/CODE-QUALITY-COMPLEXITY-AUDIT.md`

**Objectif**: Complexité < 10, Duplication < 5%, Coverage ≥ 80%

**Temps estimé**: 4-5 heures

**Livrables attendus**:
1. Script `scripts/code-quality-audit.js` fonctionnel
2. Complexité cyclomatique < 10 toutes fonctions
3. Duplication code < 5%
4. Custom hooks extraits (useFetch, etc.)
5. Utility functions (validation, formatters, calculations)
6. Tests coverage ≥ 80% sur src/lib/
7. Documentation ARCHITECTURE.md
8. ESLint config stricte (sonarjs, complexity)

**Critères d'acceptation**:
- ✅ `node scripts/code-quality-audit.js` tous checks pass
- ✅ `npm run test:coverage` ≥ 80%
- ✅ `npm run lint` 0 erreurs
- ✅ Tous tests passent
- ✅ Aucune régression fonctionnelle

---

## 📝 INSTRUCTIONS POUR CLAUDE.AI

### 🚀 Comment démarrer

1. **Ouvrir Claude.ai** (https://claude.ai)

2. **Cloner le projet localement**:
   ```bash
   git clone https://github.com/pierrealexandreguillemin-a11y/hay-chess-tracker.git
   cd hay-chess-tracker
   npm install
   ```

3. **Lancer le serveur de dev**:
   ```bash
   npm run dev
   ```

4. **Copier-coller le prompt dans Claude.ai**:

   Pour la tâche 1 (Performance):
   ```
   Je travaille sur le projet HAY Chess Tracker (Next.js 16 + TypeScript).

   CONTEXTE:
   - Le code est propre: 0 erreurs TypeScript, 0 erreurs ESLint
   - Build Next.js fonctionne
   - 0 vulnérabilités npm

   MISSION:
   Optimiser les performances et l'accessibilité pour atteindre Lighthouse ≥ 95/100 sur tous les axes.

   INSTRUCTIONS COMPLÈTES:
   [Copier-coller le contenu de .claude/prompts/PERFORMANCE-ACCESSIBILITY-AUDIT.md]

   IMPORTANT:
   - Obligation de résultat: code 100% fonctionnel
   - Tester après chaque modification: npm run build && npm run lint
   - Commit atomique par catégorie d'optimisation
   - Si un check échoue, corriger avant de continuer
   - À la fin, tous les scripts d'audit doivent passer ✅
   ```

   Pour la tâche 2 (Code Quality):
   ```
   [Même format avec CODE-QUALITY-COMPLEXITY-AUDIT.md]
   ```

### ⚠️ RÈGLES STRICTES

**Claude.ai DOIT**:
1. Tester après CHAQUE modification
2. Faire des commits atomiques avec messages descriptifs
3. Ne JAMAIS casser les fonctionnalités existantes
4. Documenter chaque pattern utilisé
5. Atteindre 100% des critères d'acceptation

**Claude.ai NE DOIT PAS**:
1. Push du code non testé
2. Ignorer les erreurs de build/lint
3. Modifier l'API ou la structure des données sans justification
4. Supprimer des fonctionnalités existantes
5. Commit sans message descriptif

### 🔄 Workflow recommandé

```bash
# 1. Créer une branche
git checkout -b perf/lighthouse-optimization

# 2. Faire les modifications
# ... éditer les fichiers

# 3. Tester
npm run build
npm run lint
npx tsc --noEmit

# 4. Commit si tous les tests passent
git add .
git commit -m "perf: optimize images with Next.js Image component

- Convert all <img> to <Image>
- Add WebP format
- Implement lazy loading
- Add blur placeholders

Lighthouse Performance: +15 points
"

# 5. Continuer jusqu'à atteindre l'objectif

# 6. Push final
git push origin perf/lighthouse-optimization
```

### 📋 Checklist finale avant push

- [ ] `npm run build` ✅ succès
- [ ] `npm run lint` ✅ 0 erreurs
- [ ] `npx tsc --noEmit` ✅ 0 erreurs
- [ ] `node scripts/lighthouse-audit.js` ✅ tous scores ≥ 95 (tâche 1)
- [ ] `node scripts/code-quality-audit.js` ✅ tous checks pass (tâche 2)
- [ ] `npm run test:coverage` ✅ ≥ 80% (tâche 2)
- [ ] Tests fonctionnels manuels ✅ aucune régression
- [ ] Commit message descriptif ✅ avec métriques avant/après

---

## 📊 TRACKING PROGRÈS

### Tâche 1: Performance & Accessibilité

- [ ] Scripts lighthouse installés et fonctionnels
- [ ] Images optimisées (Next.js Image)
- [ ] Fonts optimisées
- [ ] Bundle splitting configuré
- [ ] Metadata SEO complètes
- [ ] Sitemap + robots.txt
- [ ] Accessibilité WCAG AA (aria-labels, keyboard nav)
- [ ] **Score Lighthouse ≥ 95/100 sur tous axes**

### Tâche 2: Code Quality & Complexité

- [ ] Scripts audit installés et fonctionnels
- [ ] ESLint strict config
- [ ] Complexité < 10 toutes fonctions
- [ ] Duplication < 5%
- [ ] Custom hooks extraits
- [ ] Utility functions créées
- [ ] Tests coverage ≥ 80%
- [ ] **Tous les checks qualité passent**

---

## 🎯 CRITÈRES D'ACCEPTATION GLOBAUX

**Claude Code validera le travail de Claude.ai SI ET SEULEMENT SI**:

```bash
# Tous ces checks passent:
npm run build          # ✅ Build Next.js succès
npm run lint           # ✅ 0 erreurs ESLint
npx tsc --noEmit       # ✅ 0 erreurs TypeScript
npm test               # ✅ Tous les tests passent

# Tâche 1:
node scripts/lighthouse-audit.js  # ✅ ≥95/100 tous scores

# Tâche 2:
node scripts/code-quality-audit.js  # ✅ Tous checks pass
npm run test:coverage              # ✅ ≥80% coverage
```

**Si un seul check échoue** → Claude.ai doit corriger.

---

## 💡 CONSEILS POUR CLAUDE.AI

### Approche incrémentale recommandée

**Phase 1** (Tâche 1):
1. Setup scripts + tests initiaux (1h)
2. Images + fonts (1h)
3. Bundle + metadata (1h)
4. Accessibilité (1h)

**Phase 2** (Tâche 2):
1. Setup scripts + ESLint config (1h)
2. Extract custom hooks (1h)
3. Reduce complexity (1.5h)
4. Add tests for coverage (1.5h)

### Debugging tips

**Si Lighthouse score bas**:
- Vérifier Network tab pour assets lourds
- Utiliser `npm run build` puis `npm start` (pas dev)
- Tester en incognito (pas de cache/extensions)

**Si tests échouent**:
- Vérifier vitest.config.ts
- Checker les imports @/
- Logger les erreurs avec console.log

**Si build échoue**:
- Lire le message d'erreur complet
- Vérifier les imports manquants
- Checker tsconfig.json

---

## 📞 CONTACT

Si blocage technique, documenter:
1. Commande exécutée
2. Erreur complète (copier-coller)
3. Fichier/ligne concernée
4. Modifications tentées

Et soumettre via issue GitHub ou revenir vers Claude Code.

---

**Bonne chance Claude.ai ! 🚀**

*Remember: Obligation de résultat = 0 erreurs, 0 régression, 100% checks pass*
