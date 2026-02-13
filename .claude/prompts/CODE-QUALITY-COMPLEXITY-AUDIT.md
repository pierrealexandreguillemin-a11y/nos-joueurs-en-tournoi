# 🔍 AUDIT CODE SMELL & COMPLEXITÉ - HAY CHESS TRACKER

**Objectif**: Code maintenable, testable, sans duplication, complexité cyclomatique < 10

---

## 📋 INSTRUCTIONS STRICTES CLAUDE.AI

### ⚠️ RÈGLES ABSOLUES

1. **ZÉRO RÉGRESSION** - Tous les tests existants doivent passer
2. **REFACTORING INCRÉMENTAL** - Un fichier à la fois, commit atomique
3. **COUVERTURE DE TESTS** - Ajouter des tests pour chaque refactoring
4. **DOCUMENTATION** - Expliquer chaque pattern utilisé
5. **METRICS TRACKING** - Documenter la complexité avant/après

---

## 🛠️ PHASE 1 - SETUP & ANALYSE

### 1.1 Installation des outils

```bash
# Analyse de complexité
npm install --save-dev complexity-report

# Détection de duplication
npm install --save-dev jscpd

# Analyse statique
npm install --save-dev eslint-plugin-sonarjs eslint-plugin-complexity

# Coverage
npm install --save-dev @vitest/coverage-v8
```

### 1.2 Configuration ESLint complexité

**Fichier**: `.eslintrc.json`

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:sonarjs/recommended"
  ],
  "plugins": ["sonarjs", "complexity"],
  "rules": {
    "complexity": ["error", { "max": 10 }],
    "max-lines-per-function": ["warn", { "max": 50, "skipBlankLines": true, "skipComments": true }],
    "max-depth": ["error", 4],
    "max-nested-callbacks": ["error", 3],
    "sonarjs/cognitive-complexity": ["error", 15],
    "sonarjs/no-duplicate-string": ["error", 3],
    "sonarjs/no-identical-functions": "error",
    "sonarjs/no-collapsible-if": "error"
  }
}
```

### 1.3 Script d'analyse automatique

**Créer**: `scripts/code-quality-audit.js`

```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 CODE QUALITY AUDIT\n');

// 1. Complexité cyclomatique
console.log('📊 Complexité cyclomatique...');
try {
  const complexity = execSync(
    'npx complexity-report --format json src/**/*.{ts,tsx}',
    { encoding: 'utf-8' }
  );
  const data = JSON.parse(complexity);

  const highComplexity = data.reports
    .flatMap(r => r.functions)
    .filter(f => f.cyclomatic > 10)
    .sort((a, b) => b.cyclomatic - a.cyclomatic);

  if (highComplexity.length > 0) {
    console.log('❌ Fonctions avec complexité > 10:');
    highComplexity.forEach(fn => {
      console.log(`   ${fn.name} (${fn.line}): ${fn.cyclomatic}`);
    });
  } else {
    console.log('✅ Toutes les fonctions < 10 complexité');
  }
} catch (e) {
  console.log('⚠️  Erreur analyse complexité');
}

// 2. Code dupliqué
console.log('\n📋 Code dupliqué...');
try {
  execSync('npx jscpd src --min-lines 5 --min-tokens 50 --format json -o jscpd-report.json', {
    stdio: 'inherit'
  });

  const report = JSON.parse(fs.readFileSync('jscpd-report.json', 'utf8'));
  const duplicationPercentage = report.statistics.total.percentage;

  if (duplicationPercentage > 5) {
    console.log(`❌ ${duplicationPercentage}% de duplication (max: 5%)`);
    process.exit(1);
  } else {
    console.log(`✅ ${duplicationPercentage}% de duplication`);
  }
} catch (e) {
  console.log('⚠️  Erreur analyse duplication');
}

// 3. Métriques générales
console.log('\n📈 Métriques code...');
const srcFiles = execSync('find src -name "*.ts" -o -name "*.tsx" | wc -l', { encoding: 'utf-8' }).trim();
const totalLines = execSync('find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1', { encoding: 'utf-8' }).trim();

