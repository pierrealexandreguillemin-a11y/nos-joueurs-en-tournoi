// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClubStorage } from './storage';
import { cellKey, emptySyncMeta } from './sync-state';
import { makeEvent, makeTournament } from '@/test/fixtures';
import type { ServerState } from '@/types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { syncClub, startAutoSync, SYNC_DEBOUNCE_MS } from './sync';

const SLUG = 'hay-chess';
const state = (s: Partial<ServerState> = {}): ServerState => ({ events: [], deletedEventIds: [], cells: [], ...s });
const okResponse = (s: ServerState) => ({ ok: true, json: async () => ({ success: true, data: s }) });
const lastBody = () => JSON.parse(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][1].body as string);
// crypto.subtle (HMAC token) settles outside the microtask queue: poll on real macrotasks
const until = async (condition: () => boolean) => {
  for (let i = 0; i < 200 && !condition(); i++) await new Promise(resolve => setImmediate(resolve));
};
const stops: Array<() => void> = [];
const autoSync = (onApplied: () => void) => {
  const stop = startAutoSync(SLUG, onApplied);
  stops.push(stop);
  return stop;
};
const migrated = () => {
  const storage = createClubStorage(SLUG);
  storage.setSyncMeta({ ...emptySyncMeta(), migrated: true });
  return storage;
};

