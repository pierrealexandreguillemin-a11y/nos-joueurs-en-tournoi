'use client';

import { createClubStorage, subscribeLocalChanges } from './storage';
import { generateSyncToken } from './hmac';
import { ackPush, buildPush, markAllDirty, mergeServerState, type SyncRevs } from './sync-state';
import type { ServerState, SyncPush } from '@/types';

// Automatic club sync (docs/superpowers/specs/2026-10-20-auto-sync-light-design.md):
// one request per trigger — POST /api/events/sync pushes what is dirty and answers with the full
// server state; GET /api/events/fetch when nothing is dirty. Failed requests keep the marks.

export const SYNC_DEBOUNCE_MS = 3000;

const API_BASE = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

const queues = new Map<string, Promise<{ ok: boolean }>>();

/** Server limit is 50 events per request (schemas.ts); 20 keeps each body small on venue networks */
export const MAX_EVENTS_PER_PUSH = 20;

const isEmpty = (push: SyncPush) => push.events.length + push.deletedEventIds.length + push.cells.length === 0;

/** First chunk carries tombstones and ticks; then events by slices, each acknowledged on its own */
function chunk(push: SyncPush, revs: SyncRevs): Array<{ push: SyncPush; revs: SyncRevs }> {
  const parts: Array<{ push: SyncPush; revs: SyncRevs }> = [];
  for (let i = 0; i === 0 || i < push.events.length; i += MAX_EVENTS_PER_PUSH) {
    const events = push.events.slice(i, i + MAX_EVENTS_PER_PUSH);
    const first = i === 0;
    parts.push({
      push: { events, deletedEventIds: first ? push.deletedEventIds : [], cells: first ? push.cells : [] },
      revs: {
        events: Object.fromEntries(events.map(e => [e.id, revs.events[e.id]])),
        cells: first ? revs.cells : {},
        deletedEventIds: first ? revs.deletedEventIds : [],
      },
    });
  }
  return parts;
}

async function send(url: string, init: RequestInit): Promise<ServerState | null> {
  const response = await fetch(url, init);
  if (!response.ok) {
    console.error('[Cloud Sync] Request failed:', response.status, response.statusText);
    return null;
  }
  return (await response.json()).data as ServerState;
}

async function pull(clubSlug: string): Promise<ServerState | null> {
  const token = await generateSyncToken(clubSlug);
  return send(`${API_BASE}/api/events/fetch?clubSlug=${encodeURIComponent(clubSlug)}`, { headers: { 'X-Sync-Token': token } });
}

async function pushChunk(clubSlug: string, push: SyncPush): Promise<ServerState | null> {
  const token = await generateSyncToken(clubSlug);
  return send(`${API_BASE}/api/events/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Sync-Token': token },
    body: JSON.stringify({ clubSlug, ...push }),
  });
}

type ClubStorage = ReturnType<typeof createClubStorage>;

/** Push every chunk, acknowledging each one; stops at the first refusal (marks of the rest are kept) */
async function pushAll(clubSlug: string, storage: ClubStorage): Promise<{ state: ServerState | null; refused: boolean }> {
  let meta = storage.getSyncMeta();
  if (!meta.migrated) {
    meta = markAllDirty(storage.getStorageData(), meta);
    storage.setSyncMeta(meta);
  }
  const { push, revs } = buildPush(storage.getStorageData(), meta);
  if (isEmpty(push)) return { state: null, refused: false };
  let state: ServerState | null = null;
  for (const part of chunk(push, revs)) {
    const answer = await pushChunk(clubSlug, part.push);
    if (!answer) return { state, refused: true };
    state = answer;
    storage.setSyncMeta(ackPush(storage.getSyncMeta(), part.revs)); // re-read: ticks made meanwhile stay marked
  }
  return { state, refused: false };
}

async function runSync(clubSlug: string): Promise<{ ok: boolean }> {
  try {
    const storage = createClubStorage(clubSlug);
    const { state: pushed, refused } = await pushAll(clubSlug, storage);
    // Nothing to push, or a push refused: still bring in what the others did
    const state = refused || !pushed ? await pull(clubSlug) : pushed;
    if (!state) return { ok: false };

    const merged = mergeServerState(storage.getStorageData(), storage.getSyncMeta(), state);
    storage.setStorageData(merged.data);
    storage.setSyncMeta(merged.meta);
    return { ok: !refused };
  } catch (error) {
    console.error('[Cloud Sync] Error:', error);
    return { ok: false };
  }
}

/** Push what changed and pull the club's state; at most one request in flight per club */
export function syncClub(clubSlug: string): Promise<{ ok: boolean }> {
  const previous = queues.get(clubSlug) ?? Promise.resolve({ ok: true });
  const next = previous.then(() => runSync(clubSlug));
  queues.set(clubSlug, next);
  return next;
}

/** Sync a few seconds after local changes, and when the network comes back. Returns the cleanup. */
export function startAutoSync(clubSlug: string, onApplied: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = () => {
    void syncClub(clubSlug).then(result => { if (result.ok) onApplied(); });
  };
  const unsubscribe = subscribeLocalChanges(slug => {
    if (slug !== clubSlug) return;
    clearTimeout(timer);
    timer = setTimeout(run, SYNC_DEBOUNCE_MS);
  });
  window.addEventListener('online', run);
  return () => {
    unsubscribe();
    clearTimeout(timer);
    window.removeEventListener('online', run);
  };
}
