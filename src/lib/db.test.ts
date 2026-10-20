import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeEvent, makeTournament } from '@/test/fixtures';
import type { SyncPush } from '@/types';

// In-memory stand-in for the Neon tagged-template client. It recognises the statements of db.ts
// and applies their semantics, so round trips are tested rather than SQL strings. The real SQL is
// exercised against Neon in production (docs/CHECKUP-2026-10-20.md).
type Row = Record<string, unknown>;
interface EventRow { data: Row; deleted: boolean }
const events = new Map<string, EventRow>(); // slug|eventId
const cells = new Map<string, Row>(); // slug|tournamentId|player|round
const queries: string[] = [];

const tournamentIdsOf = (row: EventRow | undefined): string[] =>
  ((row?.data.tournaments as Row[] | undefined) ?? []).map(t => t.id as string);

function tombstone(slug: string, ids: string[]): Row[] {
  for (const id of ids) {
    const prev = events.get(`${slug}|${id}`);
    events.set(`${slug}|${id}`, { data: prev?.data ?? { tournaments: [] }, deleted: true });
  }
  return [];
}

function deleteCellsOf(slug: string, ids: string[]): Row[] {
  const tids = ids.flatMap(id => tournamentIdsOf(events.get(`${slug}|${id}`)));
  for (const key of [...cells.keys()]) {
    if (tids.some(t => key.startsWith(`${slug}|${t}|`))) cells.delete(key);
  }
  return [];
}

function upsertEvents(slug: string, json: string): Row[] {
  for (const e of JSON.parse(json) as Row[]) {
    const prev = events.get(`${slug}|${e.id}`);
    if (!prev?.deleted) events.set(`${slug}|${e.id}`, { data: e, deleted: false });
  }
  return [];
}

function upsertCells(slug: string, json: string, sqlText: string): Row[] {
  // Mirrors the SQL guard only if the statement carries it, so the test fails when db.ts drops it
  const guarded = sqlText.includes('NOT EXISTS') && sqlText.includes('deleted_at IS NOT NULL');
  const deadTournaments = !guarded ? [] : [...events.entries()]
    .filter(([k, r]) => k.startsWith(`${slug}|`) && r.deleted).flatMap(([, r]) => tournamentIdsOf(r));
  for (const c of (JSON.parse(json) as Row[]).filter(c => !deadTournaments.includes(c.tournamentId as string))) {
    cells.set(`${slug}|${c.tournamentId}|${c.playerName}|${c.round}`, {
      tournament_id: c.tournamentId, player_name: c.playerName, round: c.round, value: c.value,
    });
  }
  return [];
}

const rowsOf = <T,>(map: Map<string, T>, slug: string) =>
  [...map.entries()].filter(([k]) => k.startsWith(`${slug}|`)).map(([, v]) => v);

const handlers: Array<[string, (v: unknown[], text: string) => Row[]]> = [
  ['INSERT INTO club_events (club_slug, event_id, data, deleted_at)', v => tombstone(v[0] as string, v[1] as string[])],
  ['DELETE FROM club_validations', v => deleteCellsOf(v[0] as string, v[2] as string[])],
  ['INSERT INTO club_events (club_slug, event_id, data)', v => upsertEvents(v[0] as string, v[1] as string)],
  ['INSERT INTO club_validations', (v, text) => upsertCells(v[0] as string, v[1] as string, text)],
  ['SELECT data FROM club_events', v => rowsOf(events, v[0] as string).filter(r => !r.deleted).map(r => ({ data: r.data }))],
  ['SELECT event_id FROM club_events', v => [...events.entries()]
    .filter(([k, r]) => k.startsWith(`${v[0]}|`) && r.deleted).map(([k]) => ({ event_id: k.split('|')[1] }))],
  ['SELECT tournament_id, player_name, round, value FROM club_validations', v => rowsOf(cells, v[0] as string)],
];