describe('sync orchestrator', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
  });

  afterEach(() => {
    stops.splice(0).forEach(stop => stop());
    vi.useRealTimers();
  });

  it('first run marks everything dirty once', async () => {
    localStorage.setItem(`nos-joueurs-en-tournoi:${SLUG}`, JSON.stringify({
      currentEventId: 'e1', events: [makeEvent('e1', 'Open')], validations: { t1: { A: { round_1: true } } },
    }));
    mockFetch.mockResolvedValue(okResponse(state({ events: [makeEvent('e1', 'Open')] })));

    await syncClub(SLUG);

    expect(lastBody()).toMatchObject({ clubSlug: SLUG, events: [{ id: 'e1' }], cells: [{ tournamentId: 't1', playerName: 'A', round: 1, value: true }] });
    expect(createClubStorage(SLUG).getSyncMeta().migrated).toBe(true);
  });

  it('posts the push and merges the returned state', async () => {
    const storage = migrated();
    storage.setValidation('t1', 'A', 1, true);
    mockFetch.mockResolvedValue(okResponse(state({
      events: [makeEvent('e1', 'Open', { tournaments: [makeTournament({ id: 't1' })] })],
      cells: [
        { tournamentId: 't1', playerName: 'A', round: 1, value: true },
        { tournamentId: 't1', playerName: 'B', round: 1, value: true },
      ],
    })));

    const result = await syncClub(SLUG);

    expect(result).toEqual({ ok: true });
    expect(mockFetch.mock.calls[0][0]).toMatch(/\/api\/events\/sync$/);
    expect(mockFetch.mock.calls[0][1].headers['X-Sync-Token']).toMatch(/^[0-9a-f]{64}:\d+$/);
    expect(storage.getValidation('t1', 'B', 1)).toBe(true);
    expect(storage.getSyncMeta().dirtyCells).toEqual({});
  });

  it('ack only what was sent', async () => {
    const storage = migrated();
    storage.setValidation('t1', 'A', 1, true);
    mockFetch.mockImplementation(async () => {
      storage.setValidation('t1', 'B', 1, true); // ticked while the request was in flight
      return okResponse(state({ cells: [{ tournamentId: 't1', playerName: 'A', round: 1, value: true }] }));
    });

    await syncClub(SLUG);

    expect(Object.keys(storage.getSyncMeta().dirtyCells)).toEqual([cellKey('t1', 'B', 1)]);
    expect(storage.getValidation('t1', 'B', 1)).toBe(true);
  });

  it('keeps marks and returns ok:false on network error', async () => {
    const storage = migrated();
    storage.setValidation('t1', 'A', 1, true);
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await syncClub(SLUG)).toEqual({ ok: false });
    expect(Object.keys(storage.getSyncMeta().dirtyCells)).toEqual([cellKey('t1', 'A', 1)]);
  });

  it('keeps marks and returns ok:false on a non-2xx answer', async () => {
    const storage = migrated();
    storage.setValidation('t1', 'A', 1, true);
    mockFetch.mockResolvedValue({ ok: false, status: 429, statusText: 'Too Many Requests', json: async () => ({}) });
    expect(await syncClub(SLUG)).toEqual({ ok: false });
    expect(Object.keys(storage.getSyncMeta().dirtyCells)).toEqual([cellKey('t1', 'A', 1)]);
  });

  it('uses GET /api/events/fetch when nothing is dirty', async () => {
    migrated();
    mockFetch.mockResolvedValue(okResponse(state({ events: [makeEvent('e2', 'From responsable')] })));
    await syncClub(SLUG);
    expect(mockFetch.mock.calls[0][0]).toMatch(/\/api\/events\/fetch\?clubSlug=hay-chess$/);
    expect(createClubStorage(SLUG).getAllEvents().map(e => e.id)).toEqual(['e2']);
  });

  it('one sync in flight per club', async () => {
    migrated();
    let inFlight = 0;
    let maxInFlight = 0;
    mockFetch.mockImplementation(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise(resolve => setTimeout(resolve, 5));
      inFlight--;
      return okResponse(state());
    });
    await Promise.all([syncClub(SLUG), syncClub(SLUG)]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(maxInFlight).toBe(1);
  });

  it('I-1: still pulls when the push is refused, and keeps the marks', async () => {
    const storage = migrated();
    storage.setValidation('t1', 'A', 1, true);
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 400, statusText: 'Bad Request', json: async () => ({}) })
      .mockResolvedValueOnce(okResponse(state({ events: [makeEvent('e2', 'From responsable')] })));

    expect(await syncClub(SLUG)).toEqual({ ok: false });
    expect(mockFetch.mock.calls[1][0]).toMatch(/\/api\/events\/fetch\?clubSlug=hay-chess$/);
    expect(storage.getAllEvents().map(e => e.id)).toEqual(['e2']);
    expect(Object.keys(storage.getSyncMeta().dirtyCells)).toEqual([cellKey('t1', 'A', 1)]);
  });

  it('I-1: sends many dirty events in requests of at most 20, all acknowledged', async () => {
    const storage = migrated();
    for (let i = 0; i < 45; i++) storage.saveEvent(makeEvent(`e${i}`, `Open ${i}`));
    mockFetch.mockImplementation(async () => okResponse(state({ events: storage.getAllEvents() })));

    expect(await syncClub(SLUG)).toEqual({ ok: true });
    const sizes = mockFetch.mock.calls.map(call => JSON.parse(call[1].body).events.length);
    expect(sizes).toEqual([20, 20, 5]);
    expect(storage.getSyncMeta().dirtyEvents).toEqual({});
  });

  describe('startAutoSync', () => {
    it(`debounces bursts to one request after ${SYNC_DEBOUNCE_MS} ms`, async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const storage = migrated();
      mockFetch.mockResolvedValue(okResponse(state()));
      const onApplied = vi.fn();
      autoSync(onApplied);

      storage.setValidation('t1', 'A', 1, true);
      storage.setValidation('t1', 'B', 1, true);
      await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS - 1);
      await until(() => mockFetch.mock.calls.length > 0);
      expect(mockFetch).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await until(() => onApplied.mock.calls.length > 0);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(lastBody().cells).toHaveLength(2);
      expect(onApplied).toHaveBeenCalledTimes(1);
    });

    it('ignores changes of another club', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      migrated();
      autoSync(vi.fn());
      createClubStorage('other-club').setValidation('t1', 'A', 1, true);
      await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS);
      await until(() => mockFetch.mock.calls.length > 0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('syncs on online event', async () => {
      migrated();
      mockFetch.mockResolvedValue(okResponse(state()));
      autoSync(vi.fn());
      window.dispatchEvent(new Event('online'));
      await until(() => mockFetch.mock.calls.length > 0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('cleanup unsubscribes', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const storage = migrated();
      const stop = autoSync(vi.fn());
      stop();
      storage.setValidation('t1', 'A', 1, true);
      window.dispatchEvent(new Event('online'));
      await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS);
      await until(() => mockFetch.mock.calls.length > 0);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