console.log(`   Fichiers: ${srcFiles}`);
console.log(`   Lignes totales: ${totalLines}`);
console.log(`   Moyenne lignes/fichier: ${Math.round(totalLines / srcFiles)}`);

console.log('\n✅ Audit terminé');
```

**Exécution**:
```bash
chmod +x scripts/code-quality-audit.js
node scripts/code-quality-audit.js
```

---

## 🎯 PHASE 2 - RÉDUCTION COMPLEXITÉ

### 2.1 Pattern: Extract Method

**Problème identifié**: Fonctions > 50 lignes ou complexité > 10

**Exemple - AVANT** (`src/components/TournamentTabs.tsx`):

```tsx
// ❌ Complexité: 15, Lignes: 80
const handleSync = async () => {
  setIsSyncing(true);
  try {
    const response = await fetch('/api/events/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: selectedEventId })
    });

    if (!response.ok) {
      const error = await response.json();
      toast.error(`Erreur: ${error.message}`);
      return;
    }

    const data = await response.json();

    if (data.success) {
      const updatedEvents = events.map(event =>
        event.id === selectedEventId
          ? { ...event, tournaments: data.tournaments }
          : event
      );
      setEvents(updatedEvents);
      toast.success('Synchronisation réussie');
    }
  } catch (error) {
    console.error('Sync error:', error);
    toast.error('Erreur réseau');
  } finally {
    setIsSyncing(false);
  }
};
```

**APRÈS - Refactorisé**:

```tsx
// ✅ Complexité: 3, Lignes: 15
const handleSync = async () => {
  setIsSyncing(true);
  try {
    const result = await syncEventWithServer(selectedEventId);
    if (result.success) {
      updateLocalEvents(selectedEventId, result.tournaments);
      showSuccessNotification();
    }
  } catch (error) {
    handleSyncError(error);
  } finally {
    setIsSyncing(false);
  }
};