function fakeSql(strings: TemplateStringsArray, ...values: unknown[]): Promise<Row[]> {
  const text = strings.join('?').replace(/\s+/g, ' ').trim();
  queries.push(text);
  const handler = handlers.find(([prefix]) => text.startsWith(prefix));
  return handler ? Promise.resolve(handler[1](values, text)) : Promise.reject(new Error(`unexpected query: ${text}`));
}

const neonMock = vi.fn(() => fakeSql);
vi.mock('@neondatabase/serverless', () => ({ neon: neonMock }));

process.env.DATABASE_URL = 'postgresql://user:pass@fake.neon.tech/db';
const { applySync, getServerState } = await import('./db');

const push = (p: Partial<SyncPush>): SyncPush => ({ events: [], deletedEventIds: [], cells: [], ...p });
const cell = (tournamentId: string, playerName: string, round: number, value: boolean) =>
  ({ tournamentId, playerName, round, value });

describe('db', () => {
  beforeEach(() => {
    events.clear();
    cells.clear();
    queries.length = 0;
  });

  it('applies events, then returns them', async () => {
    await applySync('club-a', push({ events: [makeEvent('e1', 'Open A')] }));
    const state = await getServerState('club-a');
    expect(state.events.map(e => e.id)).toEqual(['e1']);
    expect(state.deletedEventIds).toEqual([]);
  });

  it('tombstone wins over a later upsert', async () => {
    await applySync('club-a', push({ events: [makeEvent('e1', 'Open A')] }));
    await applySync('club-a', push({ deletedEventIds: ['e1'] }));
    await applySync('club-a', push({ events: [makeEvent('e1', 'Stale copy')] }));
    const state = await getServerState('club-a');
    expect(state.events).toEqual([]);
    expect(state.deletedEventIds).toEqual(['e1']);
  });

  it("tombstone deletes the cells of the event's tournaments", async () => {
    const e1 = makeEvent('e1', 'Open A', { tournaments: [makeTournament({ id: 't1' })] });
    await applySync('club-a', push({ events: [e1], cells: [cell('t1', 'DUPONT JEAN', 1, true)] }));
    await applySync('club-a', push({ deletedEventIds: ['e1'] }));
    expect((await getServerState('club-a')).cells).toEqual([]);
  });

  it('cells upsert per cell', async () => {
    await applySync('club-a', push({ cells: [cell('t1', 'A', 1, true)] }));
    await applySync('club-a', push({ cells: [cell('t1', 'B', 1, true)] }));
    await applySync('club-a', push({ cells: [cell('t1', 'A', 1, false)] }));
    const byPlayer = Object.fromEntries((await getServerState('club-a')).cells.map(c => [c.playerName, c.value]));
    expect(byPlayer).toEqual({ A: false, B: true });
  });

  it('isolates clubs', async () => {
    await applySync('club-a', push({ events: [makeEvent('e1', 'Open')], cells: [cell('t1', 'A', 1, true)] }));
    await applySync('club-b', push({ deletedEventIds: ['e9'] }));
    expect(await getServerState('club-b')).toEqual({ events: [], deletedEventIds: ['e9'], cells: [] });
    expect((await getServerState('club-a')).deletedEventIds).toEqual([]);
  });

  it('I-3: ticks pushed after the event was deleted are not stored', async () => {
    const e1 = makeEvent('e1', 'Open A', { tournaments: [makeTournament({ id: 't1' })] });
    await applySync('club-a', push({ events: [e1] }));
    await applySync('club-a', push({ deletedEventIds: ['e1'] }));
    await applySync('club-a', push({ cells: [cell('t1', 'LATE PARENT', 1, true)] }));
    expect((await getServerState('club-a')).cells).toEqual([]);
  });

  it('does not query for an empty push', async () => {
    await applySync('club-a', push({}));
    expect(queries).toEqual([]);
  });
});

describe('db without DATABASE_URL', () => {
  it('fails on first query with an explicit error', async () => {
    vi.resetModules();
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const fresh = await import('./db');
    await expect(fresh.getServerState('club-a')).rejects.toThrow('DATABASE_URL is not set');
    process.env.DATABASE_URL = saved;
  });
});
