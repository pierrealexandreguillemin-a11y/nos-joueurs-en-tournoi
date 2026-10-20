import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { Event, ServerState, SyncPush, ValidationCell } from '@/types';

// Postgres (Neon) store for club sync. Schema: db/schema.sql.
// club_events: one row per (club, event), deleted_at = tombstone (a tombstone wins over later upserts).
// club_validations: one row per tick (club, tournament, player, round).

type Sql = NeonQueryFunction<false, false>;

let client: Sql | null = null;

/**
 * Lazy client: next build evaluates modules without DATABASE_URL,
 * so the connection string is only required on the first query.
 */
function getSql(): Sql {
  if (!client) {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) throw new Error('DATABASE_URL is not set');
    client = neon(url);
  }
  return client;
}

/** Mark events deleted (creating the row for ids the server never saw) and drop their ticks */
async function applyTombstones(clubSlug: string, ids: string[]): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO club_events (club_slug, event_id, data, deleted_at)
    SELECT ${clubSlug}, id, '{"tournaments":[]}'::jsonb, now() FROM unnest(${ids}::text[]) AS id
    ON CONFLICT (club_slug, event_id) DO UPDATE SET deleted_at = now()
  `;
  await sql`
    DELETE FROM club_validations
    WHERE club_slug = ${clubSlug} AND tournament_id IN (
      SELECT t->>'id' FROM club_events e, jsonb_array_elements(e.data->'tournaments') AS t
      WHERE e.club_slug = ${clubSlug} AND e.event_id = ANY(${ids}::text[])
    )
  `;
}

/** Upsert events in one statement; a tombstoned event is never revived */
async function upsertEvents(clubSlug: string, events: Event[]): Promise<void> {
  await getSql()`
    INSERT INTO club_events (club_slug, event_id, data)
    SELECT ${clubSlug}, e->>'id', e FROM jsonb_array_elements(${JSON.stringify(events)}::jsonb) AS e
    ON CONFLICT (club_slug, event_id)
    DO UPDATE SET data = EXCLUDED.data, updated_at = now() WHERE club_events.deleted_at IS NULL
  `;
}

/** Upsert ticks one by one: last write to reach the server wins per cell */
async function upsertCells(clubSlug: string, cells: ValidationCell[]): Promise<void> {
  await getSql()`
    INSERT INTO club_validations (club_slug, tournament_id, player_name, round, value)
    SELECT ${clubSlug}, c."tournamentId", c."playerName", c.round, c.value
    FROM jsonb_to_recordset(${JSON.stringify(cells)}::jsonb)
      AS c("tournamentId" text, "playerName" text, round int, value boolean)
    ON CONFLICT (club_slug, tournament_id, player_name, round)
    DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}

/**
 * Apply what a phone pushed. Tombstones first, so a stale copy sent in the same push cannot revive.
 */
export async function applySync(clubSlug: string, push: SyncPush): Promise<void> {
  if (push.deletedEventIds.length > 0) await applyTombstones(clubSlug, push.deletedEventIds);
  if (push.events.length > 0) await upsertEvents(clubSlug, push.events);
  if (push.cells.length > 0) await upsertCells(clubSlug, push.cells);
}

/** Full server state of a club */
export async function getServerState(clubSlug: string): Promise<ServerState> {
  const sql = getSql();
  const [eventRows, tombstoneRows, cellRows] = await Promise.all([
    sql`SELECT data FROM club_events WHERE club_slug = ${clubSlug} AND deleted_at IS NULL`,
    sql`SELECT event_id FROM club_events WHERE club_slug = ${clubSlug} AND deleted_at IS NOT NULL`,
    sql`SELECT tournament_id, player_name, round, value FROM club_validations WHERE club_slug = ${clubSlug}`,
  ]);

  return {
    events: eventRows.map(row => row.data as Event),
    deletedEventIds: tombstoneRows.map(row => row.event_id as string),
    cells: cellRows.map(row => ({
      tournamentId: row.tournament_id as string,
      playerName: row.player_name as string,
      round: row.round as number,
      value: row.value as boolean,
    })),
  };
}
