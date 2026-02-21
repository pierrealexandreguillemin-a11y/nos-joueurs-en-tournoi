import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Redis before importing kv
const mockStore: Record<string, unknown> = {};

vi.mock('@upstash/redis', () => {
  class RedisMock {
    hset = vi.fn(async (key: string, fields: Record<string, string>) => {
      if (!mockStore[key]) mockStore[key] = {};
      Object.assign(mockStore[key] as Record<string, string>, fields);
    });
    hgetall = vi.fn(async (key: string) => {
      return mockStore[key] || null;
    });
    hdel = vi.fn(async (key: string, field: string) => {
      if (mockStore[key]) {
        delete (mockStore[key] as Record<string, unknown>)[field];
      }
    });
    set = vi.fn(async (key: string, value: string) => {
      mockStore[key] = value;
    });
    get = vi.fn(async (key: string) => {
      return mockStore[key] || null;
    });
    pipeline = vi.fn(() => {
      const ops: Array<() => void> = [];
      return {
        hset: (key: string, fields: Record<string, string>) => {
          ops.push(() => {
            if (!mockStore[key]) mockStore[key] = {};
            Object.assign(mockStore[key] as Record<string, string>, fields);
          });
        },
        exec: async () => {
          ops.forEach(op => op());
        },
      };
    });
    static fromEnv() { return new RedisMock(); }
  }
  return { Redis: RedisMock };
});

import {
  eventsKey,
  validationsKey,
  settingsKey,
  saveEvents,
  getEvents,
  saveEvent,
  deleteEvent,
  saveValidations,
  getValidations,
  getCurrentEventId,
  saveCurrentEventId,
  saveStorageData,
  getStorageData,
} from './kv';
import { makeEvent } from '@/test/fixtures';

