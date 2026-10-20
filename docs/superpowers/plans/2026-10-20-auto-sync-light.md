# Auto-sync light Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parents of one club see each other's validation ticks and the responsable's event changes/deletions automatically, without ever erasing each other, on a flaky network.

**Architecture:** Server keeps events (with tombstones) and validation **cells** in Neon. The client keeps its localStorage copy plus a small "sync meta" (dirty events, pending tombstones, dirty cells). One request per trigger (`POST /api/events/sync`) pushes what is dirty and returns the full server state, merged locally by pure functions. Triggers: app open, "Actualiser", 3 s after a local change, `online` event.

**Tech Stack:** Next.js 16 App Router, `@neondatabase/serverless` 1.2, Zod 4, Vitest 4 + jsdom.

**Spec:** `docs/superpowers/specs/2026-10-20-auto-sync-light-design.md`

## Global Constraints

- WAF: 60 req / 60 s / IP on `/api/*` (raise from 30 in the dashboard, Task 6).
- One request per trigger; no polling; debounce `SYNC_DEBOUNCE_MS = 3000`.
- FFE refresh writes (`availableClubs`, tournament `players`, `pairings`, `pairingsRound`, `lastUpdate`) never mark an event dirty.
- `currentEventId` is local to the phone: never sent, never taken from the server.
- A tombstone wins over a stale event upsert; a re-imported tombstoned event gets a new id.
- Same cell edited on two phones: last write reaching the server wins.
- Zod bounds: `events` ≤ 50, `deletedEventIds` ≤ 200 (string ≤ 100), `cells` ≤ 5000 (`playerName` ≤ 200, `round` int 1-99).
- Quality gates of `CLAUDE.md` (complexity 15, function ≤ 80 lines, jscpd 5 %, coverage 70/60/70/70, 0 lint warnings).
- Schema SQL is applied by hand in the Neon SQL editor, one statement per run, and versioned in `db/schema.sql`.

## Review Focus

1. Parent ticks while offline, closes the app, reopens with network → the tick reaches the server (marks survive reload) — Task 3 test `marks survive a new storage instance`.
2. A tick made while a push is in flight is not lost when that push is acknowledged (ack removes only what was sent) — Task 3 test `ack keeps marks added after the payload was built`.
3. Responsable deletes event E; a parent who still had E dirty (edited locally) pushes later → E stays deleted — Task 1 test `tombstone wins over a later upsert`.
4. Pull of a server event must not wipe the FFE results a parent just loaded locally — Task 3 test `server event keeps local FFE data of matching tournaments`.
5. Club change clears ticks: other phones lose them too after sync (cleared cells pushed as false) — Task 3 test `clearTournamentValidations marks existing cells false`.

---

### Task 1: Server store — tombstones and validation cells

**Files:**
- Modify: `db/schema.sql`, `src/lib/db.ts`, `src/lib/db.test.ts`, `src/types/index.ts`

**Interfaces:**
- Produces (types, `src/types/index.ts`):
  `interface ValidationCell { tournamentId: string; playerName: string; round: number; value: boolean }`
  `interface SyncPush { events: Event[]; deletedEventIds: string[]; cells: ValidationCell[] }`
  `interface ServerState { events: Event[]; deletedEventIds: string[]; cells: ValidationCell[] }`
- Produces (`src/lib/db.ts`): `applySync(clubSlug: string, push: SyncPush): Promise<void>`, `getServerState(clubSlug: string): Promise<ServerState>`. Removes `saveEvents`, `getEvents`, `saveValidations`, `saveCurrentEventId`, `getStorageData` (routes switch in Task 2).

- [ ] **Step 1:** Append to `db/schema.sql` (idempotent, comment that `club_state` is no longer used):
  `ALTER TABLE club_events ADD COLUMN IF NOT EXISTS deleted_at timestamptz;` and
  `CREATE TABLE IF NOT EXISTS club_validations (club_slug text NOT NULL, tournament_id text NOT NULL, player_name text NOT NULL, round int NOT NULL, value boolean NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (club_slug, tournament_id, player_name, round));`
- [ ] **Step 2: Failing tests** in `db.test.ts` (extend the in-memory fake to the new statements; keep its "recognise statements, apply semantics" approach):
  - `applies events, then returns them` — push `[e1]` → `getServerState` events ids `['e1']`.
  - `tombstone wins over a later upsert` — push `{deletedEventIds:['e1']}` then push `{events:[e1]}` → events `[]`, deletedEventIds `['e1']`.
  - `tombstone deletes the cells of the event's tournaments` — event with tournament `t1`, cell `t1/DUPONT JEAN/1=true`, then tombstone → cells `[]`.
  - `cells upsert per cell` — push cell A true, push cell B true, push cell A false → cells A=false, B=true.
  - `isolates clubs` (events, tombstones, cells).
  - `fails on first query when DATABASE_URL is missing` (keep existing test).
