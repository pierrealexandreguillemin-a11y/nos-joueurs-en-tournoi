import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClubStorage, subscribeLocalChanges } from './storage';
import { cellKey } from './sync-state';
import { makeEvent, makeTournament } from '@/test/fixtures';

// Every write that must reach the other phones leaves a mark; FFE refresh writes do not.
describe('club storage — sync marks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saveEvent marks the event dirty', () => {
    const storage = createClubStorage('club-a');
    storage.saveEvent(makeEvent('e1', 'Open A'));
    expect(Object.keys(storage.getSyncMeta().dirtyEvents)).toEqual(['e1']);
  });

  it('saveEventLocal does not mark the event', () => {
    const storage = createClubStorage('club-a');
    storage.saveEventLocal(makeEvent('e1', 'Open A'));
    expect(storage.getAllEvents().map(e => e.id)).toEqual(['e1']);
    expect(storage.getSyncMeta().dirtyEvents).toEqual({});
  });

  it('deleteEvent records a pending tombstone and unmarks the event', () => {
    const storage = createClubStorage('club-a');
    storage.saveEvent(makeEvent('e1', 'Open A', { tournaments: [makeTournament({ id: 't1' })] }));
    storage.setValidation('t1', 'A', 1, true);
    storage.deleteEvent('e1');
    const meta = storage.getSyncMeta();
    expect(meta.deletedEventIds).toEqual(['e1']);
    expect(meta.dirtyEvents).toEqual({});
    expect(meta.dirtyCells).toEqual({});
  });

  it('setValidation marks the cell', () => {
    const storage = createClubStorage('club-a');
    storage.setValidation('t1', 'DUPONT JEAN', 2, true);
    expect(Object.keys(storage.getSyncMeta().dirtyCells)).toEqual([cellKey('t1', 'DUPONT JEAN', 2)]);
  });

  it('clearTournamentValidations marks existing cells false', () => {
    const storage = createClubStorage('club-a');
    storage.setValidation('t1', 'A', 1, true);
    storage.setValidation('t1', 'B', 3, true);
    storage.setSyncMeta({ ...storage.getSyncMeta(), dirtyCells: {} }); // as if already pushed
    storage.clearTournamentValidations('t1');
    expect(Object.keys(storage.getSyncMeta().dirtyCells).sort()).toEqual([cellKey('t1', 'A', 1), cellKey('t1', 'B', 3)]);
    expect(storage.getValidation('t1', 'A', 1)).toBe(false);
  });

  it('importing a known tombstoned id assigns a new id', () => {
    const storage = createClubStorage('club-a');
    storage.setSyncMeta({ ...storage.getSyncMeta(), knownTombstones: ['e1'] });
    const exported = {
      version: '1.0' as const, exportDate: '2026-10-20',
      event: makeEvent('e1', 'Open A', { tournaments: [makeTournament({ id: 't1' })] }),
      validations: { t1: { A: { round_1: true } } },
    };
    const result = storage.importEvent(exported);
    expect(result.success).toBe(true);
    expect(result.eventId).not.toBe('e1');
    const imported = storage.getAllEvents()[0];
    expect(imported.name).toBe('Open A');
    expect(storage.getValidation(imported.tournaments[0].id, 'A', 1)).toBe(true);
    expect(Object.keys(storage.getSyncMeta().dirtyEvents)).toEqual([result.eventId]);
  });

  it('marks survive a new storage instance', () => {
    createClubStorage('club-a').setValidation('t1', 'A', 1, true);
    expect(Object.keys(createClubStorage('club-a').getSyncMeta().dirtyCells)).toEqual([cellKey('t1', 'A', 1)]);
  });

  it('importData resets the migration flag so everything is pushed again', () => {
    const storage = createClubStorage('club-a');
    storage.setSyncMeta({ ...storage.getSyncMeta(), migrated: true });
    storage.importData(JSON.stringify({ currentEventId: '', events: [], validations: {} }));
    expect(storage.getSyncMeta().migrated).toBe(false);
  });

  it('subscribeLocalChanges is notified with the slug', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLocalChanges(listener);
    createClubStorage('club-a').setValidation('t1', 'A', 1, true);
    createClubStorage('club-a').saveEventLocal(makeEvent('e1', 'Open'));
    unsubscribe();
    createClubStorage('club-a').setValidation('t1', 'B', 1, true);
    expect(listener.mock.calls).toEqual([['club-a']]);
  });
});
