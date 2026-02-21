'use client';

import type { Event, ValidationState } from '@/types';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import {
  getStorageData,
  setStorageData,
  type StorageGetter,
  type StorageSetter,
} from './storage-core';

// ========================================
// EXPORT/IMPORT SINGLE EVENT
// ========================================

export interface ExportedEvent {
  version: '1.0';
  exportDate: string;
  event: Event;
  validations: ValidationState;
}

export function exportEvent(eventId: string, includeValidations: boolean = true): ExportedEvent | null {
  return _exportEventFrom(getStorageData, eventId, includeValidations);
}

export function checkEventExists(eventId: string): boolean {
  const data = getStorageData();
  return data.events.some(e => e.id === eventId);
}

export function importEvent(
  exportedData: ExportedEvent,
  options: {
    replaceIfExists: boolean;
    generateNewId?: boolean;
  } = { replaceIfExists: false },
): { success: boolean; eventId: string; isDuplicate: boolean } {
  return _importEventInto(getStorageData, setStorageData, exportedData, options);
}

// ========================================
// URL SHARING WITH COMPRESSION
// ========================================

export function encodeEventToURL(eventId: string): string | null {
  return _encodeEventToURL(getStorageData, eventId);
}

export function decodeEventFromURL(compressed: string): ExportedEvent | null {
  try {
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) return null;

    const exportedData = JSON.parse(json) as ExportedEvent;

    if (!exportedData.version || !exportedData.event) {
      return null;
    }

    return exportedData;
  } catch (error) {
    console.error('Error decoding event from URL:', error);
    return null;
  }
}

export function generateShareURL(eventId: string): { url: string; size: number } | null {
  return _generateShareURL(getStorageData, eventId);
}

// ========================================
// INTERNAL HELPERS (also used by clubStorage)
// ========================================

/** Helper: export a single event from storage data */
export function _exportEventFrom(
  get: StorageGetter,
  eventId: string,
  includeValidations: boolean = true,
): ExportedEvent | null {
  const data = get();
  const event = data.events.find(e => e.id === eventId);
  if (!event) return null;

  const eventValidations: ValidationState = {};
  if (includeValidations) {
    event.tournaments.forEach(tournament => {
      if (data.validations[tournament.id]) {
        eventValidations[tournament.id] = data.validations[tournament.id];
      }
    });
  }

  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    event,
    validations: eventValidations,
  };
}

/** Helper: import a single event into storage data */
export function _importEventInto(
  get: StorageGetter,
  set: StorageSetter,
  exportedData: ExportedEvent,
  options: { replaceIfExists: boolean; generateNewId?: boolean } = { replaceIfExists: false },
): { success: boolean; eventId: string; isDuplicate: boolean } {
  try {
    const data = get();
    const { event, validations } = exportedData;

    const existingIndex = data.events.findIndex(e => e.id === event.id);
    const isDuplicate = existingIndex >= 0;

    let finalEvent = { ...event };

    if (isDuplicate) {
      if (options.replaceIfExists) {
        data.events[existingIndex] = finalEvent;
      } else if (options.generateNewId) {
        finalEvent = {
          ...event,
          id: `event_${crypto.randomUUID()}`,
          name: `${event.name} (copie)`,
          tournaments: event.tournaments.map(t => ({
            ...t,
            id: `tournament_${crypto.randomUUID()}`,
          })),
        };
        data.events.push(finalEvent);
      } else {
        return { success: false, eventId: event.id, isDuplicate: true };
      }
    } else {
      data.events.push(finalEvent);
    }

    Object.entries(validations).forEach(([tournamentId, tournamentValidations]) => {
      if (options.generateNewId && isDuplicate) {
        const oldTournamentIndex = event.tournaments.findIndex(t => t.id === tournamentId);
        if (oldTournamentIndex >= 0 && finalEvent.tournaments[oldTournamentIndex]) {
          const newTournamentId = finalEvent.tournaments[oldTournamentIndex].id;
          data.validations[newTournamentId] = tournamentValidations;
        }
      } else {
        data.validations[tournamentId] = tournamentValidations;
      }
    });

    data.currentEventId = finalEvent.id;
    set(data);

    return { success: true, eventId: finalEvent.id, isDuplicate };
  } catch (error) {
    console.error('Error importing event:', error);
    return { success: false, eventId: '', isDuplicate: false };
  }
}

/** Helper: encode event to compressed URL parameter */
export function _encodeEventToURL(get: StorageGetter, eventId: string): string | null {
  const exportedData = _exportEventFrom(get, eventId, false);
  if (!exportedData) return null;

  try {
    const json = JSON.stringify(exportedData);
    return compressToEncodedURIComponent(json);
  } catch (error) {
    console.error('Error encoding event to URL:', error);
    return null;
  }
}

/** Helper: generate a shareable URL for an event */
export function _generateShareURL(get: StorageGetter, eventId: string): { url: string; size: number } | null {
  const encoded = _encodeEventToURL(get, eventId);
  if (!encoded) return null;

  const baseURL = window.location.origin + window.location.pathname;
  const url = `${baseURL}?share=${encoded}`;

  return { url, size: url.length };
}
