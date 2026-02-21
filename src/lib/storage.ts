'use client';

import type { Event, StorageData, ValidationState } from '@/types';

// Re-export from storage-core (barrel)
export {
  getStorageData,
  setStorageData,
  getAllEvents,
  getCurrentEvent,
  setCurrentEvent,
  saveEvent,
  deleteEvent,
} from './storage-core';

// Re-export from storage-share (barrel)
export {
  exportEvent,
  checkEventExists,
  importEvent,
  encodeEventToURL,
  decodeEventFromURL,
  generateShareURL,
} from './storage-share';
export type { ExportedEvent } from './storage-share';

// Internal imports for this module only
import { getStorageData, setStorageData, readStorage, writeStorage, getLocalStorage, STORAGE_KEY } from './storage-core';
import { exportEventFrom, importEventInto, encodeEventFrom, generateShareURLFrom } from './storage-share';

// ========================================
// CLEAR / EXPORT-DATA / IMPORT-DATA
// ========================================

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
// VALIDATIONS
// ========================================

export function getValidationState(): ValidationState {
  return getStorageData().validations;
}

export function setValidation(
  tournamentId: string, playerName: string, round: number, isValid: boolean,
): void {
  const data = getStorageData();
  if (!data.validations[tournamentId]) data.validations[tournamentId] = {};
  if (!data.validations[tournamentId][playerName]) data.validations[tournamentId][playerName] = {};
  data.validations[tournamentId][playerName][`round_${round}`] = isValid;
  setStorageData(data);
}

export function getValidation(
  tournamentId: string, playerName: string, round: number,
): boolean {
  return getStorageData().validations[tournamentId]?.[playerName]?.[`round_${round}`] || false;
}

// ========================================
// NAMESPACED CLUB STORAGE
// ========================================

export interface ClubStorage {
  getStorageData: () => StorageData;
  setStorageData: (data: StorageData) => void;
  getAllEvents: () => Event[];
  getCurrentEvent: () => Event | null;
  setCurrentEvent: (eventId: string) => void;
  saveEvent: (event: Event) => void;
  deleteEvent: (eventId: string) => void;
  getValidationState: () => ValidationState;
  setValidation: (tournamentId: string, playerName: string, round: number, isValid: boolean) => void;
  getValidation: (tournamentId: string, playerName: string, round: number) => boolean;
  clearTournamentValidations: (tournamentId: string) => void;
  clearAllData: () => void;
  exportData: () => string;
  importData: (jsonString: string) => boolean;
  exportEvent: (eventId: string, includeValidations?: boolean) => import('./storage-share').ExportedEvent | null;
  checkEventExists: (eventId: string) => boolean;
  importEvent: (exportedData: import('./storage-share').ExportedEvent, options?: { replaceIfExists: boolean; generateNewId?: boolean }) => { success: boolean; eventId: string; isDuplicate: boolean };
  encodeEventToURL: (eventId: string) => string | null;
  generateShareURL: (eventId: string) => { url: string; size: number } | null;
}

export function createClubStorage(slug: string): ClubStorage {
  const key = `${STORAGE_KEY}:${slug}`;
  const get = (): StorageData => readStorage(key);
  const set = (data: StorageData): void => writeStorage(data, key);

  return {
    getStorageData: get,
    setStorageData: set,
    getAllEvents: () => get().events,

    getCurrentEvent: () => {
      const data = get();
      if (!data.currentEventId) return null;
      return data.events.find(e => e.id === data.currentEventId) || null;
    },

    setCurrentEvent: (eventId: string) => {
      const data = get();
      if (!data.events.find(e => e.id === eventId)) throw new Error(`Event with id ${eventId} not found`);
      data.currentEventId = eventId;
      set(data);
    },

    saveEvent: (event: Event) => {
      const data = get();
      const idx = data.events.findIndex(e => e.id === event.id);
      if (idx >= 0) data.events[idx] = event;
      else data.events.push(event);
      data.currentEventId = event.id;
      set(data);
    },

    deleteEvent: (eventId: string) => {
      const data = get();
      const event = data.events.find(e => e.id === eventId);
      data.events = data.events.filter(e => e.id !== eventId);
      if (data.currentEventId === eventId) data.currentEventId = data.events[0]?.id || '';
      if (event) event.tournaments.forEach(t => { delete data.validations[t.id]; });
      set(data);
    },

    getValidationState: () => get().validations,

    setValidation: (tournamentId, playerName, round, isValid) => {
      const data = get();
      if (!data.validations[tournamentId]) data.validations[tournamentId] = {};
      if (!data.validations[tournamentId][playerName]) data.validations[tournamentId][playerName] = {};
      data.validations[tournamentId][playerName][`round_${round}`] = isValid;
      set(data);
    },

    getValidation: (tournamentId, playerName, round) =>
      get().validations[tournamentId]?.[playerName]?.[`round_${round}`] || false,

    clearTournamentValidations: (tournamentId: string) => {
      const data = get();
      delete data.validations[tournamentId];
      set(data);
    },

    clearAllData: () => {
      try { getLocalStorage()?.removeItem(key); }
      catch (error) { console.error('Error clearing localStorage:', error); }
    },

    exportData: () => JSON.stringify(get(), null, 2),

    importData: (jsonString: string) => {
      try { set(JSON.parse(jsonString) as StorageData); return true; }
      catch (error) { console.error('Error importing data:', error); return false; }
    },

    exportEvent: (eventId, includeValidations) => exportEventFrom(get, eventId, includeValidations),
    checkEventExists: (eventId) => get().events.some(e => e.id === eventId),
    importEvent: (exportedData, options) => importEventInto(get, set, exportedData, options),
    encodeEventToURL: (eventId) => encodeEventFrom(get, eventId),
    generateShareURL: (eventId) => generateShareURLFrom(get, eventId),
  };
}
