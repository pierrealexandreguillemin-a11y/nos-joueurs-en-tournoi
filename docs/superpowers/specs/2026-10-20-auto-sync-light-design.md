# Auto-sync "light" — design

Date: 2026-10-20 · Status: approved by the owner 2026-10-20 (after builder check) · Context: `docs/CHECKUP-2026-10-20.md`

## Why

On a tournament Saturday several parents of the same club follow the same event, each on their own
phone (owner, 2026-10-20). Each parent ticks the validations of **their own players**; everybody may
press "Actualiser" (FFE refresh); sometimes one **responsable** is designated and does everything. The
responsable creates, edits and deletes events and tournaments. Venue network is **not reliable**.

Today's manual sync loses data in this setting (verified in code 2026-10-20):

- push: the server replaces the whole club's validations with the sender's (`saveValidations`) — parent
  B pushing without pulling first erases parent A's ticks;
- pull: `{...remote.validations, ...local.validations}` merges per **tournament** — for a tournament both
  touched, the local object replaces the remote one entirely;
- deletions never reach the server (no call path), so a pull resurrects deleted events.

## Goal (this iteration, "light" — owner: "on fait light en attendant les retours")

1. Validations sync **cell by cell** (tournament × player × round): two parents ticking different
   players never erase each other.
2. Deletions are **remembered by the server** and applied on every device; a deleted event never comes back.
3. Sync is **automatic**: on app open, on "Actualiser", and a few seconds after each local change.
4. Works on a flaky network: a failed push leaves a "to resend" mark; retried at the next of those moments.
5. Delete confirmation says the deletion applies **to the whole club**. Manual cloud buttons removed.

## Non-goals (deferred until parents' feedback — owner decision)

- Opening the app with no network (service worker / app-shell cache).
- A visible "changes waiting to be sent" indicator.
- A responsable PIN / any permission enforcement (confirmation is enough — owner).
- Fine conflict arbitration on the **same** cell (here: last write to reach the server wins).
- Live updates while the app stays open (owner: on open / on Actualiser is enough).

## Anti-goals

- A parent's tick silently disappearing because another parent synced.
- A deleted event reappearing.
- More than ~60 `/api/*` calls per minute from one venue IP (WAF rule, shared by parents on the same Wi-Fi).
- Losing the local copy: the phone stays the source of what the parent sees; the app keeps working
  offline once open, as today.

## Constraints

- Stack in place: Next.js 16 App Router routes `app/api/events/{sync,fetch}`, Neon Postgres via
  `src/lib/db.ts` (`@neondatabase/serverless`, tagged templates), Zod schemas in `src/lib/schemas.ts`,
  HMAC token `X-Sync-Token` (`src/lib/hmac.ts`), localStorage per club via `createClubStorage(slug)`
  (`src/lib/storage.ts`) — the single write path (`saveEvent`, `deleteEvent`, `setValidation`,
  `clearTournamentValidations`, `importEvent`).
- WAF: 60 req / 60 s / IP on `/api/*` (fixed window; raised from 30 on 2026-10-20, counts `/api/scrape` too).
- Quality gates of `CLAUDE.md` (complexity 15, function length 80, jscpd 5 %, coverage thresholds, design-token gate).
- Schema changes are applied by hand in the Neon SQL editor (one statement per run) and versioned in
  `db/schema.sql` (T4 of the session-end procedure).
