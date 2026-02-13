import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStorageData,
  setStorageData,
  getCurrentEvent,
  saveEvent,
  deleteEvent,
  getValidationState,
  setValidation,
  getValidation,
  clearAllData,
  exportData,
  importData,
  getAllTournaments,
  getTournamentsByEvent,
  getTournamentById,
  createTournament,
  updateTournament,
  deleteTournament,
  updateTournamentPlayers,
  searchTournaments,
  getTournamentStats,
} from './storage';
import type { Event, StorageData, Player } from '@/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

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

      localStorage.setItem('hay-chess-tracker', JSON.stringify(mockData));

      const data = getStorageData();
      expect(data).toEqual(mockData);
    });

    it('handles corrupted JSON gracefully', () => {
      localStorage.setItem('hay-chess-tracker', 'invalid json{');

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

      const saved = JSON.parse(localStorage.getItem('hay-chess-tracker')!);
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
            url: 'http://test.com',
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
            url: 'http://test.com',
            players: [],
            lastUpdate: new Date().toISOString(),
          },
        ],
      };

      saveEvent(event);
      setValidation('tournament-1', 'Player 1', 1, true);

      deleteEvent('event-1');

      const data = getStorageData();
      expect(data.events).toHaveLength(1);
      expect(data.currentEventId).toBe('');
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

  describe('Tournament CRUD operations', () => {
    let mockEvent: Event;

    beforeEach(() => {
      mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        createdAt: new Date().toISOString(),
        tournaments: [
          {
            id: 'tournament-1',
            name: 'U12',
            url: 'https://ffe.fr/u12',
            lastUpdate: new Date().toISOString(),
            players: [],
          },
          {
            id: 'tournament-2',
            name: 'U14',
            url: 'https://ffe.fr/u14',
            lastUpdate: new Date().toISOString(),
            players: [
              {
                name: 'Player 1',
                elo: 1500,
                club: 'Hay Chess',
                results: [{ round: 1, score: 1 }],
                currentPoints: 1,
                ranking: 1,
                validated: [true],
              },
            ],
          },
        ],
      };

      saveEvent(mockEvent);
    });

    describe('getAllTournaments', () => {
      it('returns all tournaments with event info', () => {
        const tournaments = getAllTournaments();

        expect(tournaments).toHaveLength(2);
        expect(tournaments[0]).toMatchObject({
          id: 'tournament-1',
          name: 'U12',
          eventId: 'event-1',
          eventName: 'Test Event',
        });
        expect(tournaments[1]).toMatchObject({
          id: 'tournament-2',
          name: 'U14',
          eventId: 'event-1',
          eventName: 'Test Event',
        });
      });

      it('returns empty array when no events exist', () => {
        clearAllData();
        const tournaments = getAllTournaments();
        expect(tournaments).toHaveLength(0);
      });
    });

    describe('getTournamentsByEvent', () => {
      it('returns tournaments for a specific event', () => {
        const tournaments = getTournamentsByEvent('event-1');

        expect(tournaments).toHaveLength(2);
        expect(tournaments[0].name).toBe('U12');
        expect(tournaments[1].name).toBe('U14');
      });

      it('returns empty array for non-existent event', () => {
        const tournaments = getTournamentsByEvent('nonexistent');
        expect(tournaments).toHaveLength(0);
      });
    });

    describe('getTournamentById', () => {
      it('returns tournament with event info', () => {
        const tournament = getTournamentById('tournament-1');

        expect(tournament).toMatchObject({
          id: 'tournament-1',
          name: 'U12',
          eventId: 'event-1',
          eventName: 'Test Event',
        });
      });

      it('returns null for non-existent tournament', () => {
        const tournament = getTournamentById('nonexistent');
        expect(tournament).toBeNull();
      });
    });

    describe('createTournament', () => {
      it('creates a new tournament in an event', () => {
        const newTournament = createTournament('event-1', {
          name: 'U16',
          url: 'https://ffe.fr/u16',
        });

        expect(newTournament).toMatchObject({
          name: 'U16',
          url: 'https://ffe.fr/u16',
          players: [],
        });
        expect(newTournament.id).toMatch(/^tournament_/);
        expect(newTournament.lastUpdate).toBeTruthy();

        const tournaments = getTournamentsByEvent('event-1');
        expect(tournaments).toHaveLength(3);
      });

      it('throws error for non-existent event', () => {
        expect(() => {
          createTournament('nonexistent', {
            name: 'U16',
            url: 'https://ffe.fr/u16',
          });
        }).toThrow('Event with id nonexistent not found');
      });
    });

    describe('updateTournament', () => {
      it('updates a tournament', () => {
        const updated = updateTournament('tournament-1', {
          name: 'U12 Updated',
          url: 'https://ffe.fr/u12-new',
        });

        expect(updated).toMatchObject({
          id: 'tournament-1',
          name: 'U12 Updated',
          url: 'https://ffe.fr/u12-new',
        });

        const tournament = getTournamentById('tournament-1');
        expect(tournament?.name).toBe('U12 Updated');
      });

      it('updates lastUpdate timestamp', () => {
        getTournamentById('tournament-1'); // Ensure tournament exists

        // Ensure timestamp is in ISO format and has been set
        const updated = updateTournament('tournament-1', {
          name: 'U12 Updated',
        });

        expect(updated.lastUpdate).toBeTruthy();
        expect(typeof updated.lastUpdate).toBe('string');
        expect(new Date(updated.lastUpdate).getTime()).toBeGreaterThan(0);
      });

      it('throws error for non-existent tournament', () => {
        expect(() => {
          updateTournament('nonexistent', { name: 'Test' });
        }).toThrow('Tournament with id nonexistent not found');
      });
    });

    describe('deleteTournament', () => {
      it('deletes a tournament and cleans up validations', () => {
        setValidation('tournament-1', 'Player 1', 1, true);

        const deleted = deleteTournament('tournament-1');

        expect(deleted).toBe(true);

        const tournaments = getTournamentsByEvent('event-1');
        expect(tournaments).toHaveLength(1);
        expect(tournaments[0].id).toBe('tournament-2');

        const validationState = getValidationState();
        expect(validationState['tournament-1']).toBeUndefined();
      });

      it('returns false for non-existent tournament', () => {
        const deleted = deleteTournament('nonexistent');
        expect(deleted).toBe(false);
      });
    });

    describe('updateTournamentPlayers', () => {
      it('updates tournament players', () => {
        const players: Player[] = [
          {
            name: 'Player 1',
            elo: 1600,
            club: 'Hay Chess',
            results: [{ round: 1, score: 1 }, { round: 2, score: 0.5 }],
            currentPoints: 1.5,
            ranking: 1,
            validated: [true, false],
          },
          {
            name: 'Player 2',
            elo: 1550,
            club: 'Hay Chess',
            results: [{ round: 1, score: 0 }, { round: 2, score: 1 }],
            currentPoints: 1,
            ranking: 2,
            validated: [false, true],
          },
        ];

        const updated = updateTournamentPlayers('tournament-1', players);

        expect(updated?.players).toHaveLength(2);
        expect(updated?.players[0].name).toBe('Player 1');
        expect(updated?.players[1].name).toBe('Player 2');
      });
    });

    describe('searchTournaments', () => {
      it('searches tournaments by name', () => {
        const results = searchTournaments('U12');

        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('U12');
      });

      it('searches tournaments by event name', () => {
        const results = searchTournaments('Test Event');

        expect(results).toHaveLength(2);
      });

      it('is case insensitive', () => {
        const results = searchTournaments('u12');

        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('U12');
      });

      it('returns empty array when no matches', () => {
        const results = searchTournaments('nonexistent');
        expect(results).toHaveLength(0);
      });
    });

    describe('getTournamentStats', () => {
      it('returns tournament statistics', () => {
        const stats = getTournamentStats('tournament-2');

        expect(stats).toMatchObject({
          tournamentId: 'tournament-2',
          tournamentName: 'U14',
          eventName: 'Test Event',
          totalPlayers: 1,
          hayChessPlayerCount: 1,
          totalPoints: 1,
          averagePoints: 1,
          validatedRoundsCount: 1,
        });
        expect(stats?.lastUpdate).toBeTruthy();
      });

      it('calculates correct stats for multiple players', () => {
        const players: Player[] = [
          {
            name: 'Player 1',
            elo: 1600,
            club: 'Hay Chess',
            results: [{ round: 1, score: 1 }],
            currentPoints: 1,
            ranking: 1,
            validated: [true],
          },
          {
            name: 'Player 2',
            elo: 1550,
            club: 'Hay Chess',
            results: [{ round: 1, score: 0.5 }],
            currentPoints: 0.5,
            ranking: 2,
            validated: [false],
          },
          {
            name: 'Player 3',
            elo: 1500,
            club: 'Other Club',
            results: [{ round: 1, score: 1 }],
            currentPoints: 1,
            ranking: 1,
            validated: [true],
          },
        ];

        updateTournamentPlayers('tournament-2', players);

        const stats = getTournamentStats('tournament-2');

        expect(stats).toMatchObject({
          totalPlayers: 3,
          hayChessPlayerCount: 2,
          totalPoints: 1.5,
          averagePoints: 0.75,
          validatedRoundsCount: 2,
        });
      });

      it('returns null for non-existent tournament', () => {
        const stats = getTournamentStats('nonexistent');
        expect(stats).toBeNull();
      });
    });
  });
});
