import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Redis before importing kv
const mockStore: Record<string, unknown> = {};

vi.mock('@upstash/redis', () => {
  return {
    Redis: {
      fromEnv: () => ({
        hset: vi.fn(async (key: string, fields: Record<string, string>) => {
          if (!mockStore[key]) mockStore[key] = {};
          Object.assign(mockStore[key] as Record<string, string>, fields);
        }),
        hgetall: vi.fn(async (key: string) => {
          return mockStore[key] || null;
        }),
        hdel: vi.fn(async (key: string, field: string) => {
          if (mockStore[key]) {
            delete (mockStore[key] as Record<string, unknown>)[field];
          }
        }),
        set: vi.fn(async (key: string, value: string) => {
          mockStore[key] = value;
        }),
        get: vi.fn(async (key: string) => {
          return mockStore[key] || null;
        }),
        pipeline: vi.fn(() => {
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
        }),
      }),
    },
  };
});

import {
  eventsKey,
  validationsKey,
  settingsKey,
  saveEvents,
  getEvents,
  saveValidations,
  getValidations,
} from './kv';
import type { Event } from '@/types';

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
    const makeEvent = (id: string, name: string): Event => ({
      id,
      name,
      createdAt: '2024-01-01',
      tournaments: [],
    });

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
});
