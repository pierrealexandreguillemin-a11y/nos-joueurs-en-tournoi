'use client';

import { createClubStorage } from './storage';
import type { StorageData } from '@/types';

const SYNC_INTERVAL = 5000; // 5 seconds (kept for backward compatibility, not used in manual sync)
const API_BASE = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

/**
 * Sync local storage to Vercel KV (Upstash Redis)
 */
export async function syncToMongoDB(clubSlug: string): Promise<boolean> {
  try {
    const storage = createClubStorage(clubSlug);
    const data = storage.getStorageData();
    console.log('[Upstash Sync] Starting upload for club:', clubSlug, {
      eventsCount: data.events.length,
      validationsCount: Object.keys(data.validations).length,
      currentEventId: data.currentEventId || 'none',
    });

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

    const result = await response.json();
    console.log('[Upstash Sync] Upload successful:', result.synced, 'events synced');
    return true;
  } catch (error) {
    console.error('[Upstash Sync] Upload error:', error);
    return false;
  }
}

/**
 * Fetch data from Upstash KV and merge with local storage
 */
export async function fetchFromMongoDB(clubSlug: string): Promise<boolean> {
  try {
    console.log('[Upstash Sync] Starting download for club:', clubSlug);
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

    console.log('[Upstash Sync] Merging data...', {
      remoteEvents: remoteData.events.length,
      localEvents: localData.events.length,
    });

    // Merge logic: Remote is source of truth
    // But keep local changes if newer
    const mergedEvents = [...remoteData.events];

    // Add local events that don't exist remotely (new creations not yet synced)
    localData.events.forEach(localEvent => {
      const existsRemotely = mergedEvents.some(e => e.id === localEvent.id);
      if (!existsRemotely) {
        mergedEvents.push(localEvent);
        console.log('[Upstash Sync] Adding local-only event:', localEvent.name);
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

    console.log('[Upstash Sync] Download successful:', mergedEvents.length, 'total events after merge');
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
  console.log('[Upstash Sync] Auto-sync service started (interval: 5s) for club:', clubSlug);

  // Initial sync (upload then download)
  syncToMongoDB(clubSlug).then(() => fetchFromMongoDB(clubSlug));

  // Sync local changes to Upstash every 5s
  const syncInterval = setInterval(() => {
    syncToMongoDB(clubSlug);
  }, SYNC_INTERVAL);

  // Fetch remote changes from Upstash every 5s
  const fetchInterval = setInterval(() => {
    fetchFromMongoDB(clubSlug);
  }, SYNC_INTERVAL);

  // Return cleanup function
  return () => {
    console.log('[Upstash Sync] Auto-sync service stopped');
    clearInterval(syncInterval);
    clearInterval(fetchInterval);
  };
}