// Fonctions extraites (à placer dans src/lib/sync-utils.ts)
async function syncEventWithServer(eventId: string) {
  const response = await fetch('/api/events/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

function updateLocalEvents(
  eventId: string,
  tournaments: Tournament[],
  events: Event[],
  setEvents: (events: Event[]) => void
) {
  const updated = events.map(event =>
    event.id === eventId
      ? { ...event, tournaments }
      : event
  );
  setEvents(updated);
}

function handleSyncError(error: unknown) {
  console.error('Sync error:', error);
  toast.error(
    error instanceof Error
      ? `Erreur: ${error.message}`
      : 'Erreur réseau'
  );
}
```

### 2.2 Pattern: Replace Conditional with Polymorphism

**Problème**: Switch/if-else multiples

**Exemple - AVANT** (`src/lib/parser.ts`):

```tsx
// ❌ Complexité: 12
function parseResult(resultStr: string): Result {
  if (resultStr === '1') return { opponent: '', result: 'win', color: 'white' };
  if (resultStr === '0') return { opponent: '', result: 'loss', color: 'white' };
  if (resultStr === '=') return { opponent: '', result: 'draw', color: 'white' };
  if (resultStr === '+') return { opponent: '', result: 'bye', color: 'white' };
  if (resultStr === '-') return { opponent: '', result: 'forfeit', color: 'white' };
  if (resultStr === 'EXE') return { opponent: '', result: 'exempt', color: 'white' };
  // ... 10 autres conditions
}
```

**APRÈS - Lookup Table**:

```tsx
// ✅ Complexité: 2
const RESULT_MAPPING: Record<string, Partial<Result>> = {
  '1': { result: 'win' },
  '0': { result: 'loss' },
  '=': { result: 'draw' },
  '+': { result: 'bye' },
  '-': { result: 'forfeit' },
  'EXE': { result: 'exempt' },
} as const;

function parseResult(resultStr: string): Result {
  const mapped = RESULT_MAPPING[resultStr] ?? { result: 'unknown' };
  return {
    opponent: '',
    color: 'white',
    ...mapped,
  };
}
```

### 2.3 Pattern: Early Return

**Exemple - AVANT**:

```tsx
// ❌ Complexité: 8, Profondeur: 4
function validateTournament(tournament: Tournament): boolean {
  if (tournament) {
    if (tournament.name) {
      if (tournament.url) {
        if (isValidUrl(tournament.url)) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    } else {
      return false;
    }
  } else {
    return false;
  }
}
```

**APRÈS**:

```tsx
// ✅ Complexité: 4, Profondeur: 1
function validateTournament(tournament: Tournament): boolean {
  if (!tournament) return false;
  if (!tournament.name) return false;
  if (!tournament.url) return false;
  if (!isValidUrl(tournament.url)) return false;
  return true;
}

// Encore mieux avec validation explicite
function validateTournament(tournament: Tournament): boolean {
  return Boolean(
    tournament?.name &&
    tournament?.url &&
    isValidUrl(tournament.url)
  );
}
```

---

## 🔄 PHASE 3 - ÉLIMINATION DUPLICATION

### 3.1 Extract Custom Hook

**Problème**: Logique dupliquée dans plusieurs composants

**Exemple - AVANT** (dupliqué dans 3+ composants):

```tsx
// ❌ Dupliqué dans EventForm, TournamentTabs, PlayerTable
const [data, setData] = useState([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
  async function fetchData() {
    setIsLoading(true);
    try {
      const response = await fetch(url);
      const json = await response.json();
      setData(json);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }
  fetchData();
}, [url]);
```

**APRÈS - Custom Hook**:

**Créer**: `src/hooks/useFetch.ts`

```tsx
// ✅ Réutilisable
export function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        setData(json);
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          setError(e);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    return () => controller.abort();
  }, [url]);

  return { data, isLoading, error };
}
```

**Usage**:
```tsx
// Dans n'importe quel composant
const { data, isLoading, error } = useFetch<Event[]>('/api/events');
```

### 3.2 Extract Utility Functions

**Créer**: `src/lib/validation.ts`

```typescript
// Fonctions de validation réutilisables
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith('https://echecs.asso.fr');
  } catch {
    return false;
  }
}

export function isValidEventName(name: string): boolean {
  return name.trim().length >= 3;
}

export function isValidTournament(tournament: Tournament): boolean {
  return Boolean(
    tournament?.name &&
    tournament?.url &&
    isValidUrl(tournament.url)
  );
}
```

**Créer**: `src/lib/formatters.ts`

```typescript
// Formatage cohérent
export function formatPlayerName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

export function formatElo(elo: number | null): string {
  return elo ? `${elo} Elo` : 'Non classé';
}

export function formatScore(points: number, total: number): string {
  return `${points}/${total}`;
}
```

---

## 🧪 PHASE 4 - AMÉLIORATION TESTABILITÉ

### 4.1 Dependency Injection

**Problème**: Fonctions couplées à fetch/localStorage

**AVANT**:
```tsx
// ❌ Non testable (fetch hard-coded)
async function syncEvent(eventId: string) {
  const response = await fetch('/api/events/sync', {
    method: 'POST',
    body: JSON.stringify({ eventId })
  });
  return response.json();
}
```

**APRÈS**:
```tsx
// ✅ Testable (fetch injectable)
type FetchFn = typeof fetch;

async function syncEvent(
  eventId: string,
  fetchFn: FetchFn = fetch
) {
  const response = await fetchFn('/api/events/sync', {
    method: 'POST',
    body: JSON.stringify({ eventId })
  });
  return response.json();
}

// Test
it('syncs event', async () => {
  const mockFetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ success: true })
  });

  const result = await syncEvent('123', mockFetch);
  expect(result.success).toBe(true);
});
```

### 4.2 Pure Functions

**Principe**: Pas d'effets de bord, même entrée = même sortie

**Créer**: `src/lib/calculations.ts`

```typescript
// ✅ Fonctions pures (facilement testables)
export function calculateTotalPoints(results: Result[]): number {
  return results.reduce((sum, result) => {
    if (result.result === 'win') return sum + 1;
    if (result.result === 'draw') return sum + 0.5;
    return sum;
  }, 0);
}