- No data to migrate on the server beyond 1 event of club `hay-chess` (2026-10-20); the existing
  `club_state.validations` JSON of that club is migrated into cells once (or re-pushed from the owner's phone).

## Decided how (owner or this conversation)

- Triggers: app open, "Actualiser", ~3 s after the last local change (debounce; builder's value) — no polling.
- Unit of validation sync: one cell `(tournamentId, playerName, round) → boolean`.
- Same-cell conflict: last write reaching the server wins (finer arbitration deferred).
- Events/tournaments: whole-event upsert; deletions as server-side tombstones.
- Offline: "dirty" marks persisted in localStorage, resent at the next trigger; no separate queue.
- Delete confirmation reworded ("supprimé pour tout le club"); cloud upload/download buttons removed.
- **FFE refresh stays local** (owner: FFE results are not shared, everyone refreshes). A refresh does
  not mark the event dirty. Only the responsable's structural edits (create, edit, delete, import) are
  pushed. On pull, the server event replaces the local one **but the local tournaments keep their FFE
  data** (`players`, `pairings`, `pairingsRound`, `lastUpdate`) when the tournament id matches.
  *(Builder check Q1 — derived from the owner's answers.)*
- **Rollout:** the first launch of the new version marks every local event and every local cell dirty
  once (flag in localStorage). Safe because the server is empty except club `hay-chess`. After that, a
  local event that is neither on the server, nor tombstoned, nor dirty is **kept and pushed**.
  *(Q2 — our call.)*
- **Cleared cells** (`clearTournamentValidations`, club change) are pushed as `value=false` cells.
  Tombstoning an event deletes the server cells of its tournaments. *(Q3 — our call.)*
- **`currentEventId` becomes local to each phone** (no longer synced, `club_state.current_event_id`
  unused), so one parent's refresh never switches another's screen. *(Q4 — our call.)*
- **Request budget:** push and pull are **one request** (`POST /api/events/sync` answers with the
  server state), once per trigger, not per tournament. WAF rule raised from 30 to **60 req / 60 s / IP**
  (owner: yes) because one Actualiser already costs 3-4 `/api/scrape` calls. *(Q5.)*
- **Re-import of a tombstoned event** (share link, JSON import): it gets a new id and lives again.
  *(Q6 — our call.)*

## Data model (proposed)

Server (`db/schema.sql`):

- `club_events` + `deleted_at timestamptz NULL` (tombstone; row kept, `data` may be kept or nulled).
- New `club_validations (club_slug, tournament_id, player_name, round int, value boolean,
  updated_at timestamptz default now(), PRIMARY KEY (club_slug, tournament_id, player_name, round))`.
- `club_state` (validations, current_event_id) no longer written or read (table left in place, documented).

Client (localStorage, per club, next to existing `StorageData`):

- `dirtyEventIds: string[]`, `deletedEventIds: string[]` (pending tombstones), `dirtyCells: string[]`
  (`tournamentId|playerName|round`). Written by the `createClubStorage` write methods; cleared for
  exactly what a push acknowledged.

## Protocol (proposed)

- `POST /api/events/sync` body: `{ clubSlug, events: Event[] (dirty only), deletedEventIds: string[],
  cells: {tournamentId, playerName, round, value}[] }` — Zod-bounded like today. Server: set tombstones
  (and delete their cells), upsert events that are not tombstoned (a tombstone wins over a stale
  upsert), upsert cells; then **answers with the full server state** `{ events (not deleted),
  deletedEventIds, cells }` so one request = push + pull.
- `GET /api/events/fetch` kept, same answer shape (pull only, e.g. when nothing is dirty).
- Client pull: drop locally every tombstoned event; take server events except those still dirty
  locally; take server cells except those still dirty locally.
- Order on each trigger: push pending (if any) then pull. On push failure keep marks, still try pull.

## Left to the builder

- Module boundaries (e.g. a `cloud-sync` module wrapping `sync.ts`), hook placement for "app open"
  (`app/page.tsx` / `ClubContext`) and "Actualiser" (`useTournamentSync.handleRefresh`).
- Debounce value, retry on `online` event (allowed, cheap), exact Zod bounds for `cells` (e.g. ≤ 5 000).
- Whether tombstoned rows keep `data`.
- Tests: unit (storage marks, merge rules, routes with mocked db, db round trips on the in-memory
  stand-in), plus a production probe after deploy: two simulated clients ticking different players then
  both pulling — both ticks present; delete on one — gone on the other after pull.

## Success

- Two phones, same club, same event: A ticks player X, B ticks player Y, both press Actualiser → both
  see X and Y ticked. Same with one of them offline during the tick, once it is back.
- Responsable deletes an event → it disappears on the other phone at its next open / Actualiser and
  never comes back.
- No `/api/*` 429 in normal use by 5 parents on one Wi-Fi.
