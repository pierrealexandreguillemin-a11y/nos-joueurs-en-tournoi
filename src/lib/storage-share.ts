'use client';

import type { Event, StorageData, ValidationState } from '@/types';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { getStorageData, setStorageData } from './storage-core';

export interface ExportedEvent {
  version: '1.0';
  exportDate: string;
  event: Event;
  validations: ValidationState;
}

type Getter = () => StorageData;
type Setter = (data: StorageData) => void;

// ========================================
// PARAMETERIZED VERSIONS (for createClubStorage)
// ========================================

export function exportEventFrom(
  get: Getter, eventId: string, includeValidations = true,
): ExportedEvent | null {
  const data = get();
  const event = data.events.find(e => e.id === eventId);
  if (!event) return null;
  const vals: ValidationState = {};
  if (includeValidations) {
    event.tournaments.forEach(t => {
      if (data.validations[t.id]) vals[t.id] = data.validations[t.id];
    });
  }
  return { version: '1.0', exportDate: new Date().toISOString(), event, validations: vals };
}

/**
 * Same event under fresh event and tournament ids, validations remapped to the new tournament ids.
 * Used to copy a duplicate, and to bring back an event the club deleted (its id is tombstoned).
 */
export function reidentifyExport(exported: ExportedEvent, nameSuffix = ''): ExportedEvent {
  const { event, validations } = exported;
  const tournaments = event.tournaments.map(t => ({ ...t, id: `tournament_${crypto.randomUUID()}` }));
  const remapped: ValidationState = {};
  event.tournaments.forEach((t, i) => {
    if (validations[t.id]) remapped[tournaments[i].id] = validations[t.id];
  });
  return {
    ...exported,
    event: { ...event, id: `event_${crypto.randomUUID()}`, name: `${event.name}${nameSuffix}`, tournaments },
    validations: remapped,
  };
}

export function importEventInto(
  get: Getter, set: Setter, exportedData: ExportedEvent,
  options: { replaceIfExists: boolean; generateNewId?: boolean } = { replaceIfExists: false },
): { success: boolean; eventId: string; isDuplicate: boolean } {
  try {
    const data = get();
    const existingIndex = data.events.findIndex(e => e.id === exportedData.event.id);
    const isDuplicate = existingIndex >= 0;
    let imported = exportedData;

    if (isDuplicate) {
      if (options.replaceIfExists) {
        data.events[existingIndex] = { ...exportedData.event };
      } else if (options.generateNewId) {
        imported = reidentifyExport(exportedData, ' (copie)');
        data.events.push(imported.event);
      } else {
        return { success: false, eventId: exportedData.event.id, isDuplicate: true };
      }
    } else {
      data.events.push({ ...exportedData.event });
    }

    Object.entries(imported.validations).forEach(([tid, tv]) => { data.validations[tid] = tv; });
    const finalEvent = imported.event;

    data.currentEventId = finalEvent.id;
    set(data);
    return { success: true, eventId: finalEvent.id, isDuplicate };
  } catch (error) {
    console.error('Error importing event:', error);
    return { success: false, eventId: '', isDuplicate: false };
  }
}

export function encodeEventFrom(get: Getter, eventId: string): string | null {
  const exported = exportEventFrom(get, eventId, false);
  if (!exported) return null;
  try {
    return compressToEncodedURIComponent(JSON.stringify(exported));
  } catch (error) {
    console.error('Error encoding event to URL:', error);
    return null;
  }
}

export function generateShareURLFrom(
  get: Getter, eventId: string,
): { url: string; size: number } | null {
  const encoded = encodeEventFrom(get, eventId);
  if (!encoded) return null;
  if (typeof window === 'undefined') return null;
  const url = `${window.location.origin + window.location.pathname}?share=${encoded}`;
  return { url, size: url.length };
}

// ========================================
// PUBLIC API (default storage)
// ========================================

export function exportEvent(eventId: string, includeValidations = true): ExportedEvent | null {
  return exportEventFrom(getStorageData, eventId, includeValidations);
}

export function checkEventExists(eventId: string): boolean {
  return getStorageData().events.some(e => e.id === eventId);
}

export function importEvent(
  exportedData: ExportedEvent,
  options: { replaceIfExists: boolean; generateNewId?: boolean } = { replaceIfExists: false },
): { success: boolean; eventId: string; isDuplicate: boolean } {
  return importEventInto(getStorageData, setStorageData, exportedData, options);
}

export function encodeEventToURL(eventId: string): string | null {
  return encodeEventFrom(getStorageData, eventId);
}

export function decodeEventFromURL(compressed: string): ExportedEvent | null {
  try {
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const data = JSON.parse(json) as ExportedEvent;
    if (!data.version || !data.event) return null;
    return data;
  } catch (error) {
    console.error('Error decoding event from URL:', error);
    return null;
  }
}

export function generateShareURL(eventId: string): { url: string; size: number } | null {
  return generateShareURLFrom(getStorageData, eventId);
}
