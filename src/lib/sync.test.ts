import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { syncToMongoDB, fetchFromMongoDB } from './sync';

describe('sync.ts — QG-6: scope du sync', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
  });

  describe('syncToMongoDB(clubSlug)', () => {
    it('envoie clubSlug dans le body du POST', async () => {
      // Set up localStorage with namespaced data
      const storageData = JSON.stringify({
        currentEventId: 'event-1',
        events: [{ id: 'event-1', name: 'Test', createdAt: '2024-01-01', tournaments: [] }],
        validations: {},
      });
      localStorage.setItem('nos-joueurs-en-tournoi:hay-chess', storageData);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, synced: 1 }),
      });

      await syncToMongoDB('hay-chess');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.clubSlug).toBe('hay-chess');
    });

    it('lit le localStorage de la clé namespacée (pas la clé globale)', async () => {
      // Legacy global data
      localStorage.setItem('nos-joueurs-en-tournoi', JSON.stringify({
        currentEventId: '',
        events: [{ id: 'global-event', name: 'Global', createdAt: '2024-01-01', tournaments: [] }],
        validations: {},
      }));

      // Namespaced data
      localStorage.setItem('nos-joueurs-en-tournoi:hay-chess', JSON.stringify({
        currentEventId: 'event-1',
        events: [{ id: 'event-1', name: 'Hay Event', createdAt: '2024-01-01', tournaments: [] }],
        validations: {},
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, synced: 1 }),
      });

      await syncToMongoDB('hay-chess');

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      // Should contain the namespaced event, NOT the global one
      expect(body.events).toHaveLength(1);
      expect(body.events[0].name).toBe('Hay Event');
    });
  });

  describe('fetchFromMongoDB(clubSlug)', () => {
    it('passe clubSlug dans le query string du GET', async () => {
      localStorage.setItem('nos-joueurs-en-tournoi:hay-chess', JSON.stringify({
        currentEventId: '',
        events: [],
        validations: {},
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { events: [], validations: {}, currentEventId: '' },
        }),
      });

      await fetchFromMongoDB('hay-chess');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('clubSlug=hay-chess');
    });

    it('écrit dans le localStorage de la clé namespacée (pas la clé globale)', async () => {
      localStorage.setItem('nos-joueurs-en-tournoi:hay-chess', JSON.stringify({
        currentEventId: '',
        events: [],
        validations: {},
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            events: [{ id: 'remote-event', name: 'Remote', createdAt: '2024-01-01', tournaments: [] }],
            validations: {},
            currentEventId: 'remote-event',
          },
        }),
      });

      await fetchFromMongoDB('hay-chess');

      // Namespaced key should have data
      const namespacedData = JSON.parse(localStorage.getItem('nos-joueurs-en-tournoi:hay-chess')!);
      expect(namespacedData.events.some((e: { name: string }) => e.name === 'Remote')).toBe(true);

      // Global key should NOT have the remote data
      const globalData = localStorage.getItem('nos-joueurs-en-tournoi');
      if (globalData) {
        const parsed = JSON.parse(globalData);
        expect(parsed.events.some((e: { name: string }) => e.name === 'Remote')).toBe(false);
      }
    });

    it('ne merge PAS des données d\'un autre club', async () => {
      // Club B data in localStorage
      localStorage.setItem('nos-joueurs-en-tournoi:club-b', JSON.stringify({
        currentEventId: 'event-b',
        events: [{ id: 'event-b', name: 'Event B', createdAt: '2024-01-01', tournaments: [] }],
        validations: {},
      }));

      // Club A namespaced data
      localStorage.setItem('nos-joueurs-en-tournoi:club-a', JSON.stringify({
        currentEventId: '',
        events: [],
        validations: {},
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            events: [{ id: 'event-a', name: 'Event A Remote', createdAt: '2024-01-01', tournaments: [] }],
            validations: {},
            currentEventId: 'event-a',
          },
        }),
      });

      await fetchFromMongoDB('club-a');

      // Club B data should be untouched
      const clubBData = JSON.parse(localStorage.getItem('nos-joueurs-en-tournoi:club-b')!);
      expect(clubBData.events).toHaveLength(1);
      expect(clubBData.events[0].name).toBe('Event B');
    });
  });

  describe('error paths', () => {
    it('syncToMongoDB retourne false si fetch throw', async () => {
      localStorage.setItem('nos-joueurs-en-tournoi:test-club', JSON.stringify({
        currentEventId: '', events: [], validations: {},
      }));
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await syncToMongoDB('test-club');
      expect(result).toBe(false);
    });

    it('syncToMongoDB retourne false si response 500', async () => {
      localStorage.setItem('nos-joueurs-en-tournoi:test-club', JSON.stringify({
        currentEventId: '', events: [], validations: {},
      }));
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

      const result = await syncToMongoDB('test-club');
      expect(result).toBe(false);
    });

    it('fetchFromMongoDB retourne false si fetch throw', async () => {
      localStorage.setItem('nos-joueurs-en-tournoi:test-club', JSON.stringify({
        currentEventId: '', events: [], validations: {},
      }));
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchFromMongoDB('test-club');
      expect(result).toBe(false);
    });

    it('fetchFromMongoDB retourne false si response 500', async () => {
      localStorage.setItem('nos-joueurs-en-tournoi:test-club', JSON.stringify({
        currentEventId: '', events: [], validations: {},
      }));
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

      const result = await fetchFromMongoDB('test-club');
      expect(result).toBe(false);
    });
  });

  describe('fetchFromMongoDB — decision table: merge', () => {
    it('remote [A], local [] → merged = [A]', async () => {
      localStorage.setItem('nos-joueurs-en-tournoi:test-club', JSON.stringify({
        currentEventId: '', events: [], validations: {},
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            events: [{ id: 'e1', name: 'Remote', createdAt: '2024-01-01', tournaments: [] }],
            validations: {},
            currentEventId: 'e1',
          },
        }),
      });

      await fetchFromMongoDB('test-club');

      const data = JSON.parse(localStorage.getItem('nos-joueurs-en-tournoi:test-club')!);
      expect(data.events).toHaveLength(1);
      expect(data.events[0].name).toBe('Remote');
    });

    it('remote [], local [B] → merged = [B]', async () => {
      localStorage.setItem('nos-joueurs-en-tournoi:test-club', JSON.stringify({
        currentEventId: 'e2',
        events: [{ id: 'e2', name: 'Local', createdAt: '2024-01-01', tournaments: [] }],
        validations: {},
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            events: [],
            validations: {},
            currentEventId: '',
          },
        }),
      });

      await fetchFromMongoDB('test-club');

      const data = JSON.parse(localStorage.getItem('nos-joueurs-en-tournoi:test-club')!);
      expect(data.events).toHaveLength(1);
      expect(data.events[0].name).toBe('Local');
    });

    it('remote [A], local [B] → merged = [A, B]', async () => {
      localStorage.setItem('nos-joueurs-en-tournoi:test-club', JSON.stringify({
        currentEventId: 'e2',
        events: [{ id: 'e2', name: 'Local', createdAt: '2024-01-01', tournaments: [] }],
        validations: {},
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            events: [{ id: 'e1', name: 'Remote', createdAt: '2024-01-01', tournaments: [] }],
            validations: {},
            currentEventId: 'e1',
          },
        }),
      });

      await fetchFromMongoDB('test-club');

      const data = JSON.parse(localStorage.getItem('nos-joueurs-en-tournoi:test-club')!);
      expect(data.events).toHaveLength(2);
      expect(data.events.map((e: { name: string }) => e.name).sort()).toEqual(['Local', 'Remote']);
    });

    it('remote [A-v1], local [A-v2] → remote gagne', async () => {
      localStorage.setItem('nos-joueurs-en-tournoi:test-club', JSON.stringify({
        currentEventId: 'e1',
        events: [{ id: 'e1', name: 'Local Version', createdAt: '2024-01-01', tournaments: [] }],
        validations: {},
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            events: [{ id: 'e1', name: 'Remote Version', createdAt: '2024-01-01', tournaments: [] }],
            validations: {},
            currentEventId: 'e1',
          },
        }),
      });

      await fetchFromMongoDB('test-club');

      const data = JSON.parse(localStorage.getItem('nos-joueurs-en-tournoi:test-club')!);
      expect(data.events).toHaveLength(1);
      expect(data.events[0].name).toBe('Remote Version');
    });
  });
});
