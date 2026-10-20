import type { Event, ServerState, StorageData, SyncPush, Tournament, ValidationCell, ValidationState } from '@/types';

// Pure sync bookkeeping (docs/superpowers/specs/2026-10-20-auto-sync-light-design.md).
// Marks carry a revision so that acknowledging a push never drops a change made while it was in flight.

export interface SyncMeta {
  dirtyEvents: Record<string, number>;
  dirtyCells: Record<string, number>;
  deletedEventIds: string[];
  knownTombstones: string[];
  migrated: boolean;
}

/** Revisions of what a push carried */
export interface SyncRevs {
  events: Record<string, number>;
  cells: Record<string, number>;
  deletedEventIds: string[];
}

export function emptySyncMeta(): SyncMeta {
  return { dirtyEvents: {}, dirtyCells: {}, deletedEventIds: [], knownTombstones: [], migrated: false };
}

const SEP = '|';

export function cellKey(tournamentId: string, playerName: string, round: number): string {
  return `${tournamentId}${SEP}${playerName}${SEP}${round}`;
}

function parseCellKey(key: string): { tournamentId: string; playerName: string; round: number } {
  const first = key.indexOf(SEP);
  const last = key.lastIndexOf(SEP);
  return { tournamentId: key.slice(0, first), playerName: key.slice(first + 1, last), round: Number(key.slice(last + 1)) };
}

const bump = (marks: Record<string, number>, key: string) => ({ ...marks, [key]: (marks[key] ?? 0) + 1 });

export function markEvent(meta: SyncMeta, eventId: string): SyncMeta {
  return { ...meta, dirtyEvents: bump(meta.dirtyEvents, eventId) };
}

export function markCell(meta: SyncMeta, key: string): SyncMeta {
  return { ...meta, dirtyCells: bump(meta.dirtyCells, key) };
}

/** Pending tombstone; the event and its tournaments' ticks no longer need a push */
export function markDeleted(meta: SyncMeta, eventId: string, tournamentIds: string[]): SyncMeta {
  const dirtyEvents = { ...meta.dirtyEvents };
  delete dirtyEvents[eventId];
  const dirtyCells = Object.fromEntries(Object.entries(meta.dirtyCells)
    .filter(([key]) => !tournamentIds.includes(parseCellKey(key).tournamentId)));
  const deletedEventIds = meta.deletedEventIds.includes(eventId) ? meta.deletedEventIds : [...meta.deletedEventIds, eventId];
  return { ...meta, dirtyEvents, dirtyCells, deletedEventIds };
}

function cellValue(validations: ValidationState, cell: { tournamentId: string; playerName: string; round: number }): boolean {
  return validations[cell.tournamentId]?.[cell.playerName]?.[`round_${cell.round}`] ?? false;
}

export function buildPush(data: StorageData, meta: SyncMeta): { push: SyncPush; revs: SyncRevs } {
  const cells: ValidationCell[] = Object.keys(meta.dirtyCells).map(key => {
    const cell = parseCellKey(key);
    return { ...cell, value: cellValue(data.validations, cell) };
  });
  return {
    push: { events: data.events.filter(e => e.id in meta.dirtyEvents), deletedEventIds: [...meta.deletedEventIds], cells },
    revs: { events: { ...meta.dirtyEvents }, cells: { ...meta.dirtyCells }, deletedEventIds: [...meta.deletedEventIds] },
  };
}

const unlessRevised = (marks: Record<string, number>, sent: Record<string, number>) =>
  Object.fromEntries(Object.entries(marks).filter(([key, rev]) => sent[key] !== rev));

export function ackPush(meta: SyncMeta, revs: SyncRevs): SyncMeta {
  return {
    ...meta,
    dirtyEvents: unlessRevised(meta.dirtyEvents, revs.events),
    dirtyCells: unlessRevised(meta.dirtyCells, revs.cells),
    deletedEventIds: meta.deletedEventIds.filter(id => !revs.deletedEventIds.includes(id)),
  };
}

/** Every local event and tick, once — first launch of the auto-sync version */
export function markAllDirty(data: StorageData, meta: SyncMeta): SyncMeta {
  let next = meta;
  for (const event of data.events) next = markEvent(next, event.id);
  for (const [tid, players] of Object.entries(data.validations)) {
    for (const [player, rounds] of Object.entries(players)) {
      for (const roundKey of Object.keys(rounds)) next = markCell(next, cellKey(tid, player, Number(roundKey.replace('round_', ''))));
    }
  }
  return { ...next, migrated: true };
}

/** Server structure, local FFE data (results are refreshed by each phone, never shared) */
function withLocalFfeData(remote: Event, local: Event): Event {
  const localById = new Map(local.tournaments.map(t => [t.id, t]));
  const tournaments = remote.tournaments.map((t): Tournament => {
    const mine = localById.get(t.id);
    if (!mine) return t;
    return { ...t, players: mine.players, pairings: mine.pairings, pairingsRound: mine.pairingsRound, lastUpdate: mine.lastUpdate };
  });
  return { ...remote, availableClubs: local.availableClubs ?? remote.availableClubs, tournaments };
}

function mergeEvents(local: Event[], meta: SyncMeta, state: ServerState): { events: Event[]; meta: SyncMeta } {
  const tombstones = new Set(state.deletedEventIds);
  const remoteById = new Map(state.events.map(e => [e.id, e]));
  let next = meta;
  const kept = local.filter(e => !tombstones.has(e.id)).map(e => {
    const remote = remoteById.get(e.id);
    if (!remote && !(e.id in next.dirtyEvents)) next = markEvent(next, e.id); // never reached the server
    if (!remote || e.id in next.dirtyEvents) return e;
    return withLocalFfeData(remote, e);
  });
  const localIds = new Set(local.map(e => e.id));
  const added = state.events.filter(e => !localIds.has(e.id));
  for (const id of tombstones) {
    const dirtyEvents = { ...next.dirtyEvents };
    delete dirtyEvents[id];
    next = { ...next, dirtyEvents };
  }
  return { events: [...kept, ...added], meta: next };
}

function setCell(validations: ValidationState, cell: ValidationCell): void {
  const roundKey = `round_${cell.round}`;
  if (!cell.value) {
    delete validations[cell.tournamentId]?.[cell.playerName]?.[roundKey];
    return;
  }
  const players = validations[cell.tournamentId] ?? {};
  players[cell.playerName] = { ...players[cell.playerName], [roundKey]: true };
  validations[cell.tournamentId] = players;
}

function mergeCells(local: ValidationState, meta: SyncMeta, state: ServerState, droppedTournaments: Set<string>): ValidationState {
  const validations: ValidationState = structuredClone(local);
  for (const tid of droppedTournaments) delete validations[tid];
  for (const cell of state.cells) {
    if (!(cellKey(cell.tournamentId, cell.playerName, cell.round) in meta.dirtyCells)) setCell(validations, cell);
  }
  return validations;
}

export function mergeServerState(data: StorageData, meta: SyncMeta, state: ServerState): { data: StorageData; meta: SyncMeta } {
  const tombstones = new Set(state.deletedEventIds);
  const droppedTournaments = new Set(data.events.filter(e => tombstones.has(e.id)).flatMap(e => e.tournaments.map(t => t.id)));
  const merged = mergeEvents(data.events, meta, state);
  const currentEventId = merged.events.some(e => e.id === data.currentEventId) ? data.currentEventId : merged.events[0]?.id ?? '';
  return {
    data: { events: merged.events, validations: mergeCells(data.validations, meta, state, droppedTournaments), currentEventId },
    meta: { ...merged.meta, knownTombstones: [...state.deletedEventIds] },
  };
}