describe('kv.ts namespacé — QG-4: isolation KV', () => {
  beforeEach(() => {
    // Clear mock store
    Object.keys(mockStore).forEach(key => delete mockStore[key]);
  });

  describe('key generation', () => {
    it('eventsKey("hay-chess") → "nos-joueurs:hay-chess:events"', () => {
      expect(eventsKey('hay-chess')).toBe('nos-joueurs:hay-chess:events');
    });

    it('validationsKey("hay-chess") → "nos-joueurs:hay-chess:validations"', () => {
      expect(validationsKey('hay-chess')).toBe('nos-joueurs:hay-chess:validations');
    });

    it('settingsKey("hay-chess") → "nos-joueurs:hay-chess:settings"', () => {
      expect(settingsKey('hay-chess')).toBe('nos-joueurs:hay-chess:settings');
    });

    it('keys de "hay-chess" et "marseille-echecs" n\'ont aucune intersection', () => {
      const hayKeys = [eventsKey('hay-chess'), validationsKey('hay-chess'), settingsKey('hay-chess')];
      const marseilleKeys = [eventsKey('marseille-echecs'), validationsKey('marseille-echecs'), settingsKey('marseille-echecs')];

      hayKeys.forEach(hk => {
        marseilleKeys.forEach(mk => {
          expect(hk).not.toBe(mk);
        });
      });
    });
  });

  describe('fonctions paramétrées', () => {
    it('saveEvents(events, "club-a") ne persiste que sous le namespace club-a', async () => {
      await saveEvents([makeEvent('e1', 'Event 1')], 'club-a');

      const eventsA = await getEvents('club-a');
      const eventsB = await getEvents('club-b');

      expect(eventsA).toHaveLength(1);
      expect(eventsA[0].name).toBe('Event 1');
      expect(eventsB).toHaveLength(0);
    });

    it('getEvents("club-a") ne retourne que les events de club-a', async () => {
      await saveEvents([makeEvent('e1', 'Event A')], 'club-a');
      await saveEvents([makeEvent('e2', 'Event B')], 'club-b');

      const eventsA = await getEvents('club-a');
      expect(eventsA).toHaveLength(1);
      expect(eventsA[0].name).toBe('Event A');
    });

    it('saveValidations(v, "club-a") isolé de getValidations("club-b")', async () => {
      await saveValidations({ 't1': { 'Player': { 'round_1': true } } }, 'club-a');

      const validA = await getValidations('club-a');
      const validB = await getValidations('club-b');

      expect(validA).toEqual({ 't1': { 'Player': { 'round_1': true } } });
      expect(validB).toEqual({});
    });
  });

  describe('edge cases', () => {
    it('saveEvents avec events vide → no-op', async () => {
      await saveEvents([], 'club-a');
      const events = await getEvents('club-a');
      expect(events).toHaveLength(0);
    });

    it('getValidations retourne {} si aucune validation n\'existe', async () => {
      const validations = await getValidations('nonexistent-club');
      expect(validations).toEqual({});
    });

    it('getEvents retourne [] pour un club sans events', async () => {
      const events = await getEvents('empty-club');
      expect(events).toHaveLength(0);
    });

    it('saveEvents puis getEvents préserve la structure complète', async () => {
      const event = makeEvent('e1', 'Full Event', {
        tournaments: [{
          id: 'trn_1',
          name: 'U12',
          url: 'https://echecs.asso.fr/test',
          lastUpdate: '2024-01-01',
          players: [{
            name: 'Alice',
            elo: 1500,
            club: 'Test',
            results: [{ round: 1, score: 1 }],
            currentPoints: 1,
            ranking: 1,
            validated: [false],
          }],
        }],
      });

      await saveEvents([event], 'club-a');
      const retrieved = await getEvents('club-a');

      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].tournaments[0].players[0].name).toBe('Alice');
    });

    it('getEvents gère le retour objet (pas string) depuis Upstash', async () => {
      // Injecter directement un objet (au lieu d'une string JSON)
      const key = eventsKey('obj-club');
      mockStore[key] = { e1: { id: 'e1', name: 'Obj Event', createdAt: '2024-01-01', tournaments: [] } };

      const events = await getEvents('obj-club');
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('Obj Event');
    });

    it('getValidations gère le retour objet (pas string)', async () => {
      const key = validationsKey('obj-club');
      mockStore[key] = { t1: { Player: { round_1: true } } };

      const validations = await getValidations('obj-club');
      expect(validations).toEqual({ t1: { Player: { round_1: true } } });
    });

    it('getCurrentEventId retourne "" sans settings', async () => {
      const id = await getCurrentEventId('no-settings-club');
      expect(id).toBe('');
    });

    it('getCurrentEventId gère le retour objet (pas string)', async () => {
      const key = settingsKey('obj-club');
      mockStore[key] = { currentEventId: 'evt-42' };

      const id = await getCurrentEventId('obj-club');
      expect(id).toBe('evt-42');
    });

    it('getCurrentEventId retourne "" quand currentEventId est falsy dans settings (line 124)', async () => {
      const key = settingsKey('falsy-club');
      // Settings existent mais currentEventId est undefined
      mockStore[key] = JSON.stringify({ currentEventId: '' });

      const id = await getCurrentEventId('falsy-club');
      expect(id).toBe('');
    });

    it('saveEvent persiste un event unitaire', async () => {
      await saveEvent(makeEvent('e1', 'Single Event'), 'club-x');
      const events = await getEvents('club-x');
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('Single Event');
    });

    it('deleteEvent supprime un event spécifique', async () => {
      await saveEvent(makeEvent('e1', 'Event 1'), 'club-x');
      await saveEvent(makeEvent('e2', 'Event 2'), 'club-x');
      await deleteEvent('e1', 'club-x');
      const events = await getEvents('club-x');
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('e2');
    });

    it('saveStorageData avec currentEventId falsy utilise "" (line 134)', async () => {
      await saveStorageData({
        events: [makeEvent('e1', 'Event 1')],
        validations: {},
        currentEventId: '',
      }, 'falsy-eid-club');

      const id = await getCurrentEventId('falsy-eid-club');
      expect(id).toBe('');
    });

    it('saveStorageData persiste events + validations + currentEventId', async () => {
      await saveStorageData({
        events: [makeEvent('e1', 'Event 1')],
        validations: { t1: { P: { r1: true } } },
        currentEventId: 'e1',
      }, 'club-z');

      const data = await getStorageData('club-z');
      expect(data.events).toHaveLength(1);
      expect(data.validations).toEqual({ t1: { P: { r1: true } } });
      expect(data.currentEventId).toBe('e1');
    });

    it('getStorageData agrège events, validations et currentEventId', async () => {
      await saveEvents([makeEvent('e1', 'Event 1')], 'full-club');
      await saveValidations({ t1: { P: { r1: true } } }, 'full-club');
      await saveCurrentEventId('e1', 'full-club');

      const data = await getStorageData('full-club');
      expect(data.events).toHaveLength(1);
      expect(data.validations).toEqual({ t1: { P: { r1: true } } });
      expect(data.currentEventId).toBe('e1');
    });
  });
});
