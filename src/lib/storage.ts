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
  clearAllData,
  exportData,
  importData,
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

// Internal imports for use in this module
import {
  getStorageData,
  setStorageData,
  getLocalStorage,
  STORAGE_KEY,
  _getStorageData,
  _setStorageData,
  _saveEvent,
  _deleteEvent,
  _setValidation,
} from './storage-core';
import {
  _exportEventFrom,
  _importEventInto,
  _encodeEventToURL,
  _generateShareURL,
} from './storage-share';

// ========================================
// VALIDATIONS (remain in storage.ts)
// ========================================

export function getValidationState(): ValidationState {
  const data = getStorageData();
  return data.validations;
}

export function setValidation(
  tournamentId: string,
  playerName: string,
  round: number,
  isValid: boolean,
): void {
  const data = getStorageData();

  if (!data.validations[tournamentId]) {
    data.validations[tournamentId] = {};
  }

  if (!data.validations[tournamentId][playerName]) {
    data.validations[tournamentId][playerName] = {};
  }

  data.validations[tournamentId][playerName][`round_${round}`] = isValid;
  setStorageData(data);
}

export function getValidation(
  tournamentId: string,
  playerName: string,
  round: number,
): boolean {
  const data = getStorageData();
  return data.validations[tournamentId]?.[playerName]?.[`round_${round}`] || false;
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

/**
 * Create a namespaced storage instance for a club.
 * All operations are isolated to the club's storage key.
 */
export function createClubStorage(slug: string): ClubStorage {
  const key = `${STORAGE_KEY}:${slug}`;

  const get = (): StorageData => _getStorageData(key);
  const set = (data: StorageData): void => _setStorageData(data, key);

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
      const event = data.events.find(e => e.id === eventId);
      if (!event) throw new Error(`Event with id ${eventId} not found`);
      data.currentEventId = eventId;
      set(data);
    },

    saveEvent: (event: Event) => _saveEvent(get, set, event),

    deleteEvent: (eventId: string) => _deleteEvent(get, set, eventId),

    getValidationState: () => get().validations,

    setValidation: (tournamentId, playerName, round, isValid) =>
      _setValidation(get, set, tournamentId, playerName, round, isValid),

    getValidation: (tournamentId: string, playerName: string, round: number) => {
      const data = get();
      return data.validations[tournamentId]?.[playerName]?.[`round_${round}`] || false;
    },

    clearTournamentValidations: (tournamentId: string) => {
      const data = get();
      delete data.validations[tournamentId];
      set(data);
    },

    clearAllData: () => {
      try {
        getLocalStorage()?.removeItem(key);
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    },

    exportData: () => JSON.stringify(get(), null, 2),

    importData: (jsonString: string) => {
      try {
        const data = JSON.parse(jsonString) as StorageData;
        set(data);
        return true;
      } catch (error) {
        console.error('Error importing data:', error);
        return false;
      }
    },

    exportEvent: (eventId, includeValidations) => _exportEventFrom(get, eventId, includeValidations),

    checkEventExists: (eventId: string): boolean => {
      const data = get();
      return data.events.some(e => e.id === eventId);
    },

    importEvent: (exportedData, options) => _importEventInto(get, set, exportedData, options),

    encodeEventToURL: (eventId) => _encodeEventToURL(get, eventId),

    generateShareURL: (eventId) => _generateShareURL(get, eventId),
  };
}
