import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeEvent } from '@/test/fixtures';

// In-memory stand-in for the Neon tagged-template client. It recognises the five
// statements of db.ts and applies their upsert semantics, so round trips are tested
// rather than SQL strings. The real SQL is exercised against Neon in production
// (see docs/CHECKUP-2026-10-20.md).
type Row = Record<string, unknown>;
const events = new Map<string, Row>(); // key: slug|eventId
const states = new Map<string, Row>(); // key: slug
const queries: string[] = [];

function fakeSql(strings: TemplateStringsArray, ...values: unknown[]): Promise<Row[]> {
  const text = strings.join('?').replace(/\s+/g, ' ').trim();
  queries.push(text);

  if (text.startsWith('INSERT INTO club_events')) {
    const [slug, json] = values as [string, string];
    for (const e of JSON.parse(json) as Row[]) events.set(`${slug}|${e.id}`, { data: e });
    return Promise.resolve([]);
  }
  if (text.startsWith('SELECT data FROM club_events')) {
    const [slug] = values as [string];
    return Promise.resolve([...events.entries()].filter(([k]) => k.startsWith(`${slug}|`)).map(([, v]) => v));
  }
  if (text.startsWith('INSERT INTO club_state (club_slug, validations)')) {
    const [slug, json] = values as [string, string];
    states.set(slug, { current_event_id: '', ...states.get(slug), validations: JSON.parse(json) });
    return Promise.resolve([]);
  }
  if (text.startsWith('INSERT INTO club_state (club_slug, current_event_id)')) {
    const [slug, id] = values as [string, string];
    states.set(slug, { validations: {}, ...states.get(slug), current_event_id: id });
    return Promise.resolve([]);
  }
  if (text.startsWith('SELECT validations, current_event_id FROM club_state')) {
    const [slug] = values as [string];
    const row = states.get(slug);
    return Promise.resolve(row ? [row] : []);
  }
  return Promise.reject(new Error(`unexpected query: ${text}`));
}

const neonMock = vi.fn(() => fakeSql);
vi.mock('@neondatabase/serverless', () => ({ neon: neonMock }));

process.env.DATABASE_URL = 'postgresql://user:pass@fake.neon.tech/db';
const { saveEvents, getEvents, saveValidations, saveCurrentEventId, getStorageData } = await import('./db');

describe('db', () => {
  beforeEach(() => {
    events.clear();
    states.clear();
    queries.length = 0;
  });

  describe('saveEvents / getEvents', () => {
    it('round-trips events of a club', async () => {
      const e1 = makeEvent('e1', 'Open A');
      const e2 = makeEvent('e2', 'Open B');
      await saveEvents([e1, e2], 'club-a');

      const result = await getEvents('club-a');
      expect(result.map(e => e.id).sort()).toEqual(['e1', 'e2']);
    });

    it('writes all events in a single statement', async () => {
      await saveEvents([makeEvent('e1', 'Open'), makeEvent('e2', 'Open'), makeEvent('e3', 'Open')], 'club-a');
      expect(queries).toHaveLength(1);
    });

    it('updates an existing event instead of duplicating it', async () => {
      await saveEvents([makeEvent('e1', 'Before')], 'club-a');
      await saveEvents([makeEvent('e1', 'After')], 'club-a');

      const result = await getEvents('club-a');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('After');
    });

    it('does not query when there is nothing to save', async () => {
      await saveEvents([], 'club-a');
      expect(queries).toEqual([]);
    });

    it('isolates clubs', async () => {
      await saveEvents([makeEvent('e1', 'Open')], 'club-a');
      await saveEvents([makeEvent('e2', 'Open')], 'club-b');

      expect((await getEvents('club-a')).map(e => e.id)).toEqual(['e1']);
      expect((await getEvents('club-b')).map(e => e.id)).toEqual(['e2']);
    });
  });

  describe('getStorageData', () => {
    it('returns empty data for an unknown club', async () => {
      expect(await getStorageData('nobody')).toEqual({ events: [], validations: {}, currentEventId: '' });
    });

    it('combines events, validations and current event', async () => {
      const validations = { t1: { 'DUPONT JEAN': { round_1: true } } };
      await saveEvents([makeEvent('e1', 'Open')], 'club-a');
      await saveValidations(validations, 'club-a');
      await saveCurrentEventId('e1', 'club-a');

      const data = await getStorageData('club-a');
      expect(data.events.map(e => e.id)).toEqual(['e1']);
      expect(data.validations).toEqual(validations);
      expect(data.currentEventId).toBe('e1');
    });

    it('keeps validations when only the current event changes', async () => {
      const validations = { t1: { 'DUPONT JEAN': { round_1: true } } };
      await saveValidations(validations, 'club-a');
      await saveCurrentEventId('e2', 'club-a');

      expect((await getStorageData('club-a')).validations).toEqual(validations);
    });
  });
});

describe('db without DATABASE_URL', () => {
  it('fails on first query with an explicit error', async () => {
    vi.resetModules();
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const fresh = await import('./db');
    await expect(fresh.getEvents('club-a')).rejects.toThrow('DATABASE_URL is not set');
    process.env.DATABASE_URL = saved;
  });
});
