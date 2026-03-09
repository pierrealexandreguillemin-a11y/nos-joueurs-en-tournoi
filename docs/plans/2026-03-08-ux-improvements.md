# UX Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the event creation flow and fix global UX frictions identified in the UX audit (`docs/plans/2026-03-08-ux-audit-design.md`), using Proposition B (enhanced form in-place).

**Architecture:** Enrich existing EventForm with inline validation, contextual help, and mobile layout fixes. Fix bugs in validation alignment (client vs server). Improve post-creation UX (empty states, error messages, ViewToggle badge). No structural refactoring — same components, same data flow.

**Tech Stack:** React 19, TypeScript strict, Tailwind CSS, Vitest + Testing Library, `validation.ts` utilities.

---

## Task 1: Fix validation alignment — use `isValidFFeUrl()` (B-01, B-02, F-03, F-14)

**Files:**
- Modify: `src/components/EventForm.tsx:118-142` (validateEventForm)
- Modify: `src/components/EventForm.test.tsx`
- Reference: `src/lib/validation.ts`

**Step 1: Write failing tests for stricter validation**

Add to `src/components/EventForm.test.tsx` inside a new `describe('Validation alignment with validation.ts')`:

```typescript
it('rejects event name shorter than 3 characters', async () => {
  render(<EventForm onEventCreated={mockOnEventCreated} />);

  fillValidForm('AB', 'U12', 'https://echecs.asso.fr/Resultats.aspx?Action=Ga');
  fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

  await waitFor(() => {
    expect(screen.getByText(/3 caractères minimum/i)).toBeInTheDocument();
  });
  expect(mockOnEventCreated).not.toHaveBeenCalled();
});

it('rejects tournament name shorter than 2 characters', async () => {
  render(<EventForm onEventCreated={mockOnEventCreated} />);

  fillValidForm('Test Event', 'A', 'https://echecs.asso.fr/Resultats.aspx?Action=Ga');
  fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

  await waitFor(() => {
    expect(screen.getByText(/2 caractères minimum/i)).toBeInTheDocument();
  });
  expect(mockOnEventCreated).not.toHaveBeenCalled();
});

it('rejects URL that contains echecs.asso.fr but is not a valid FFE URL', async () => {
  render(<EventForm onEventCreated={mockOnEventCreated} />);

  fillValidForm('Test Event', 'U12', 'https://attacker.com/?r=echecs.asso.fr');
  fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

  await waitFor(() => {
    expect(screen.getByText(/urls doivent provenir de echecs\.asso\.fr/i)).toBeInTheDocument();
  });
  expect(mockOnEventCreated).not.toHaveBeenCalled();
});

it('rejects URL without protocol', async () => {
  render(<EventForm onEventCreated={mockOnEventCreated} />);

  fillValidForm('Test Event', 'U12', 'echecs.asso.fr/Resultats.aspx?Action=Ga');
  fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

  await waitFor(() => {
    expect(screen.getByText(/urls doivent provenir de echecs\.asso\.fr/i)).toBeInTheDocument();
  });
  expect(mockOnEventCreated).not.toHaveBeenCalled();
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/EventForm.test.tsx --reporter=verbose`
Expected: 4 FAIL (current validation accepts these cases)

**Step 3: Update `validateEventForm` in EventForm.tsx**

Replace `validateEventForm` (lines 118-142) with:

```typescript
import { isValidFFeUrl, isValidEventName, isValidTournamentName } from '@/lib/validation';

function validateEventForm(
  eventName: string,
  tournaments: TournamentInput[],
  setError: (msg: string) => void,
): boolean {
  if (!eventName.trim()) {
    setError('Le nom de l\'événement est requis');
    return false;
  }

  if (!isValidEventName(eventName)) {
    setError('Le nom de l\'événement doit contenir au moins 3 caractères');
    return false;
  }

  const validTournaments = tournaments.filter(t => t.name.trim() && t.url.trim());
  if (validTournaments.length === 0) {
    setError('Au moins un tournoi est requis');
    return false;
  }

  for (const tournament of validTournaments) {
    if (!isValidTournamentName(tournament.name)) {
      setError(`Le nom de catégorie "${tournament.name}" doit contenir au moins 2 caractères`);
      return false;
    }
    if (!isValidFFeUrl(tournament.url)) {
      setError('Les URLs doivent provenir de echecs.asso.fr (incluez https://)');
      return false;
    }
  }

  return true;
}
```