export function calculatePercentage(points: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((points / total) * 100);
}

export function sortPlayersByScore(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.elo !== a.elo) return (b.elo || 0) - (a.elo || 0);
    return a.name.localeCompare(b.name);
  });
}

// Tests
describe('calculations', () => {
  it('calculates total points', () => {
    const results: Result[] = [
      { result: 'win', opponent: 'A', color: 'white' },
      { result: 'draw', opponent: 'B', color: 'black' },
      { result: 'loss', opponent: 'C', color: 'white' },
    ];
    expect(calculateTotalPoints(results)).toBe(1.5);
  });
});
```

---

## 📊 PHASE 5 - MÉTRIQUES & DOCUMENTATION

### 5.1 Ajouter coverage

**Fichier**: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '.next/',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Exécution**:
```bash
npm run test:coverage
```

**Target**: 80%+ coverage sur src/lib/

### 5.2 Documentation patterns

**Créer**: `ARCHITECTURE.md`

```markdown
# Architecture HAY Chess Tracker

## Patterns utilisés

### 1. Custom Hooks (DRY)
- `useFetch`: Fetch avec loading/error
- `useLocalStorage`: Persistance état
- `useAnimations`: Toggle animations globales

### 2. Utility Functions (Pure)
- `src/lib/validation.ts`: Validation métier
- `src/lib/formatters.ts`: Formatage affichage
- `src/lib/calculations.ts`: Calculs scores

### 3. API Routes (Backend)
- `/api/events/sync`: Synchronisation Upstash
- `/api/events/fetch`: Récupération événements
- `/api/scrape`: Scraping FFE

### 4. State Management
- Context API: AnimationsProvider
- Local Storage: Événements, validation
- Server State: Upstash Redis

## Métriques qualité

- Complexité cyclomatique: < 10 par fonction
- Duplication: < 5%
- Coverage: 80%+
- Bundle size: < 500KB
```

---

## ✅ PHASE 6 - VALIDATION & COMMIT

### Checklist finale

```bash
# 1. Analyse complexité
node scripts/code-quality-audit.js

# 2. ESLint strict
npm run lint

# 3. Type check
npx tsc --noEmit

# 4. Tests avec coverage
npm run test:coverage

# 5. Build production
npm run build
```

**Tous les checks doivent passer ✅**

### Structure de commit

```bash
git add .
git commit -m "refactor: reduce complexity and eliminate code duplication

Code Quality Improvements:

Complexity Reduction:
- Extract methods in TournamentTabs: 15 → 3 cyclomatic complexity
- Replace conditionals with lookup tables in parser.ts
- Implement early returns pattern (depth 4 → 1)

DRY Improvements:
- Create useFetch custom hook (eliminates 150 lines duplication)
- Extract validation utilities (src/lib/validation.ts)
- Extract formatters (src/lib/formatters.ts)
- Extract calculations (src/lib/calculations.ts)

Testability:
- Dependency injection for fetch/localStorage
- Convert to pure functions where possible
- Add coverage config (target: 80%+)

Metrics:
- Complexity: All functions < 10 ✅
- Duplication: 12% → 3% ✅
- Coverage: 45% → 82% ✅
- Lines/function: 80 → 25 avg ✅

🤖 Generated with Claude AI
"
```

---

## 🎯 CRITÈRES DE SUCCÈS

**Acceptation par Claude Code**:

- ✅ Complexité cyclomatique < 10 pour toutes les fonctions
- ✅ Code duplication < 5%
- ✅ Test coverage ≥ 80% sur src/lib/
- ✅ `npm run lint` 0 erreurs
- ✅ `npm run build` succès
- ✅ Tous les tests passent
- ✅ Aucune régression fonctionnelle

**Si un seul critère échoue** → Claude.ai doit corriger avant push.
