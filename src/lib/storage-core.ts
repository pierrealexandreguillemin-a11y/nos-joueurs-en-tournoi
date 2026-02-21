'use client';

import type { Event, StorageData } from '@/types';

export const STORAGE_KEY = 'nos-joueurs-en-tournoi';

export function getLocalStorage(): Storage | null {
  if (typeof window !== 'undefined') return window.localStorage;
  if (typeof globalThis.localStorage !== 'undefined') return globalThis.localStorage;
  return null;
}

function emptyData(): StorageData {
  return { currentEventId: '', events: [], validations: {} };
}

// Namespaced read (used by createClubStorage)
export function readStorage(key: string): StorageData {
  try {
    const storage = getLocalStorage();
    if (!storage) return emptyData();
    const data = storage.getItem(key);
    if (!data) return emptyData();
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return emptyData();
  }
}

// Namespaced write (used by createClubStorage)
export function writeStorage(data: StorageData, key: string): void {
  try {
    getLocalStorage()?.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
    throw new Error('Failed to save data. Storage might be full.');
  }
}

// ========================================
// PUBLIC API (default key)
// ========================================

export function getStorageData(): StorageData {
  return readStorage(STORAGE_KEY);
}

export function setStorageData(data: StorageData): void {
  writeStorage(data, STORAGE_KEY);
}

export function getAllEvents(): Event[] {
  return getStorageData().events;
}

export function getCurrentEvent(): Event | null {
  const data = getStorageData();
  if (!data.currentEventId) return null;
  return data.events.find(e => e.id === data.currentEventId) || null;
}

export function setCurrentEvent(eventId: string): void {
  const data = getStorageData();
  if (!data.events.find(e => e.id === eventId)) {
    throw new Error(`Event with id ${eventId} not found`);
  }
  data.currentEventId = eventId;
  setStorageData(data);
}

export function saveEvent(event: Event): void {
  const data = getStorageData();
  const idx = data.events.findIndex(e => e.id === event.id);
  if (idx >= 0) data.events[idx] = event;
  else data.events.push(event);
  data.currentEventId = event.id;
  setStorageData(data);
}

export function deleteEvent(eventId: string): void {
  const data = getStorageData();
  const event = data.events.find(e => e.id === eventId);
  data.events = data.events.filter(e => e.id !== eventId);
  if (data.currentEventId === eventId) {
    data.currentEventId = data.events[0]?.id || '';
  }
  if (event) {
    event.tournaments.forEach(t => { delete data.validations[t.id]; });
  }
  setStorageData(data);
}