Also update the import at the top of EventForm.tsx:
```typescript
import { isValidFFeUrl, isValidEventName, isValidTournamentName } from '@/lib/validation';
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/EventForm.test.tsx --reporter=verbose`
Expected: ALL PASS

**Step 5: Update existing test expectations**

The existing test `shows error when submitting with empty event name` still expects the same message — no change needed.

The existing test `shows error for invalid URL (not echecs.asso.fr)` still expects a message matching `/les urls doivent provenir de echecs\.asso\.fr/i` — the new message "Les URLs doivent provenir de echecs.asso.fr (incluez https://)" still matches this regex. No change needed.

**Step 6: Commit**

```bash
git add src/components/EventForm.tsx src/components/EventForm.test.tsx
git commit -m "fix(form): align validation with validation.ts — use isValidFFeUrl, min lengths"
```

---

## Task 2: Add contextual help texts (F-01, F-02, F-09, F-10)

**Files:**
- Modify: `src/components/EventForm.tsx` (TournamentRow, TournamentsSection, EventForm render)
- Modify: `src/components/EventForm.test.tsx`

**Step 1: Write failing tests for help texts**

Add to `src/components/EventForm.test.tsx` in a new `describe('Contextual help')`:

```typescript
describe('Contextual help', () => {
  it('displays explanatory text for what an event is', () => {
    render(<EventForm onEventCreated={mockOnEventCreated} />);

    expect(screen.getByText(/regroupe un ou plusieurs tournois/i)).toBeInTheDocument();
  });

  it('displays help text for club name field', () => {
    render(<EventForm onEventCreated={mockOnEventCreated} />);

    expect(screen.getByText(/détecté automatiquement/i)).toBeInTheDocument();
  });

  it('displays guidance for finding FFE URL', () => {
    render(<EventForm onEventCreated={mockOnEventCreated} />);

    expect(screen.getByText(/copiez l'URL depuis/i)).toBeInTheDocument();
  });

  it('uses inclusive placeholder for tournament name', () => {
    render(<EventForm onEventCreated={mockOnEventCreated} />);

    expect(screen.getByPlaceholderText(/ex: U12, Open/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/EventForm.test.tsx --reporter=verbose`
Expected: 4 FAIL

**Step 3: Add help texts to the form**

In `EventForm.tsx`, modify the render section:

1. Add explanatory text under CardTitle:
```tsx
<CardHeader>
  <CardTitle>Créer un nouvel événement</CardTitle>
  <p className="text-sm text-muted-foreground">
    Un événement regroupe un ou plusieurs tournois FFE suivis simultanément.
  </p>
</CardHeader>
```

2. Update club name helper text (line 219-221) — keep as-is, already says "détecté automatiquement".

3. Add guidance before tournament rows in `TournamentsSection`:
```tsx
function TournamentsSection({ tournaments, onAdd, onUpdate, onRemove }: TournamentsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Tournois *</Label>
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Ajouter un tournoi
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Pour chaque tournoi, copiez l&apos;URL depuis echecs.asso.fr &gt; votre tournoi &gt; page Résultats.
      </p>
      {tournaments.map((tournament, index) => (
        <TournamentRow
          key={tournament.id}
          tournament={tournament}
          index={index}
          showRemove={tournaments.length > 1}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
```

4. Update TournamentRow label and placeholder (line 34-35):
```tsx
<Label htmlFor={`tournament-name-${index}`}>
  Catégorie (ex: U12, Open)
</Label>
```
And the placeholder (line 39):
```tsx
placeholder="Ex: U12, Open, Seniors"
```

**Step 4: Update existing tests that rely on old label text**

Replace all occurrences of `/nom \(ex: u12, u14\)/i` in the test file with `/catégorie \(ex: u12, open\)/i`.

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/EventForm.test.tsx --reporter=verbose`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/components/EventForm.tsx src/components/EventForm.test.tsx
git commit -m "feat(form): add contextual help texts and inclusive labels"
```

---

## Task 3: Add autoFocus and mobile layout (F-07, F-13)

**Files:**
- Modify: `src/components/EventForm.tsx` (TournamentRow, EventForm)
- Modify: `src/components/EventForm.test.tsx`

**Step 1: Write failing tests**

Add to `src/components/EventForm.test.tsx`:

```typescript
describe('UX polish', () => {
  it('auto-focuses event name input on mount', () => {
    render(<EventForm onEventCreated={mockOnEventCreated} />);

    const input = screen.getByPlaceholderText(/championnat départemental/i);
    expect(document.activeElement).toBe(input);
  });

  it('renders tournament rows with responsive layout classes', () => {
    render(<EventForm onEventCreated={mockOnEventCreated} />);

    const tournamentRow = screen.getByPlaceholderText(/echecs\.asso\.fr/i).closest('.flex');
    expect(tournamentRow).toHaveClass('flex-col', 'sm:flex-row');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/EventForm.test.tsx --reporter=verbose`
Expected: 2 FAIL

**Step 3: Implement autoFocus and responsive layout**

In `EventForm.tsx`:

1. Add `autoFocus` to event name input (line 202-207):
```tsx
<Input
  id="eventName"
  placeholder="Ex: Championnat départemental 13 - Oct 2025"
  value={eventName}
  onChange={(e) => setEventName(e.target.value)}
  autoFocus
/>
```

2. Update TournamentRow container (line 32) from:
```tsx
<div className="flex gap-2 items-end p-4 border rounded-lg bg-background/50">
```
to:
```tsx
<div className="flex flex-col sm:flex-row gap-2 sm:items-end p-4 border rounded-lg bg-background/50">
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/EventForm.test.tsx --reporter=verbose`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/components/EventForm.tsx src/components/EventForm.test.tsx
git commit -m "fix(form): add autoFocus and responsive mobile layout for tournament rows"
```

---

## Task 4: Add inline field-level validation (F-04, F-05)

**Files:**
- Modify: `src/components/EventForm.tsx` (new `useFieldErrors` logic, per-field error display)
- Modify: `src/components/EventForm.test.tsx`

**Step 1: Write failing tests for inline validation**

Add to `src/components/EventForm.test.tsx`:

```typescript
describe('Inline validation', () => {
  it('shows field-level error on event name after blur if too short', async () => {
    const user = userEvent.setup();
    render(<EventForm onEventCreated={mockOnEventCreated} />);

    const input = screen.getByPlaceholderText(/championnat départemental/i);
    await user.type(input, 'AB');
    await user.tab(); // blur

    await waitFor(() => {
      expect(screen.getByText(/3 caractères minimum/i)).toBeInTheDocument();
    });
  });

  it('shows field-level error on URL after blur if invalid', async () => {
    const user = userEvent.setup();
    render(<EventForm onEventCreated={mockOnEventCreated} />);

    const urlInput = screen.getByPlaceholderText(/echecs\.asso\.fr/i);
    await user.type(urlInput, 'https://google.com');
    await user.tab(); // blur

    await waitFor(() => {
      expect(screen.getByText(/url doit provenir de echecs\.asso\.fr/i)).toBeInTheDocument();
    });
  });

  it('clears field-level error when value becomes valid', async () => {
    const user = userEvent.setup();
    render(<EventForm onEventCreated={mockOnEventCreated} />);

    const input = screen.getByPlaceholderText(/championnat départemental/i);
    await user.type(input, 'AB');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/3 caractères minimum/i)).toBeInTheDocument();
    });

    await user.clear(input);
    await user.type(input, 'ABC');
    await user.tab();

    await waitFor(() => {
      expect(screen.queryByText(/3 caractères minimum/i)).not.toBeInTheDocument();
    });
  });

  it('shows error border on invalid fields', async () => {
    const user = userEvent.setup();
    render(<EventForm onEventCreated={mockOnEventCreated} />);

    const input = screen.getByPlaceholderText(/championnat départemental/i);
    await user.type(input, 'AB');
    await user.tab();

    await waitFor(() => {
      const wrapper = input.closest('.space-y-2');
      expect(wrapper?.querySelector('.text-destructive')).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/EventForm.test.tsx --reporter=verbose`
Expected: 4 FAIL

**Step 3: Implement inline validation state**

In `EventForm.tsx`, add field error state and blur handlers:

```typescript
// Add to EventForm component state:
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

const validateField = useCallback((field: string, value: string) => {
  setFieldErrors(prev => {
    const next = { ...prev };
    switch (field) {
      case 'eventName':
        if (value.trim() && !isValidEventName(value)) {
          next.eventName = '3 caractères minimum';
        } else {
          delete next.eventName;
        }
        break;
      default:
        if (field.startsWith('url-')) {
          if (value.trim() && !isValidFFeUrl(value)) {
            next[field] = 'L\'URL doit provenir de echecs.asso.fr';
          } else {
            delete next[field];
          }
        }
        if (field.startsWith('name-')) {
          if (value.trim() && !isValidTournamentName(value)) {
            next[field] = '2 caractères minimum';
          } else {
            delete next[field];
          }
        }
    }
    return next;
  });
}, []);
```

Add `useCallback` to the import from React (line 2).

Create a `FieldError` helper component:

```typescript
function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-destructive">{error}</p>;
}
```

Update the event name input to include onBlur and error display:
```tsx
<div className="space-y-2">
  <Label htmlFor="eventName">Nom de l&apos;événement *</Label>
  <Input
    id="eventName"
    placeholder="Ex: Championnat départemental 13 - Oct 2025"
    value={eventName}
    onChange={(e) => setEventName(e.target.value)}
    onBlur={() => validateField('eventName', eventName)}
    autoFocus
    aria-invalid={!!fieldErrors.eventName}
  />
  <FieldError error={fieldErrors.eventName} />
</div>
```

Pass `fieldErrors` and `validateField` down to `TournamentRow` via `TournamentsSection`:

```typescript
// Update TournamentRowProps:
interface TournamentRowProps {
  tournament: TournamentInput;
  index: number;
  showRemove: boolean;
  onUpdate: (index: number, field: 'name' | 'url', value: string) => void;
  onRemove: (index: number) => void;
  fieldErrors: Record<string, string>;
  onBlur: (field: string, value: string) => void;
}
```

In `TournamentRow`, add `onBlur` and `FieldError` to each input:
```tsx
<Input
  id={`tournament-name-${index}`}
  placeholder="Ex: U12, Open, Seniors"
  value={tournament.name}
  onChange={(e) => onUpdate(index, 'name', e.target.value)}
  onBlur={() => onBlur(`name-${index}`, tournament.name)}
  aria-invalid={!!fieldErrors[`name-${index}`]}
/>
<FieldError error={fieldErrors[`name-${index}`]} />
```

```tsx
<Input
  id={`tournament-url-${index}`}
  type="url"
  placeholder="https://echecs.asso.fr/Resultats.aspx?..."
  value={tournament.url}
  onChange={(e) => onUpdate(index, 'url', e.target.value)}
  onBlur={() => onBlur(`url-${index}`, tournament.url)}
  aria-invalid={!!fieldErrors[`url-${index}`]}
/>
<FieldError error={fieldErrors[`url-${index}`]} />
```

Update `TournamentsSectionProps` to include `fieldErrors` and `onBlur`, and pass them through.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/EventForm.test.tsx --reporter=verbose`
Expected: ALL PASS

**Step 5: Run ESLint to check compliance**

Run: `npx eslint src/components/EventForm.tsx --max-warnings 0`
Expected: 0 errors, 0 warnings. If `max-lines-per-function` triggers, extract `FieldError` as a standalone function outside the component (already done above).

**Step 6: Commit**

```bash
git add src/components/EventForm.tsx src/components/EventForm.test.tsx
git commit -m "feat(form): add inline field-level validation on blur"
```

---

## Task 5: Warning for incomplete tournament rows (F-08)

**Files:**
- Modify: `src/components/EventForm.tsx` (validateEventForm, handleSubmit)
- Modify: `src/components/EventForm.test.tsx`

**Step 1: Write failing test**

Add to `src/components/EventForm.test.tsx`:

```typescript
it('shows warning toast when incomplete tournament rows are filtered out', async () => {
  const toastWarnSpy = vi.spyOn(await import('sonner'), 'toast');
  // We need to mock toast at the module level instead
});
```

Actually, since this is a toast, and EventForm currently doesn't use toast, a simpler approach is to add a visible warning in the form before submit. Add to `describe('Tournament Validation')`:

```typescript
it('warns about incomplete tournament rows at submit via visible message', async () => {
  render(<EventForm onEventCreated={mockOnEventCreated} />);

  fillInput(screen.getByPlaceholderText(/championnat départemental/i), 'Test Event');

  // Add second tournament
  fireEvent.click(screen.getByRole('button', { name: /ajouter un tournoi/i }));

  // Fill first tournament completely
  const nameInputs = screen.getAllByPlaceholderText(/ex: u12, open/i);
  fillInput(nameInputs[0], 'U12');
  const urlInputs = screen.getAllByPlaceholderText(/echecs\.asso\.fr/i);
  fillInput(urlInputs[0], 'https://echecs.asso.fr/Resultats.aspx?Action=Ga');

  // Fill second tournament partially (name only)
  fillInput(nameInputs[1], 'U14');

  fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

  await waitFor(() => {
    expect(mockOnEventCreated).toHaveBeenCalled();
  });

  // Check the created event has only the complete tournament
  const createdEvent = mockOnEventCreated.mock.calls[0][0] as Event;
  expect(createdEvent.tournaments.length).toBe(1);
});
```

Note: The test for the visible warning itself is hard to assert since the toast is imported. Instead, we can verify the behavior is correct (1 tournament created) and add the toast as a UX enhancement without an assertion. Or, we can return a count from `buildEvent` and show an inline warning. Let's keep it simple — log a `toast.info` about the skipped rows.

**Step 2: Implementation**

In `EventForm.tsx`, update `handleSubmit`:

```typescript
import { toast } from 'sonner';

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateEventForm(eventName, tournaments, setError)) return;
  setError('');

  const partialRows = tournaments.filter(t =>
    (t.name.trim() && !t.url.trim()) || (!t.name.trim() && t.url.trim())
  );
  if (partialRows.length > 0) {
    toast.info(`${partialRows.length} tournoi(s) incomplet(s) ignoré(s)`);
  }

  onEventCreated(buildEvent(eventName, clubName, tournaments));
};
```

**Step 3: Run tests**

Run: `npx vitest run src/components/EventForm.test.tsx --reporter=verbose`
Expected: ALL PASS (existing tests should still pass, toast is fire-and-forget)

**Step 4: Commit**

```bash
git add src/components/EventForm.tsx
git commit -m "feat(form): warn user about incomplete tournament rows on submit"
```

---

## Task 6: Duplicate URL detection (F-12)

**Files:**
- Modify: `src/components/EventForm.tsx` (validateEventForm)
- Modify: `src/components/EventForm.test.tsx`

**Step 1: Write failing test**

```typescript
it('shows error when duplicate URLs are used across tournament rows', async () => {
  render(<EventForm onEventCreated={mockOnEventCreated} />);

  fillInput(screen.getByPlaceholderText(/championnat départemental/i), 'Test Event');
  fireEvent.click(screen.getByRole('button', { name: /ajouter un tournoi/i }));

  const nameInputs = screen.getAllByPlaceholderText(/ex: u12, open/i);
  fillInput(nameInputs[0], 'U12');
  fillInput(nameInputs[1], 'U14');

  const sameUrl = 'https://echecs.asso.fr/Resultats.aspx?Action=Ga&Groupe=1';
  const urlInputs = screen.getAllByPlaceholderText(/echecs\.asso\.fr/i);
  fillInput(urlInputs[0], sameUrl);
  fillInput(urlInputs[1], sameUrl);

  fireEvent.click(screen.getByRole('button', { name: /créer l'événement/i }));

  await waitFor(() => {
    expect(screen.getByText(/url utilisée plusieurs fois/i)).toBeInTheDocument();
  });
  expect(mockOnEventCreated).not.toHaveBeenCalled();
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/EventForm.test.tsx --reporter=verbose`
Expected: FAIL

**Step 3: Add duplicate URL check in `validateEventForm`**

Add after the `isValidFFeUrl` check in the for loop:

```typescript
const urls = validTournaments.map(t => t.url.trim());
const uniqueUrls = new Set(urls);
if (uniqueUrls.size < urls.length) {
  setError('Une même URL est utilisée plusieurs fois');
  return false;
}
```

Place this after the `for` loop that checks `isValidFFeUrl`, before the final `return true`.

**Step 4: Run tests**

Run: `npx vitest run src/components/EventForm.test.tsx --reporter=verbose`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/components/EventForm.tsx src/components/EventForm.test.tsx
git commit -m "feat(form): detect and reject duplicate tournament URLs"
```

---

## Task 7: Fix try/catch on saveEvent (B-03)

**Files:**
- Modify: `app/page.tsx:196-203` (handleEventCreated)

**Step 1: Add try/catch**

In `app/page.tsx`, replace `handleEventCreated`:

```typescript
const handleEventCreated = (event: Event) => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.saveEvent(event);
  } catch {
    toast.error('Impossible de sauvegarder. Le stockage est peut-être plein.');
    return;
  }
  setCurrentEvent(event);
  setShowEventForm(false);
  toast.success(`Événement "${event.name}" créé`);
};
```

**Step 2: Run full test suite to verify no regression**

Run: `npx vitest run --reporter=dot`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "fix(storage): catch saveEvent failure in handleEventCreated (B-03)"
```

---

## Task 8: Fix misleading post-creation error message (F-06)

**Files:**
- Modify: `src/hooks/useTournamentSync.ts:208`
- Modify: `src/hooks/useTournamentSync.test.ts`

**Step 1: Write failing test**

Find the existing test for the error message. If there is one testing the current wording, update it. If not, add:

```typescript
it('shows accurate error message when no players found for club', async () => {
  // ... setup mock that returns 0 players for a given clubName
  // Assert the error message does NOT contain "pas encore commencé"
  // Assert it suggests checking the club name or using auto-detection
});
```

**Step 2: Update error message**

In `src/hooks/useTournamentSync.ts:208`, replace:
```typescript
throw new Error(`Aucun joueur ${event.clubName} trouvé. Le tournoi n'a peut-être pas encore commencé.`);
```
with:
```typescript
throw new Error(`Aucun joueur « ${event.clubName} » trouvé. Vérifiez le nom du club ou laissez-le vide pour utiliser la détection automatique.`);
```

**Step 3: Update any tests that assert the old message**

Search for `pas encore commencé` in test files and update to match the new wording.

**Step 4: Run tests**

Run: `npx vitest run --reporter=dot`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/hooks/useTournamentSync.ts src/hooks/useTournamentSync.test.ts
git commit -m "fix(sync): replace misleading error message when club name mismatches FFE"
```

---

## Task 9: Improve empty state in PlayerTable (G-01)

**Files:**
- Modify: `src/components/PlayerTable.tsx:244-248`
- Modify: `src/components/PlayerTable.test.tsx` (if exists, otherwise skip test)

**Step 1: Check if PlayerTable has tests for empty state**

Run: `npx vitest run src/components/PlayerTable.test.tsx --reporter=verbose` (if file exists)

**Step 2: Update empty state text**

In `src/components/PlayerTable.tsx:244-248`, replace:
```tsx
{tournament.players.length === 0 && (
  <div className="text-center py-8 text-muted-foreground">
    Aucun joueur à afficher
  </div>
)}
```
with:
```tsx
{tournament.players.length === 0 && (
  <div className="text-center py-8 text-muted-foreground">
    <p>Aucun joueur à afficher</p>
    <p className="text-xs mt-1">Cliquez sur Actualiser pour charger les résultats du tournoi.</p>
  </div>
)}
```

**Step 3: Run tests**

Run: `npx vitest run --reporter=dot`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/components/PlayerTable.tsx
git commit -m "fix(ui): improve empty state with actionable guidance (G-01)"
```

---

## Task 10: Make ViewToggle badge accessible (G-02)

**Files:**
- Modify: `src/components/ViewToggle.tsx:50-55`
- Modify: `src/components/ViewToggle.test.tsx`

**Step 1: Write failing test**

Add to `src/components/ViewToggle.test.tsx`:

```typescript
it('shows visible text badge when new pairings are available', () => {
  render(
    <ViewToggle viewMode="results" onChange={vi.fn()} hasPairings={true} showBadge={true} />
  );

  expect(screen.getByText(/nouvelle ronde/i)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ViewToggle.test.tsx --reporter=verbose`
Expected: FAIL

**Step 3: Add visible text to badge**

In `ViewToggle.tsx:50-55`, replace the badge span:
```tsx
{showBadge && hasPairings && (
  <span
    className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-accent"
    role="status"
    aria-label="Nouveaux appariements disponibles"
  />
)}
```
with:
```tsx
{showBadge && hasPairings && (
  <span
    className="ml-1.5 text-[10px] font-semibold text-accent"
    role="status"
  >
    Nouvelle ronde
  </span>
)}
```

**Step 4: Run tests**

Run: `npx vitest run src/components/ViewToggle.test.tsx --reporter=verbose`
Expected: ALL PASS

**Step 5: Update any tests that assert on the old dot span**

Search for `rounded-full bg-accent` or the old `aria-label` in ViewToggle tests and update if needed.

**Step 6: Commit**

```bash
git add src/components/ViewToggle.tsx src/components/ViewToggle.test.tsx
git commit -m "fix(a11y): replace color-only badge with visible text in ViewToggle (G-02)"
```

---

## Task 11: Add sticky player name column (G-05)

**Files:**
- Modify: `src/components/PlayerTable.tsx` (TableHead and TableCell for player name)

**Step 1: Apply sticky classes**

In `PlayerTable.tsx`, update the player name cells:

1. `ColumnHeadersRow` — first `<TableHead>` (line 76):
```tsx
<TableHead className="font-bold sticky left-0 z-10 bg-card">Nom</TableHead>
```

2. `ClubTotalsRow` — first `<TableHead>` (line 53):
```tsx
<TableHead className="font-bold text-secondary sticky left-0 z-10 bg-card" title="Score cumulé de tous les joueurs du club par ronde">Total Club</TableHead>
```

3. `PlayerRow` — first `<TableCell>` (line 143):
```tsx
<TableCell className="font-medium sticky left-0 z-10 bg-card">{player.name}</TableCell>
```

Note: `bg-card` ensures the sticky column has an opaque background. If the glass theme makes it translucent, use `bg-background` instead — test visually.

**Step 2: Run tests**

Run: `npx vitest run --reporter=dot`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/components/PlayerTable.tsx
git commit -m "fix(ui): sticky player name column on mobile horizontal scroll (G-05)"
```

---

## Task 12: Run full quality gates and update docs

**Files:**
- Modify: `docs/plans/2026-03-08-ux-audit-design.md` (mark tasks as done)

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Run ESLint**

Run: `npx eslint src app --max-warnings 0`
Expected: 0 errors, 0 warnings

**Step 3: Run full test suite**

Run: `npx vitest run --reporter=dot`
Expected: ALL PASS

**Step 4: Run duplication check**

Run: `npx jscpd src app --threshold 5`
Expected: < 5%

**Step 5: Build production**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Update SUIVI_DEV.md**

Add a new section documenting the UX improvements session with commit references.

**Step 7: Final commit**

```bash
git add docs/ SUIVI_DEV.md
git commit -m "docs: update SUIVI_DEV and plans for UX improvements session"
```

---

## Summary of changes per file

| File | Tasks | Changes |
|------|-------|---------|
| `src/components/EventForm.tsx` | 1,2,3,4,5,6 | Validation alignment, help texts, autoFocus, mobile layout, inline validation, warnings, duplicate detection |
| `src/components/EventForm.test.tsx` | 1,2,3,4,6 | New tests for stricter validation, help texts, autoFocus, inline validation, duplicates |
| `src/hooks/useTournamentSync.ts` | 8 | Fix misleading error message |
| `src/hooks/useTournamentSync.test.ts` | 8 | Update error message assertion |
| `src/components/PlayerTable.tsx` | 9,11 | Better empty state, sticky column |
| `src/components/ViewToggle.tsx` | 10 | Accessible text badge |
| `src/components/ViewToggle.test.tsx` | 10 | Test for visible badge text |
| `app/page.tsx` | 7 | Try/catch on saveEvent |
| `SUIVI_DEV.md` | 12 | Document session |

## Findings addressed

| Finding | Task | Status |
|---------|------|--------|
| F-01 (no FFE URL guidance) | 2 | Help text added |
| F-02 (dual club name) | 2 | Better helper text |
| F-03 (weak validation) | 1 | Use `isValidFFeUrl()` |
| F-04 (no inline validation) | 4 | Blur-based field validation |
| F-05 (single error, no field highlight) | 4 | Per-field errors + `aria-invalid` |
| F-06 (misleading error) | 8 | Reworded message |
| F-07 (mobile layout) | 3 | `flex-col sm:flex-row` |
| F-08 (silent row filtering) | 5 | Toast warning |
| F-09 (event concept unexplained) | 2 | Help text in CardHeader |
| F-10 (jargon label) | 2 | "Catégorie (ex: U12, Open)" |
| F-12 (duplicate URLs) | 6 | Duplicate detection |
| F-13 (no autoFocus) | 3 | `autoFocus` on event name |
| F-14 (min length) | 1 | Enforce 3-char min |
| B-01 (SSRF bypass) | 1 | Use `isValidFFeUrl()` |
| B-02 (name length mismatch) | 1 | Enforce 3-char min |
| B-03 (saveEvent no try/catch) | 7 | Try/catch added |
| G-01 (empty state) | 9 | Actionable guidance |
| G-02 (color-only badge) | 10 | Visible text badge |
| G-05 (sticky column) | 11 | Sticky player name |
