import { describe, it, expect } from 'vitest';
import { makeEvent, makePlayer, makeStorageData, makeTournament } from '@/test/fixtures';
import type { ServerState } from '@/types';
import {
  ackPush, buildPush, cellKey, emptySyncMeta, markAllDirty, markCell, markDeleted, markEvent, mergeServerState,
} from './sync-state';

const server = (s: Partial<ServerState>): ServerState => ({ events: [], deletedEventIds: [], cells: [], ...s });

describe('sync-state', () => {
  describe('buildPush', () => {
    it('sends dirty events, pending tombstones and dirty cells (absent cell = false)', () => {
      const data = makeStorageData({
        events: [makeEvent('e1', 'Open A'), makeEvent('e2', 'Open B')],
        validations: { t1: { 'DUPONT JEAN': { round_1: true } } },
      });
      let meta = markEvent(emptySyncMeta(), 'e1');
      meta = markDeleted(meta, 'e9', []);
      meta = markCell(meta, cellKey('t1', 'DUPONT JEAN', 1));
      meta = markCell(meta, cellKey('t1', 'MARTIN PAUL', 2));

      const { push } = buildPush(data, meta);

      expect(push.events.map(e => e.id)).toEqual(['e1']);
      expect(push.deletedEventIds).toEqual(['e9']);
      expect(push.cells).toEqual([
        { tournamentId: 't1', playerName: 'DUPONT JEAN', round: 1, value: true },
        { tournamentId: 't1', playerName: 'MARTIN PAUL', round: 2, value: false },
      ]);
    });

    it('keeps a player name containing the separator', () => {
      const meta = markCell(emptySyncMeta(), cellKey('t1', 'A|B', 3));
      expect(buildPush(makeStorageData(), meta).push.cells[0]).toMatchObject({ tournamentId: 't1', playerName: 'A|B', round: 3 });
    });
  });

  describe('ackPush', () => {
    it('ack keeps marks added after the payload was built', () => {
      const data = makeStorageData({ events: [makeEvent('e1', 'Open A')] });
      let meta = markCell(markEvent(emptySyncMeta(), 'e1'), cellKey('t1', 'A', 1));
      const { revs } = buildPush(data, meta);
      meta = markEvent(meta, 'e1'); // edited again while the push was in flight
      meta = markCell(meta, cellKey('t1', 'B', 1));

      const acked = ackPush(meta, revs);

      expect(Object.keys(acked.dirtyEvents)).toEqual(['e1']);
      expect(Object.keys(acked.dirtyCells)).toEqual([cellKey('t1', 'B', 1)]);
    });

    it('removes acknowledged tombstones', () => {
      const meta = markDeleted(emptySyncMeta(), 'e9', []);
      const { revs } = buildPush(makeStorageData(), meta);
      expect(ackPush(meta, revs).deletedEventIds).toEqual([]);
    });
  });

  describe('markDeleted', () => {
    it("unmarks the event and the cells of its tournaments", () => {
      let meta = markEvent(emptySyncMeta(), 'e1');
      meta = markCell(meta, cellKey('t1', 'A', 1));
      meta = markCell(meta, cellKey('t2', 'A', 1));
      meta = markDeleted(meta, 'e1', ['t1']);
      expect(meta.dirtyEvents).toEqual({});
      expect(Object.keys(meta.dirtyCells)).toEqual([cellKey('t2', 'A', 1)]);
      expect(meta.deletedEventIds).toEqual(['e1']);
    });
  });

  describe('mergeServerState', () => {
    it('drops tombstoned events, their ticks, and records knownTombstones', () => {
      const data = makeStorageData({
        events: [makeEvent('e1', 'A', { tournaments: [makeTournament({ id: 't1' })] }), makeEvent('e2', 'B')],
        validations: { t1: { X: { round_1: true } } },
        currentEventId: 'e1',
      });
      const { data: merged, meta } = mergeServerState(data, emptySyncMeta(), server({ deletedEventIds: ['e1'] }));
      expect(merged.events.map(e => e.id)).toEqual(['e2']);
      expect(merged.validations).toEqual({});
      expect(merged.currentEventId).toBe('e2');
      expect(meta.knownTombstones).toEqual(['e1']);
    });

    it('server event keeps local FFE data of matching tournaments', () => {
      const local = makeEvent('e1', 'Old name', {
        availableClubs: [{ name: 'Hay Chess', playerCount: 5 }],
        tournaments: [makeTournament({ id: 't1', name: 'U12', players: [makePlayer()], pairingsRound: 3, lastUpdate: 'x' })],
      });
      const remote = makeEvent('e1', 'New name', { tournaments: [makeTournament({ id: 't1', name: 'U12 bis' })] });
      const { data } = mergeServerState(makeStorageData({ events: [local] }), emptySyncMeta(), server({ events: [remote] }));
      const event = data.events[0];
      expect(event.name).toBe('New name');
      expect(event.availableClubs).toEqual([{ name: 'Hay Chess', playerCount: 5 }]);
      expect(event.tournaments[0]).toMatchObject({ name: 'U12 bis', players: [makePlayer()], pairingsRound: 3, lastUpdate: 'x' });
    });

    it('local dirty event is kept over the server version', () => {
      const data = makeStorageData({ events: [makeEvent('e1', 'Mine')] });
      const { data: merged } = mergeServerState(data, markEvent(emptySyncMeta(), 'e1'), server({ events: [makeEvent('e1', 'Theirs')] }));
      expect(merged.events[0].name).toBe('Mine');
    });

    it('local-only event that is not dirty is kept and marked for push', () => {
      const data = makeStorageData({ events: [makeEvent('e1', 'Local')] });
      const { data: merged, meta } = mergeServerState(data, emptySyncMeta(), server({}));
      expect(merged.events.map(e => e.id)).toEqual(['e1']);
      expect(Object.keys(meta.dirtyEvents)).toEqual(['e1']);
    });

    it('server cells applied except dirty local cells', () => {
      const data = makeStorageData({ validations: { t1: { A: { round_1: true }, B: { round_1: false } } } });
      const meta = markCell(emptySyncMeta(), cellKey('t1', 'A', 1));
      const { data: merged } = mergeServerState(data, meta, server({ cells: [
        { tournamentId: 't1', playerName: 'A', round: 1, value: false },
        { tournamentId: 't1', playerName: 'B', round: 1, value: true },
        { tournamentId: 't2', playerName: 'C', round: 4, value: true },
      ] }));
      expect(merged.validations).toEqual({ t1: { A: { round_1: true }, B: { round_1: true } }, t2: { C: { round_4: true } } });
    });

    it('currentEventId untouched when its event survives', () => {
      const data = makeStorageData({ events: [makeEvent('e1', 'A'), makeEvent('e2', 'B')], currentEventId: 'e2' });
      expect(mergeServerState(data, emptySyncMeta(), server({ events: [makeEvent('e1', 'A')] })).data.currentEventId).toBe('e2');
    });
  });

  describe('markAllDirty', () => {
    it('marks every event and every existing cell once', () => {
      const data = makeStorageData({
        events: [makeEvent('e1', 'A'), makeEvent('e2', 'B')],
        validations: { t1: { A: { round_1: true, round_2: false } } },
      });
      const meta = markAllDirty(data, emptySyncMeta());
      expect(Object.keys(meta.dirtyEvents).sort()).toEqual(['e1', 'e2']);
      expect(Object.keys(meta.dirtyCells).sort()).toEqual([cellKey('t1', 'A', 1), cellKey('t1', 'A', 2)]);
      expect(meta.migrated).toBe(true);
    });
  });
});
