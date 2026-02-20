'use client';

import { createClubStorage } from './storage';
import type { StorageData } from '@/types';

const SYNC_INTERVAL = 5000; // 5 seconds (kept for backward compatibility, not used in manual sync)
const API_BASE = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

/**
 * Sync local storage to Vercel KV (Upstash Redis)
 */
export async function syncToUpstash(clubSlug: string): Promise<boolean> {
  try {
    const storage = createClubStorage(clubSlug);
    const data = storage.getStorageData();

    const response = await fetch(`${API_BASE}/api/events/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...data, clubSlug }),
    });

    if (!response.ok) {
      console.error('[Upstash Sync] Upload failed:', response.statusText, response.status);
      return false;
    }

    await response.json();
    return true;
  } catch (error) {
    console.error('[Upstash Sync] Upload error:', error);
    return false;
  }
}

/**
 * Fetch data from Upstash KV and merge with local storage
 */
export async function fetchFromUpstash(clubSlug: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/events/fetch?clubSlug=${encodeURIComponent(clubSlug)}`);

    if (!response.ok) {
      console.error('[Upstash Sync] Download failed:', response.statusText, response.status);
      return false;
    }

    const result = await response.json();
    const remoteData: StorageData = result.data;

    // Get local data from namespaced storage
    const storage = createClubStorage(clubSlug);
    const localData = storage.getStorageData();

    // Merge logic: Remote is source of truth
    // But keep local changes if newer
    const mergedEvents = [...remoteData.events];

    // Add local events that don't exist remotely (new creations not yet synced)
    localData.events.forEach(localEvent => {
      const existsRemotely = mergedEvents.some(e => e.id === localEvent.id);
      if (!existsRemotely) {
        mergedEvents.push(localEvent);
      }
    });

    // Merge validations (union of both)
    const mergedValidations = {
      ...remoteData.validations,
      ...localData.validations,
    };

    // Use remote current event ID if set, otherwise keep local
    const mergedCurrentEventId = remoteData.currentEventId || localData.currentEventId;

    const mergedData: StorageData = {
      events: mergedEvents,
      validations: mergedValidations,
      currentEventId: mergedCurrentEventId,
    };

    // Save merged data to namespaced localStorage
    storage.setStorageData(mergedData);

    return true;
  } catch (error) {
    console.error('[Upstash Sync] Download error:', error);
    return false;
  }
}

/**
 * Start auto-sync service (bidirectional sync every 5 seconds)
 */
export function startAutoSync(clubSlug: string): () => void {
  // Initial sync (upload then download)
  syncToUpstash(clubSlug).then(() => fetchFromUpstash(clubSlug));

  // Sync local changes to Upstash every 5s
  const syncInterval = setInterval(() => {
    syncToUpstash(clubSlug);
  }, SYNC_INTERVAL);

  // Fetch remote changes from Upstash every 5s
  const fetchInterval = setInterval(() => {
    fetchFromUpstash(clubSlug);
  }, SYNC_INTERVAL);

  // Return cleanup function
  return () => {
    clearInterval(syncInterval);
    clearInterval(fetchInterval);
  };
}
