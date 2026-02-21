import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStorageData,
  setStorageData,
  getCurrentEvent,
  getAllEvents,
  setCurrentEvent,
  saveEvent,
  deleteEvent,
  getValidationState,
  setValidation,
  getValidation,
  clearAllData,
  exportData,
  importData,
  exportEvent,
  checkEventExists,
  importEvent,
  encodeEventToURL,
  decodeEventFromURL,
  generateShareURL,
  createClubStorage,
} from './storage';
import type { ExportedEvent } from './storage';
import type { Event, StorageData } from '@/types';
import { makeEvent as makeFixtureEvent } from '@/test/fixtures';

describe('storage.ts', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('getStorageData', () => {
    it('returns default data when localStorage is empty', () => {
      const data = getStorageData();

      expect(data).toEqual({
        currentEventId: '',
        events: [],
        validations: {},
      });
    });

    it('returns parsed data from localStorage', () => {
      const mockData: StorageData = {
        currentEventId: 'event-1',
        events: [
          {
            id: 'event-1',
            name: 'Test Event',
            createdAt: new Date().toISOString(),
            tournaments: [],
          },
        ],
        validations: {},
      };

      localStorage.setItem('nos-joueurs-en-tournoi', JSON.stringify(mockData));

      const data = getStorageData();
      expect(data).toEqual(mockData);
    });

    it('handles corrupted JSON gracefully', () => {
      localStorage.setItem('nos-joueurs-en-tournoi', 'invalid json{');

      const data = getStorageData();

      expect(data).toEqual({
        currentEventId: '',
        events: [],
        validations: {},
      });
    });
  });

  describe('setStorageData', () => {
    it('saves data to localStorage', () => {
      const data: StorageData = {
        currentEventId: 'event-1',
        events: [
          {
            id: 'event-1',
            name: 'Test Event',
            createdAt: new Date().toISOString(),
            tournaments: [],
          },
        ],
        validations: {},
      };

      setStorageData(data);

      const saved = JSON.parse(localStorage.getItem('nos-joueurs-en-tournoi')!);
      expect(saved).toEqual(data);
    });
  });

  describe('getCurrentEvent', () => {
    it('returns null when no current event', () => {
      const event = getCurrentEvent();
      expect(event).toBeNull();
    });

    it('returns the current event', () => {
      const mockEvent: Event = {
        id: 'event-1',
        name: 'Test Event',
        createdAt: new Date().toISOString(),
        tournaments: [],
      };

      const data: StorageData = {
        currentEventId: 'event-1',
        events: [mockEvent],
        validations: {},
      };

      setStorageData(data);

      const event = getCurrentEvent();
      expect(event).toEqual(mockEvent);
    });

    it('returns null when current event not found in events', () => {
      const data: StorageData = {
        currentEventId: 'nonexistent',
        events: [],
        validations: {},
      };

      setStorageData(data);

      const event = getCurrentEvent();
      expect(event).toBeNull();
    });
  });

  describe('saveEvent', () => {
    it('adds new event and sets it as current', () => {
      const event: Event = {
        id: 'event-1',
        name: 'New Event',
        createdAt: new Date().toISOString(),
        tournaments: [],
      };

      saveEvent(event);

      const data = getStorageData();
      expect(data.events).toHaveLength(1);
      expect(data.events[0]).toEqual(event);
      expect(data.currentEventId).toBe('event-1');
    });

    it('updates existing event', () => {
      const event1: Event = {
        id: 'event-1',
        name: 'Event 1',
        createdAt: new Date().toISOString(),
        tournaments: [],
      };

      saveEvent(event1);

      const event1Updated: Event = {
        id: 'event-1',
        name: 'Event 1 Updated',
        createdAt: new Date().toISOString(),
        tournaments: [
          {
            id: 'tournament-1',
            name: 'Tournament',
            url: 'https://test.example.com',
            players: [],
            lastUpdate: new Date().toISOString(),
          },
        ],
      };

      saveEvent(event1Updated);

      const data = getStorageData();
      expect(data.events).toHaveLength(1);
      expect(data.events[0].name).toBe('Event 1 Updated');
      expect(data.events[0].tournaments).toHaveLength(1);
    });
  });

  describe('deleteEvent', () => {
    it('deletes event and cleans up validations', () => {
      const event: Event = {
        id: 'event-1',
        name: 'Event 1',
        createdAt: new Date().toISOString(),
        tournaments: [
          {
            id: 'tournament-1',
            name: 'Tournament',
            url: 'https://test.example.com',
            players: [],
            lastUpdate: new Date().toISOString(),
          },
        ],
      };

      saveEvent(event);
      setValidation('tournament-1', 'Player 1', 1, true);

      deleteEvent('event-1');

      const data = getStorageData();
      expect(data.events).toHaveLength(0);
      expect(data.currentEventId).toBe('');
      expect(data.validations['tournament-1']).toBeUndefined();
    });

    it('does nothing when deleting a nonexistent event', () => {
      const event: Event = {
        id: 'event-1',
        name: 'Event 1',
        createdAt: new Date().toISOString(),
        tournaments: [
          {
            id: 'tournament-1',
            name: 'Tournament',
            url: 'https://test.example.com',
            players: [],
            lastUpdate: new Date().toISOString(),
          },
        ],
      };

      saveEvent(event);
      setValidation('tournament-1', 'Player 1', 1, true);

      // Delete with a fake ID — should not throw
      deleteEvent('nonexistent-id');

      const data = getStorageData();
      expect(data.events).toHaveLength(1);
      expect(data.events[0].id).toBe('event-1');
      expect(data.currentEventId).toBe('event-1');
      expect(data.validations['tournament-1']).toBeDefined();
      expect(getValidation('tournament-1', 'Player 1', 1)).toBe(true);
    });

    it('does not change currentEventId when deleting a non-current event', () => {
      const event1: Event = {
        id: 'event-1',
        name: 'Event 1',
        createdAt: new Date().toISOString(),
        tournaments: [
          {
            id: 'tournament-1',
            name: 'Tournament 1',
            url: 'https://test.example.com/1',
            players: [],
            lastUpdate: new Date().toISOString(),
          },
        ],
      };

      const event2: Event = {
        id: 'event-2',
        name: 'Event 2',
        createdAt: new Date().toISOString(),
        tournaments: [
          {
            id: 'tournament-2',
            name: 'Tournament 2',
            url: 'https://test.example.com/2',
            players: [],
            lastUpdate: new Date().toISOString(),
          },
        ],
      };

      saveEvent(event1);
      saveEvent(event2);
      // saveEvent sets currentEventId to the last saved event, so event-2 is current.
      // Manually set currentEventId back to event-1.
      const data = getStorageData();
      data.currentEventId = 'event-1';
      setStorageData(data);

      setValidation('tournament-2', 'Player X', 1, true);

      // Delete event-2, which is NOT the current event
      deleteEvent('event-2');

      const afterDelete = getStorageData();
      expect(afterDelete.currentEventId).toBe('event-1');
      expect(afterDelete.events).toHaveLength(1);
      expect(afterDelete.events[0].id).toBe('event-1');
      // Validations for tournament-2 should be cleaned up
      expect(afterDelete.validations['tournament-2']).toBeUndefined();
    });

    it('sets next event as current when deleting current event', () => {
      const event1: Event = {
        id: 'event-1',
        name: 'Event 1',
        createdAt: new Date().toISOString(),
        tournaments: [],
      };

      const event2: Event = {
        id: 'event-2',
        name: 'Event 2',
        createdAt: new Date().toISOString(),
        tournaments: [],
      };

      saveEvent(event1);
      saveEvent(event2);
      // Now event-2 is current

      // Delete event-2
      deleteEvent('event-2');

      const data = getStorageData();
      expect(data.events).toHaveLength(1);
      expect(data.currentEventId).toBe('event-1');
    });
  });

  describe('validation functions', () => {
    it('sets and gets validation correctly', () => {
      setValidation('tournament-1', 'Player 1', 1, true);

      const isValid = getValidation('tournament-1', 'Player 1', 1);
      expect(isValid).toBe(true);
    });

    it('returns false for non-existent validation', () => {
      const isValid = getValidation('tournament-1', 'Player 1', 1);
      expect(isValid).toBe(false);
    });

    it('getValidationState returns all validations', () => {
      setValidation('tournament-1', 'Player 1', 1, true);
      setValidation('tournament-1', 'Player 2', 1, false);
      setValidation('tournament-2', 'Player 3', 1, true);

      const state = getValidationState();

      expect(state).toEqual({
        'tournament-1': {
          'Player 1': {
            round_1: true,
          },
          'Player 2': {
            round_1: false,
          },
        },
        'tournament-2': {
          'Player 3': {
            round_1: true,
          },
        },
      });
    });
  });

  describe('clearAllData', () => {
    it('removes all data from localStorage', () => {
      const event: Event = {
        id: 'event-1',
        name: 'Event 1',
        createdAt: new Date().toISOString(),
        tournaments: [],
      };

      saveEvent(event);

      clearAllData();

      const data = getStorageData();
      expect(data.events).toHaveLength(0);
      expect(data.currentEventId).toBe('');
    });
  });

  describe('exportData and importData', () => {
    it('exports data as JSON string', () => {
      const event: Event = {
        id: 'event-1',
        name: 'Event 1',
        createdAt: new Date().toISOString(),
        tournaments: [],
      };

      saveEvent(event);

      const exported = exportData();
      const parsed = JSON.parse(exported);

      expect(parsed.events).toHaveLength(1);
      expect(parsed.events[0].id).toBe('event-1');
    });

    it('imports data from JSON string', () => {
      const mockData: StorageData = {
        currentEventId: 'event-2',
        events: [
          {
            id: 'event-2',
            name: 'Imported Event',
            createdAt: new Date().toISOString(),
            tournaments: [],
          },
        ],
        validations: {},
      };

      const jsonString = JSON.stringify(mockData);
      const success = importData(jsonString);

      expect(success).toBe(true);

      const data = getStorageData();
      expect(data.events).toHaveLength(1);
      expect(data.events[0].name).toBe('Imported Event');
      expect(data.currentEventId).toBe('event-2');
    });

    it('returns false for invalid JSON on import', () => {
      const success = importData('invalid json{');
      expect(success).toBe(false);
    });
  });

  describe('createClubStorage — QG-3: isolation inter-clubs', () => {
    const storageA = () => createClubStorage('club-a');
    const storageB = () => createClubStorage('club-b');

    // F4 DRY: use shared fixture instead of local duplicate
    const makeEvent = (id: string, name: string): Event => makeFixtureEvent(id, name);

    describe('isolation lecture', () => {
      it('Club A sauvegarde un event → Club B ne le voit pas', () => {
        storageA().saveEvent(makeEvent('event-1', 'Event A'));

        const eventsB = storageB().getAllEvents();
        expect(eventsB).toHaveLength(0);

        const eventsA = storageA().getAllEvents();
        expect(eventsA).toHaveLength(1);
        expect(eventsA[0].name).toBe('Event A');
      });

      it('Club A et Club B peuvent avoir des events avec le même ID sans conflit', () => {
        storageA().saveEvent(makeEvent('event-1', 'Event from A'));
        storageB().saveEvent(makeEvent('event-1', 'Event from B'));

        const eventsA = storageA().getAllEvents();
        const eventsB = storageB().getAllEvents();

        expect(eventsA).toHaveLength(1);
        expect(eventsA[0].name).toBe('Event from A');
        expect(eventsB).toHaveLength(1);
        expect(eventsB[0].name).toBe('Event from B');
      });

      it('clearAllData de Club A ne touche pas les données de Club B', () => {
        storageA().saveEvent(makeEvent('event-1', 'Event A'));
        storageB().saveEvent(makeEvent('event-2', 'Event B'));

        storageA().clearAllData();

        expect(storageA().getAllEvents()).toHaveLength(0);
        expect(storageB().getAllEvents()).toHaveLength(1);
        expect(storageB().getAllEvents()[0].name).toBe('Event B');
      });
    });

    describe('isolation validations', () => {
      it('validation de Club A invisible depuis le storage de Club B', () => {
        storageA().setValidation('tournament-1', 'Player 1', 1, true);

        expect(storageA().getValidation('tournament-1', 'Player 1', 1)).toBe(true);
        expect(storageB().getValidation('tournament-1', 'Player 1', 1)).toBe(false);
      });
    });

    describe('isolation export/import', () => {
      it('exportData de Club A ne contient pas les events de Club B', () => {
        storageA().saveEvent(makeEvent('event-1', 'Event A'));
        storageB().saveEvent(makeEvent('event-2', 'Event B'));

        const exported = JSON.parse(storageA().exportData());
        expect(exported.events).toHaveLength(1);
        expect(exported.events[0].name).toBe('Event A');
      });

      it('importData dans Club A n\'écrase pas les données de Club B', () => {
        storageB().saveEvent(makeEvent('event-2', 'Event B'));

        const importPayload = JSON.stringify({
          currentEventId: 'event-3',
          events: [makeEvent('event-3', 'Imported into A')],
          validations: {},
        });

        storageA().importData(importPayload);

        expect(storageB().getAllEvents()).toHaveLength(1);
        expect(storageB().getAllEvents()[0].name).toBe('Event B');

        expect(storageA().getAllEvents()).toHaveLength(1);
        expect(storageA().getAllEvents()[0].name).toBe('Imported into A');
      });
    });

    describe('backward compat', () => {
      it('les fonctions sans namespace continuent de fonctionner (clé par défaut)', () => {
        const event = makeEvent('event-1', 'Default event');
        saveEvent(event);

        const events = getAllEvents();
        expect(events).toHaveLength(1);
        expect(events[0].name).toBe('Default event');
      });
    });

    describe('deleteEvent in club-scoped storage', () => {
      it('deleteEvent cleans up validations in club-scoped storage', () => {
        const club = createClubStorage('club-x');

        const event1: Event = {
          id: 'event-1',
          name: 'Event 1',
          createdAt: new Date().toISOString(),
          tournaments: [
            {
              id: 'tournament-1a',
              name: 'Tournament 1A',
              url: 'https://test.example.com/1a',
              players: [],
              lastUpdate: new Date().toISOString(),
            },
            {
              id: 'tournament-1b',
              name: 'Tournament 1B',
              url: 'https://test.example.com/1b',
              players: [],
              lastUpdate: new Date().toISOString(),
            },
          ],
        };

        const event2: Event = {
          id: 'event-2',
          name: 'Event 2',
          createdAt: new Date().toISOString(),
          tournaments: [
            {
              id: 'tournament-2a',
              name: 'Tournament 2A',
              url: 'https://test.example.com/2a',
              players: [],
              lastUpdate: new Date().toISOString(),
            },
          ],
        };

        club.saveEvent(event1);
        club.saveEvent(event2);

        // Add validations for tournaments in both events
        club.setValidation('tournament-1a', 'Player 1', 1, true);
        club.setValidation('tournament-1b', 'Player 2', 1, true);
        club.setValidation('tournament-2a', 'Player 3', 1, true);

        // Delete event-1
        club.deleteEvent('event-1');

        const data = club.getStorageData();

        // Event-1 is gone, event-2 remains
        expect(data.events).toHaveLength(1);
        expect(data.events[0].id).toBe('event-2');

        // Validations for tournament-1a and tournament-1b are cleaned up
        expect(data.validations['tournament-1a']).toBeUndefined();
        expect(data.validations['tournament-1b']).toBeUndefined();

        // Validations for tournament-2a are untouched
        expect(data.validations['tournament-2a']).toBeDefined();
        expect(club.getValidation('tournament-2a', 'Player 3', 1)).toBe(true);
      });
    });
  });

  describe('BVA: validation limites', () => {
    it('setValidation round=0 persiste correctement', () => {
      setValidation('tournament-1', 'Player 1', 0, true);
      expect(getValidation('tournament-1', 'Player 1', 0)).toBe(true);
    });

    it('setValidation round négatif persiste correctement', () => {
      setValidation('tournament-1', 'Player 1', -1, true);
      expect(getValidation('tournament-1', 'Player 1', -1)).toBe(true);
    });

    it('createClubStorage("") fonctionne avec clé vide', () => {
      const storage = createClubStorage('');
      storage.saveEvent({
        id: 'e1',
        name: 'Test',
        createdAt: '2024-01-01',
        tournaments: [],
      });
      expect(storage.getAllEvents()).toHaveLength(1);
    });

    it('setValidation playerName vide persiste correctement', () => {
      setValidation('tournament-1', '', 1, true);
      expect(getValidation('tournament-1', '', 1)).toBe(true);
    });
  });

  describe('setCurrentEvent', () => {
    it('met à jour le currentEventId', () => {
      const event1: Event = { id: 'e1', name: 'E1', createdAt: '2024-01-01', tournaments: [] };
      const event2: Event = { id: 'e2', name: 'E2', createdAt: '2024-01-01', tournaments: [] };
      saveEvent(event1);
      saveEvent(event2);

      setCurrentEvent('e1');

      const data = getStorageData();
      expect(data.currentEventId).toBe('e1');
    });

    it('lance une erreur si l\'event n\'existe pas', () => {
      expect(() => setCurrentEvent('nonexistent')).toThrow('Event with id nonexistent not found');
    });
  });

  describe('exportEvent / importEvent / checkEventExists', () => {
    const event: Event = {
      id: 'exp-1',
      name: 'Exported Event',
      createdAt: '2024-01-01',
      tournaments: [
        { id: 'trn-1', name: 'U12', url: 'https://ffe.test/u12', lastUpdate: '2024-01-01', players: [] },
      ],
    };

    beforeEach(() => {
      saveEvent(event);
      setValidation('trn-1', 'Alice', 1, true);
    });

    it('exportEvent retourne l\'event avec ses validations', () => {
      const exported = exportEvent('exp-1');

      expect(exported).not.toBeNull();
      expect(exported!.version).toBe('1.0');
      expect(exported!.event.id).toBe('exp-1');
      expect(exported!.validations['trn-1']).toBeDefined();
      expect(exported!.exportDate).toBeTruthy();
    });

    it('exportEvent sans validations quand includeValidations=false', () => {
      const exported = exportEvent('exp-1', false);

      expect(exported).not.toBeNull();
      expect(exported!.validations).toEqual({});
    });

    it('exportEvent retourne null pour un event inexistant', () => {
      expect(exportEvent('nonexistent')).toBeNull();
    });

    it('checkEventExists retourne true/false', () => {
      expect(checkEventExists('exp-1')).toBe(true);
      expect(checkEventExists('nonexistent')).toBe(false);
    });

    it('importEvent ajoute un nouvel event', () => {
      const newExport: ExportedEvent = {
        version: '1.0',
        exportDate: '2024-01-01',
        event: { id: 'imp-1', name: 'Imported', createdAt: '2024-01-01', tournaments: [] },
        validations: {},
      };

      const result = importEvent(newExport);

      expect(result.success).toBe(true);
      expect(result.isDuplicate).toBe(false);
      expect(result.eventId).toBe('imp-1');
      expect(checkEventExists('imp-1')).toBe(true);
    });

    it('importEvent refuse un doublon sans replaceIfExists', () => {
      const exported = exportEvent('exp-1')!;
      const result = importEvent(exported);

      expect(result.success).toBe(false);
      expect(result.isDuplicate).toBe(true);
    });

    it('importEvent remplace un doublon avec replaceIfExists', () => {
      const exported = exportEvent('exp-1')!;
      exported.event.name = 'Updated Name';

      const result = importEvent(exported, { replaceIfExists: true });

      expect(result.success).toBe(true);
      expect(result.isDuplicate).toBe(true);

      const events = getAllEvents();
      const updated = events.find(e => e.id === 'exp-1');
      expect(updated?.name).toBe('Updated Name');
    });

    it('importEvent génère un nouvel ID avec generateNewId', () => {
      const exported = exportEvent('exp-1')!;

      const result = importEvent(exported, { replaceIfExists: false, generateNewId: true });

      expect(result.success).toBe(true);
      expect(result.isDuplicate).toBe(true);
      expect(result.eventId).not.toBe('exp-1');

      const events = getAllEvents();
      expect(events).toHaveLength(2);
      const copy = events.find(e => e.id === result.eventId);
      expect(copy?.name).toContain('(copie)');
    });

    it('importEvent avec generateNewId remappe les validations', () => {
      const exported = exportEvent('exp-1')!;

      const result = importEvent(exported, { replaceIfExists: false, generateNewId: true });

      expect(result.success).toBe(true);
      // Les validations de l'original doivent être copiées vers le nouveau tournament ID
      const data = getStorageData();
      const copy = data.events.find(e => e.id === result.eventId);
      expect(copy).toBeDefined();
      // Le nouveau tournament a un ID différent de trn-1
      const newTrnId = copy!.tournaments[0].id;
      expect(newTrnId).not.toBe('trn-1');
      expect(data.validations[newTrnId]).toBeDefined();
    });

    it('importEvent gère les erreurs gracieusement', () => {
      // Forcer une erreur en injectant un objet invalide
      const badExport = { version: '1.0', exportDate: '', event: null, validations: {} } as unknown as ExportedEvent;

      const result = importEvent(badExport);
      expect(result.success).toBe(false);
    });
  });

  describe('encodeEventToURL / decodeEventFromURL / generateShareURL', () => {
    const event: Event = {
      id: 'share-1',
      name: 'Shared Event',
      createdAt: '2024-01-01',
      tournaments: [
        { id: 'trn-s1', name: 'Open', url: 'https://ffe.test/open', lastUpdate: '2024-01-01', players: [] },
      ],
    };

    beforeEach(() => {
      saveEvent(event);
    });

    it('encodeEventToURL retourne une string compressée', () => {
      const encoded = encodeEventToURL('share-1');

      expect(encoded).not.toBeNull();
      expect(typeof encoded).toBe('string');
      expect(encoded!.length).toBeGreaterThan(0);
    });

    it('encodeEventToURL retourne null pour un event inexistant', () => {
      expect(encodeEventToURL('nonexistent')).toBeNull();
    });

    it('decodeEventFromURL décompresse correctement', () => {
      const encoded = encodeEventToURL('share-1')!;
      const decoded = decodeEventFromURL(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded!.event.id).toBe('share-1');
      expect(decoded!.event.name).toBe('Shared Event');
      expect(decoded!.version).toBe('1.0');
    });

    it('decodeEventFromURL retourne null pour données invalides', () => {
      expect(decodeEventFromURL('garbage-data')).toBeNull();
    });

    it('decodeEventFromURL retourne null pour structure invalide (pas de version/event)', async () => {
      // lz-string compressé d'un objet sans version ni event
      const { compressToEncodedURIComponent } = await import('lz-string');
      const compressed = compressToEncodedURIComponent(JSON.stringify({ foo: 'bar' }));
      expect(decodeEventFromURL(compressed)).toBeNull();
    });

    it('generateShareURL retourne url et taille', () => {
      // Mock window.location pour le test (environnement node)
      // Inclure localStorage car getLocalStorage() vérifie window.localStorage en premier
      const origWindow = globalThis.window;
      globalThis.window = {
        location: { origin: 'https://example.com', pathname: '/' },
        localStorage: globalThis.localStorage,
      } as unknown as Window & typeof globalThis;

      try {
        const result = generateShareURL('share-1');

        expect(result).not.toBeNull();
        expect(result!.url).toContain('?share=');
        expect(result!.url).toContain('https://example.com');
        expect(result!.size).toBeGreaterThan(0);
      } finally {
        globalThis.window = origWindow;
      }
    });

    it('generateShareURL retourne null pour event inexistant', () => {
      expect(generateShareURL('nonexistent')).toBeNull();
    });
  });

  describe('_setStorageData — gestion d\'erreurs', () => {
    it('lance une erreur quand localStorage.setItem échoue', () => {
      const originalSetItem = globalThis.localStorage.setItem;
      globalThis.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };

      try {
        expect(() => setStorageData({ currentEventId: '', events: [], validations: {} }))
          .toThrow('Failed to save data');
      } finally {
        globalThis.localStorage.setItem = originalSetItem;
      }
    });
  });

  describe('createClubStorage — méthodes non couvertes', () => {
    it('getCurrentEvent retourne l\'event courant', () => {
      const club = createClubStorage('test-club');
      const event: Event = { id: 'e1', name: 'E1', createdAt: '2024-01-01', tournaments: [] };
      club.saveEvent(event);

      const current = club.getCurrentEvent();
      expect(current).not.toBeNull();
      expect(current!.id).toBe('e1');
    });

    it('getCurrentEvent retourne null sans currentEventId', () => {
      const club = createClubStorage('empty-club');
      expect(club.getCurrentEvent()).toBeNull();
    });

    it('getCurrentEvent retourne null si currentEventId ne correspond à rien', () => {
      const club = createClubStorage('mismatch-club');
      club.setStorageData({ currentEventId: 'ghost', events: [], validations: {} });
      expect(club.getCurrentEvent()).toBeNull();
    });

    it('setCurrentEvent met à jour le currentEventId', () => {
      const club = createClubStorage('switch-club');
      club.saveEvent({ id: 'e1', name: 'E1', createdAt: '2024-01-01', tournaments: [] });
      club.saveEvent({ id: 'e2', name: 'E2', createdAt: '2024-01-01', tournaments: [] });

      club.setCurrentEvent('e1');
      expect(club.getStorageData().currentEventId).toBe('e1');
    });

    it('setCurrentEvent lance une erreur si event inexistant', () => {
      const club = createClubStorage('err-club');
      expect(() => club.setCurrentEvent('ghost')).toThrow('Event with id ghost not found');
    });

    it('clearTournamentValidations supprime les validations d\'un tournoi', () => {
      const club = createClubStorage('val-club');
      club.setValidation('trn-1', 'Alice', 1, true);
      club.setValidation('trn-2', 'Bob', 1, true);

      club.clearTournamentValidations('trn-1');

      expect(club.getValidation('trn-1', 'Alice', 1)).toBe(false);
      expect(club.getValidation('trn-2', 'Bob', 1)).toBe(true);
    });

    it('exportEvent / importEvent fonctionnent en mode namespaced', () => {
      const club = createClubStorage('exp-club');
      club.saveEvent({
        id: 'e1',
        name: 'E1',
        createdAt: '2024-01-01',
        tournaments: [{ id: 'trn-1', name: 'T1', url: 'https://ffe.test/t', lastUpdate: '', players: [] }],
      });

      const exported = club.exportEvent('e1');
      expect(exported).not.toBeNull();
      expect(exported!.event.id).toBe('e1');

      // Importer dans un autre club
      const club2 = createClubStorage('imp-club');
      const result = club2.importEvent(exported!);
      expect(result.success).toBe(true);
      expect(club2.getAllEvents()).toHaveLength(1);
    });

    it('checkEventExists fonctionne en mode namespaced', () => {
      const club = createClubStorage('check-club');
      club.saveEvent({ id: 'e1', name: 'E1', createdAt: '2024-01-01', tournaments: [] });

      expect(club.checkEventExists('e1')).toBe(true);
      expect(club.checkEventExists('e2')).toBe(false);
    });

    it('encodeEventToURL / generateShareURL en mode namespaced', () => {
      const club = createClubStorage('url-club');
      club.saveEvent({
        id: 'e1',
        name: 'E1',
        createdAt: '2024-01-01',
        tournaments: [],
      });

      const encoded = club.encodeEventToURL('e1');
      expect(encoded).not.toBeNull();

      const origWindow = globalThis.window;
      globalThis.window = {
        location: { origin: 'https://example.com', pathname: '/' },
        localStorage: globalThis.localStorage,
      } as unknown as Window & typeof globalThis;

      try {
        const shareResult = club.generateShareURL('e1');
        expect(shareResult).not.toBeNull();
        expect(shareResult!.url).toContain('?share=');
      } finally {
        globalThis.window = origWindow;
      }
    });

    it('importData avec JSON invalide retourne false', () => {
      const club = createClubStorage('bad-import');
      expect(club.importData('not-json')).toBe(false);
    });

    // F6: clearAllData error path (storage.ts:652)
    it('clearAllData attrape les erreurs de removeItem', () => {
      const club = createClubStorage('err-clear');
      club.saveEvent({ id: 'e1', name: 'E1', createdAt: '2024-01-01', tournaments: [] });

      const originalRemoveItem = globalThis.localStorage.removeItem;
      globalThis.localStorage.removeItem = () => { throw new Error('removeItem failed'); };

      try {
        // Should not throw — error is caught internally
        expect(() => club.clearAllData()).not.toThrow();
      } finally {
        globalThis.localStorage.removeItem = originalRemoveItem;
      }
    });
  });

  // F5: _encodeEventToURL catch branch (storage.ts:516-518)
  describe('encodeEventToURL — catch branch', () => {
    it('retourne null quand JSON.stringify lève une erreur', () => {
      const event: Event = {
        id: 'crash-1',
        name: 'Crash Event',
        createdAt: '2024-01-01',
        tournaments: [],
      };
      saveEvent(event);

      // Mock JSON.stringify to throw — triggers the catch in _encodeEventToURL
      const originalStringify = JSON.stringify;
      JSON.stringify = (() => { throw new Error('stringify failed'); }) as typeof JSON.stringify;

      try {
        const result = encodeEventToURL('crash-1');
        expect(result).toBeNull();
      } finally {
        JSON.stringify = originalStringify;
      }
    });
  });
});