- [ ] **Step 3: Run** `npx vitest run src/lib/db.test.ts` → FAIL (functions missing).
- [ ] **Step 4: Implement** `applySync` (order: tombstones `UPDATE … SET deleted_at = now()` + `INSERT … ON CONFLICT DO UPDATE SET deleted_at = now()` for unknown ids, delete their cells via `data->'tournaments'`; event upsert with `ON CONFLICT … DO UPDATE … WHERE club_events.deleted_at IS NULL`; cells upsert from `jsonb_to_recordset`) and `getServerState` (3 SELECTs in `Promise.all`). Skip empty arrays.
- [ ] **Step 5: Run** the test file → PASS; `npx tsc --noEmit` → errors only in the two routes (fixed in Task 2).
- [ ] **Step 6: Commit** `feat(storage): server tombstones and validation cells` (with Task 2 if tsc must be green for the hook — commit together after Task 2 Step 5).

### Task 2: API — one request = push + pull

**Files:**
- Modify: `src/lib/schemas.ts`, `src/lib/schemas.test.ts`, `app/api/events/sync/route.ts`, `app/api/events/fetch/route.ts`, `app/api/events/__tests__/routes.test.ts`

**Interfaces:**
- Consumes: `applySync`, `getServerState`, `SyncPush`, `ServerState` (Task 1).
- Produces: `syncBodySchema = { clubSlug, events, deletedEventIds, cells }` (bounds in Global Constraints); both routes answer `200 { success: true, data: ServerState }`; `POST` also 400/401/413 exactly as today.

- [ ] **Step 1: Failing tests:** schemas — accepts a valid body; rejects `cells` of 5001, `round: 0`, missing `deletedEventIds`. Routes — `POST` calls `applySync(slug, {events, deletedEventIds, cells})` then returns `getServerState(slug)` as `data`; `GET /fetch` returns `getServerState`; existing 400/401/413 tests keep passing with the new body.
- [ ] **Step 2: Run** `npx vitest run src/lib/schemas.test.ts app/api/events` → FAIL.
- [ ] **Step 3: Implement** schema + routes (no `currentEventId` anywhere).
- [ ] **Step 4: Run** → PASS; `npx tsc --noEmit` → only client errors in `src/lib/sync.ts` remain (Task 4).
- [ ] **Step 5: Commit** Tasks 1+2: `feat(sync): server tombstones, validation cells, push+pull in one request`.

### Task 3: Client sync state — marks and merge (pure)

**Files:**
- Create: `src/lib/sync-state.ts`, `src/lib/sync-state.test.ts`
- Modify: `src/lib/storage.ts` (ClubStorage), `src/lib/storage.test.ts`, `src/lib/storage-share.ts` (import of tombstoned id)

**Interfaces:**
- Produces (`src/lib/sync-state.ts`):
  `interface SyncMeta { dirtyEventIds: string[]; deletedEventIds: string[]; dirtyCells: string[]; knownTombstones: string[]; migrated: boolean }`
  `cellKey(tournamentId: string, playerName: string, round: number): string` → `` `${tournamentId}|${playerName}|${round}` ``
  `buildPush(data: StorageData, meta: SyncMeta): SyncPush` (cells read from `data.validations`, absent = false)
  `ackPush(meta: SyncMeta, sent: SyncPush): SyncMeta` (removes exactly the sent ids/keys)
  `mergeServerState(data: StorageData, meta: SyncMeta, state: ServerState): { data: StorageData; meta: SyncMeta }`
  `markAllDirty(data: StorageData, meta: SyncMeta): SyncMeta` (sets `migrated: true`)
- Produces (`ClubStorage`, `src/lib/storage.ts`): `getSyncMeta(): SyncMeta`, `setSyncMeta(meta: SyncMeta): void` (key `${key}:sync`), `saveEventLocal(event: Event): void` (no mark); `saveEvent`, `deleteEvent`, `setValidation`, `clearTournamentValidations`, `importEvent` now mark. Module-level `subscribeLocalChanges(listener: (slug: string) => void): () => void`, notified after every marking write.

- [ ] **Step 1: Failing tests** (`sync-state.test.ts`):
  - `buildPush sends dirty events, pending tombstones and dirty cells` (absent cell → `value:false`).
  - `ack keeps marks added after the payload was built`.
  - `mergeServerState drops tombstoned events and records knownTombstones`.
  - `server event keeps local FFE data of matching tournaments` (local `players` kept; server `name` taken).
  - `local event dirty is kept over server version`; `local-only event not dirty is kept`.
  - `server cells applied except dirty local cells`; `currentEventId untouched` (falls back to first event if its event was tombstoned).
  - `markAllDirty marks every event and every existing cell once`.
