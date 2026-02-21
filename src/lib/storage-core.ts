'use client';

import type { Event, StorageData } from '@/types';

const STORAGE_KEY = 'nos-joueurs-en-tournoi';

// Safe localStorage access that works in client, server, and test contexts
export function getLocalStorage(): Storage | null {
  if (typeof window !== 'undefined') return window.localStorage;
  if (typeof globalThis.localStorage !== 'undefined') return globalThis.localStorage;
  return null;
}

export function emptyData(): StorageData {
  return { currentEventId: '', events: [], validations: {} };
}

export { STORAGE_KEY };

// Internal: get storage data for a given key
export function _getStorageData(key: string): StorageData {
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

// Internal: save storage data for a given key
export function _setStorageData(data: StorageData, key: string): void {
  try {
    getLocalStorage()?.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
    throw new Error('Failed to save data. Storage might be full.');
  }
}

// ========================================
// PUBLIC API (backward compat, default key)
// ========================================

export function getStorageData(): StorageData {
  return _getStorageData(STORAGE_KEY);
}

export function setStorageData(data: StorageData): void {
  _setStorageData(data, STORAGE_KEY);
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
  const event = data.events.find(e => e.id === eventId);
  if (!event) throw new Error(`Event with id ${eventId} not found`);
  data.currentEventId = eventId;
  setStorageData(data);
}

export function saveEvent(event: Event): void {
  _saveEvent(getStorageData, setStorageData, event);
}

export function deleteEvent(eventId: string): void {
  _deleteEvent(getStorageData, setStorageData, eventId);
}

export function clearAllData(): void {
  try {
    getLocalStorage()?.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}

export function exportData(): string {
  return JSON.stringify(getStorageData(), null, 2);
}

export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString) as StorageData;
    setStorageData(data);
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}

// ========================================
// HELPERS (used by core + clubStorage)
// ========================================

export type StorageGetter = () => StorageData;
export type StorageSetter = (data: StorageData) => void;

/** Helper: save (upsert) an event and set it as current */
export function _saveEvent(get: StorageGetter, set: StorageSetter, event: Event): void {
  const data = get();
  const existingIndex = data.events.findIndex(e => e.id === event.id);
  if (existingIndex >= 0) {
    data.events[existingIndex] = event;
  } else {
    data.events.push(event);
  }
  data.currentEventId = event.id;
  set(data);
}

/** Helper: delete an event and clean up its validations */
export function _deleteEvent(get: StorageGetter, set: StorageSetter, eventId: string): void {
  const data = get();
  const event = data.events.find(e => e.id === eventId);
  data.events = data.events.filter(e => e.id !== eventId);
  if (data.currentEventId === eventId) {
    data.currentEventId = data.events[0]?.id || '';
  }
  if (event) {
    event.tournaments.forEach(t => { delete data.validations[t.id]; });
  }
  set(data);
}

/** Helper: set a validation flag for a player/round */
export function _setValidation(
  get: StorageGetter,
  set: StorageSetter,
  tournamentId: string,
  playerName: string,
  round: number,
  isValid: boolean,
): void {
  const data = get();
  if (!data.validations[tournamentId]) data.validations[tournamentId] = {};
  if (!data.validations[tournamentId][playerName]) data.validations[tournamentId][playerName] = {};
  data.validations[tournamentId][playerName][`round_${round}`] = isValid;
  set(data);
}
