import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { StorageData, Event, ValidationState } from '@/types';

// Postgres (Neon) store for club sync. Schema: db/schema.sql.
// One row per (club, event) in club_events; one row per club in club_state.

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

/**
 * Upsert events of a club (one statement, whatever the number of events)
 */
export async function saveEvents(events: Event[], clubSlug: string): Promise<void> {
  if (events.length === 0) return;

  await getSql()`
    INSERT INTO club_events (club_slug, event_id, data)
    SELECT ${clubSlug}, e->>'id', e
    FROM jsonb_array_elements(${JSON.stringify(events)}::jsonb) AS e
    ON CONFLICT (club_slug, event_id)
    DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `;
}

/**
 * Get all events of a club
 */
export async function getEvents(clubSlug: string): Promise<Event[]> {
  const rows = await getSql()`SELECT data FROM club_events WHERE club_slug = ${clubSlug}`;
  return rows.map(row => row.data as Event);
}

/**
 * Save validations of a club
 */
export async function saveValidations(validations: ValidationState, clubSlug: string): Promise<void> {
  await getSql()`
    INSERT INTO club_state (club_slug, validations)
    VALUES (${clubSlug}, ${JSON.stringify(validations)}::jsonb)
    ON CONFLICT (club_slug)
    DO UPDATE SET validations = EXCLUDED.validations, updated_at = now()
  `;
}

/**
 * Save current event ID of a club
 */
export async function saveCurrentEventId(eventId: string, clubSlug: string): Promise<void> {
  await getSql()`
    INSERT INTO club_state (club_slug, current_event_id)
    VALUES (${clubSlug}, ${eventId})
    ON CONFLICT (club_slug)
    DO UPDATE SET current_event_id = EXCLUDED.current_event_id, updated_at = now()
  `;
}

/**
 * Get all storage data of a club
 */
export async function getStorageData(clubSlug: string): Promise<StorageData> {
  const [events, stateRows] = await Promise.all([
    getEvents(clubSlug),
    getSql()`SELECT validations, current_event_id FROM club_state WHERE club_slug = ${clubSlug}`,
  ]);
  const state = stateRows[0];

  return {
    events,
    validations: (state?.validations as ValidationState | undefined) ?? {},
    currentEventId: (state?.current_event_id as string | undefined) ?? '',
  };
}