- [ ] **Step 2: Failing tests** (`storage.test.ts`): `saveEvent marks the event dirty`; `saveEventLocal does not`; `deleteEvent records a pending tombstone and unmarks the event`; `setValidation marks the cell`; `clearTournamentValidations marks existing cells false`; `importing a known tombstoned id assigns a new id`; `marks survive a new storage instance`; `subscribeLocalChanges is notified with the slug`.
- [ ] **Step 3: Run** both files → FAIL.
- [ ] **Step 4: Implement** `sync-state.ts` (pure), then the storage changes (keep `createClubStorage` under the function-length limit: put mark helpers in `sync-state.ts`).
- [ ] **Step 5: Run** → PASS; full `npx vitest run` → only `sync.test.ts` failures allowed (Task 4).
- [ ] **Step 6: Commit** `feat(sync): client dirty marks and server-state merge`.

### Task 4: Sync orchestrator

**Files:**
- Modify (rewrite): `src/lib/sync.ts`, `src/lib/sync.test.ts`

**Interfaces:**
- Consumes: Task 2 API, Task 3 `ClubStorage` + `sync-state`.
- Produces: `syncClub(clubSlug: string): Promise<{ ok: boolean }>`; `startAutoSync(clubSlug: string, onApplied: () => void): () => void` (subscribes to local changes with `SYNC_DEBOUNCE_MS = 3000`, listens to `window` `online`, returns cleanup). `syncToCloud` / `fetchFromCloud` removed.

- [ ] **Step 1: Failing tests** (fetch mocked, fake timers):
  - `first run marks everything dirty once` (`migrated` flag).
  - `posts the push and merges the returned state`; `ack only what was sent`.
  - `keeps marks and returns ok:false on network error or non-2xx`.
  - `uses GET /api/events/fetch when nothing is dirty`.
  - `one sync in flight per club` (second call awaits the first).
  - `startAutoSync debounces bursts to one request after 3000 ms`; `syncs on online event`; `cleanup unsubscribes`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** full suite → PASS, `tsc` 0.
- [ ] **Step 5: Commit** `feat(sync): automatic push+pull orchestrator`.

### Task 5: Wire triggers and UI

**Files:**
- Modify: `app/page.tsx` (sync on open), `src/hooks/useTournamentSync.ts` (FFE writes → `saveEventLocal`; club select/change keep `saveEvent`; `handleRefresh` → `syncClub` after the FFE refresh), `src/components/EventsManager.tsx` (remove cloud buttons, `cloudUpload`/`cloudDownload`, `CloudUpload`/`CloudDownload` imports; delete text), related tests, `MODE_EMPLOI.md` §9, `CLAUDE.md` § Sync strategy, `README.md`.

**Interfaces:**
- Consumes: `syncClub`, `startAutoSync` (Task 4), `saveEventLocal` (Task 3).

- [ ] **Step 1: Failing tests:** `useTournamentSync` — fetchResults/fetchClubs call `saveEventLocal`, club change calls `saveEvent`, `handleRefresh` calls `syncClub` once per refresh; `EventsManager` — no "Envoyer vers le cloud" / "Télécharger depuis le cloud" controls; delete dialog text contains `pour tout le club`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**: page effect `useEffect(() => startAutoSync(slug, reloadCurrentEvent), [slug])` plus one `syncClub` on mount; delete description: « L'événement et ses tournois seront supprimés pour tout le club, sur tous les téléphones. Cette action est irréversible. »
- [ ] **Step 4: Run** full gates: `npx tsc --noEmit`, `npx eslint src app --max-warnings 0`, `npx vitest run`, `npm run duplication`, `npm run build` → all green.
- [ ] **Step 5:** Update docs (MODE_EMPLOI §9 "Synchronisation automatique", CLAUDE.md sync strategy, README storage line). **Commit** `feat(sync): automatic sync on open, Actualiser and local changes`.

### Task 6: Production rollout and probe

- [ ] **Step 1:** Neon SQL editor (read-only off, one statement per run): the two Task 1 statements; verify with `information_schema.columns` (club_events has `deleted_at`; club_validations 6 columns); read-only back on.
- [ ] **Step 2:** Vercel Firewall: edit rule "API rate limit" → 60 requests / 60 s; publish.
- [ ] **Step 3:** `git push origin master` (pre-push 7 gates) → wait for the new production deployment (Vercel `list_deployments`, state READY, sha = HEAD).
- [ ] **Step 4: Probe** (scratch script signing with the real secret, deleted after): client A pushes event E + cell X; client B pushes cell Y (no events); both GET → cells X and Y present; A tombstones E → GET shows E in `deletedEventIds`, cells of E gone; B pushes stale E → still deleted. 61 calls on `/api/events/fetch` → 60 non-429 then 429. Delete probe rows (Neon), count back to the `hay-chess` baseline.
- [ ] **Step 5:** `docs/CHECKUP-2026-10-20.md` addendum with the measured values; commit `docs(sync): production probe of auto-sync`; push.
