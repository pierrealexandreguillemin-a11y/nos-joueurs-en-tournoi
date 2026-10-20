'use client';

import type { Event, StorageData } from '@/types';
import { getLocalStorage } from './storage-core';
import { importEventInto, reidentifyExport, type ExportedEvent } from './storage-share';
import { cellKey, emptySyncMeta, markCell, markDeleted, markEvent, type SyncMeta } from './sync-state';

// Writes that other phones must see leave a sync mark (src/lib/sync-state.ts), then notify listeners
// so the sync orchestrator can push. FFE refresh writes go through saveEventLocal: no mark.

type Listener = (slug: string) => void;
const listeners = new Set<Listener>();

export function subscribeLocalChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function readMeta(metaKey: string): SyncMeta {
  try {
    const raw = getLocalStorage()?.getItem(metaKey);
    return raw ? { ...emptySyncMeta(), ...JSON.parse(raw) } : emptySyncMeta();
  } catch {
    return emptySyncMeta();
  }
}

function writeMeta(metaKey: string, meta: SyncMeta): void {
  getLocalStorage()?.setItem(metaKey, JSON.stringify(meta));
}

function putEvent(data: StorageData, event: Event): StorageData {
  const idx = data.events.findIndex(e => e.id === event.id);
  if (idx >= 0) data.events[idx] = event;
  else data.events.push(event);
  data.currentEventId = event.id;
  return data;
}

type ImportOptions = { replaceIfExists: boolean; generateNewId?: boolean };

/** Marked writes of one club's storage; `key` is the club's localStorage key */
export function createSyncedWrites(
  slug: string, key: string, get: () => StorageData, set: (data: StorageData) => void,
) {
  const metaKey = `${key}:sync`;
  const getSyncMeta = (): SyncMeta => readMeta(metaKey);
  const setSyncMeta = (meta: SyncMeta): void => writeMeta(metaKey, meta);
  const mark = (update: (meta: SyncMeta) => SyncMeta): void => {
    setSyncMeta(update(getSyncMeta()));
    listeners.forEach(listener => listener(slug));
  };

  return {
    getSyncMeta,
    setSyncMeta,

    saveEvent: (event: Event) => {
      set(putEvent(get(), event));
      mark(meta => markEvent(meta, event.id));
    },

    saveEventLocal: (event: Event) => set(putEvent(get(), event)),

    deleteEvent: (eventId: string) => {
      const data = get();
      const event = data.events.find(e => e.id === eventId);
      const tournamentIds = event?.tournaments.map(t => t.id) ?? [];
      data.events = data.events.filter(e => e.id !== eventId);
      if (data.currentEventId === eventId) data.currentEventId = data.events[0]?.id || '';
      tournamentIds.forEach(tid => { delete data.validations[tid]; });
      set(data);
      mark(meta => markDeleted(meta, eventId, tournamentIds));
    },

    setValidation: (tournamentId: string, playerName: string, round: number, isValid: boolean) => {
      const data = get();
      const players = data.validations[tournamentId] ?? {};
      players[playerName] = { ...players[playerName], [`round_${round}`]: isValid };
      data.validations[tournamentId] = players;
      set(data);
      mark(meta => markCell(meta, cellKey(tournamentId, playerName, round)));
    },

    /** Cleared ticks are pushed as unticked, so other phones lose them too */
    clearTournamentValidations: (tournamentId: string) => {
      const data = get();
      const keys = Object.entries(data.validations[tournamentId] ?? {}).flatMap(([player, rounds]) =>
        Object.keys(rounds).map(roundKey => cellKey(tournamentId, player, Number(roundKey.replace('round_', '')))));
      delete data.validations[tournamentId];
      set(data);
      mark(meta => keys.reduce(markCell, meta));
    },

    importData: (jsonString: string): boolean => {
      try {
        set(JSON.parse(jsonString) as StorageData);
        mark(meta => ({ ...meta, migrated: false })); // next sync pushes everything
        return true;
      } catch (error) {
        console.error('Error importing data:', error);
        return false;
      }
    },

    /** A tombstoned event comes back under fresh ids; the imported event and its ticks are pushed */
    importEvent: (exported: ExportedEvent, options?: ImportOptions) => {
      const revived = getSyncMeta().knownTombstones.includes(exported.event.id) ? reidentifyExport(exported) : exported;
      const result = importEventInto(get, set, revived, options);
      if (result.success) {
        const data = get();
        const event = data.events.find(e => e.id === result.eventId);
        const keys = (event?.tournaments ?? []).flatMap(t => Object.entries(data.validations[t.id] ?? {})
          .flatMap(([player, rounds]) => Object.keys(rounds).map(r => cellKey(t.id, player, Number(r.replace('round_', ''))))));
        mark(meta => keys.reduce(markCell, markEvent(meta, result.eventId)));
      }
      return result;
    },
  };
}
