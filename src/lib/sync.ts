'use client';

import { createClubStorage, subscribeLocalChanges } from './storage';
import { generateSyncToken } from './hmac';
import { ackPush, buildPush, markAllDirty, mergeServerState } from './sync-state';
import type { ServerState, SyncPush } from '@/types';

// Automatic club sync (docs/superpowers/specs/2026-10-20-auto-sync-light-design.md):
// one request per trigger — POST /api/events/sync pushes what is dirty and answers with the full
// server state; GET /api/events/fetch when nothing is dirty. Failed requests keep the marks.

export const SYNC_DEBOUNCE_MS = 3000;

const API_BASE = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

const queues = new Map<string, Promise<{ ok: boolean }>>();

const isEmpty = (push: SyncPush) => push.events.length + push.deletedEventIds.length + push.cells.length === 0;

async function request(clubSlug: string, push: SyncPush): Promise<ServerState | null> {
  const token = await generateSyncToken(clubSlug);
  const response = isEmpty(push)
    ? await fetch(`${API_BASE}/api/events/fetch?clubSlug=${encodeURIComponent(clubSlug)}`, { headers: { 'X-Sync-Token': token } })
    : await fetch(`${API_BASE}/api/events/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Sync-Token': token },
      body: JSON.stringify({ clubSlug, ...push }),
    });
  if (!response.ok) {
    console.error('[Cloud Sync] Request failed:', response.status, response.statusText);
    return null;
  }
  return (await response.json()).data as ServerState;
}

async function runSync(clubSlug: string): Promise<{ ok: boolean }> {
  try {
    const storage = createClubStorage(clubSlug);
    let meta = storage.getSyncMeta();
    if (!meta.migrated) {
      meta = markAllDirty(storage.getStorageData(), meta);
      storage.setSyncMeta(meta);
    }
    const { push, revs } = buildPush(storage.getStorageData(), meta);
    const state = await request(clubSlug, push);
    if (!state) return { ok: false };

    // Re-read: the parent may have ticked while the request was in flight
    const merged = mergeServerState(storage.getStorageData(), ackPush(storage.getSyncMeta(), revs), state);
    storage.setStorageData(merged.data);
    storage.setSyncMeta(merged.meta);
    return { ok: true };
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
