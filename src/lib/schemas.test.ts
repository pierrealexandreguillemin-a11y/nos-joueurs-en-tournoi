import { describe, it, expect } from 'vitest';
import {
  clubSlugSchema,
  resultSchema,
  playerSchema,
  pairingSchema,
  tournamentSchema,
  eventSchema,
  syncBodySchema,
} from './schemas';

describe('Zod schemas', () => {
  describe('clubSlugSchema', () => {
    it('accepts valid slug', () => {
      expect(clubSlugSchema.safeParse('hay-chess').success).toBe(true);
    });

    it('rejects uppercase', () => {
      expect(clubSlugSchema.safeParse('HAY-CHESS').success).toBe(false);
    });

    it('rejects empty string', () => {
      expect(clubSlugSchema.safeParse('').success).toBe(false);
    });

    it('rejects slug > 40 chars', () => {
      expect(clubSlugSchema.safeParse('a'.repeat(41)).success).toBe(false);
    });
  });

  describe('resultSchema', () => {
    it('accepts valid result', () => {
      expect(resultSchema.safeParse({ round: 1, score: 1 }).success).toBe(true);
    });

    it('accepts result with opponent', () => {
      expect(resultSchema.safeParse({ round: 1, score: 0.5, opponent: 'Doe' }).success).toBe(true);
    });

    it('rejects invalid score', () => {
      expect(resultSchema.safeParse({ round: 1, score: 2 }).success).toBe(false);
    });
  });

  describe('playerSchema', () => {
    const validPlayer = {
      name: 'Alice',
      elo: 1500,
      club: 'Hay Chess',
      results: [{ round: 1, score: 1 }],
      currentPoints: 1,
      ranking: 1,
      validated: [true],
    };

    it('accepts valid player', () => {
      expect(playerSchema.safeParse(validPlayer).success).toBe(true);
    });

    it('rejects player with empty name', () => {
      expect(playerSchema.safeParse({ ...validPlayer, name: '' }).success).toBe(false);
    });

    it('rejects negative elo', () => {
      expect(playerSchema.safeParse({ ...validPlayer, elo: -100 }).success).toBe(false);
    });
  });

  describe('pairingSchema', () => {
    const validPairing = {
      board: 1,
      whitePlayer: 'DUPONT JEAN',
      blackPlayer: 'MARTIN PAUL',
      whiteElo: 1600,
      blackElo: 1450,
      result: '1 - 0',
      whitePoints: 2,
      blackPoints: 1.5,
      isExempt: false,
    };

    it('accepts valid pairing', () => {
      expect(pairingSchema.safeParse(validPairing).success).toBe(true);
    });

    it('accepts pairing with empty result (unplayed)', () => {
      expect(pairingSchema.safeParse({ ...validPairing, result: '' }).success).toBe(true);
    });

    it('rejects board number 0', () => {
      expect(pairingSchema.safeParse({ ...validPairing, board: 0 }).success).toBe(false);
    });

    it('rejects negative board number', () => {
      expect(pairingSchema.safeParse({ ...validPairing, board: -1 }).success).toBe(false);
    });

    it('rejects empty whitePlayer', () => {
      expect(pairingSchema.safeParse({ ...validPairing, whitePlayer: '' }).success).toBe(false);
    });

    it('rejects negative elo', () => {
      expect(pairingSchema.safeParse({ ...validPairing, whiteElo: -100 }).success).toBe(false);
    });

    it('accepts zero elo (EXEMPT)', () => {
      expect(pairingSchema.safeParse({ ...validPairing, blackElo: 0 }).success).toBe(true);
    });
  });

  describe('tournamentSchema', () => {
    const validTournament = {
      id: 't1',
      name: 'Open A',
      url: 'https://echecs.asso.fr/Resultats.aspx?URL=abc',
      lastUpdate: '2024-01-01T00:00:00Z',
      players: [],
    };

    it('accepts valid tournament', () => {
      expect(tournamentSchema.safeParse(validTournament).success).toBe(true);
    });

    it('rejects invalid url', () => {
      expect(tournamentSchema.safeParse({ ...validTournament, url: 'not-a-url' }).success).toBe(false);
    });

    it('accepts tournament with pairings and pairingsRound', () => {
      const withPairings = {
        ...validTournament,
        pairings: [{
          board: 1, whitePlayer: 'A', blackPlayer: 'B',
          whiteElo: 1500, blackElo: 1400, result: '',
          whitePoints: 0, blackPoints: 0, isExempt: false,
        }],
        pairingsRound: 3,
      };
      expect(tournamentSchema.safeParse(withPairings).success).toBe(true);
    });

    it('accepts tournament without pairings (optional)', () => {
      expect(tournamentSchema.safeParse(validTournament).success).toBe(true);
    });

    it('rejects pairingsRound 0 (must be positive)', () => {
      expect(tournamentSchema.safeParse({ ...validTournament, pairingsRound: 0 }).success).toBe(false);
    });
  });

  describe('eventSchema', () => {
    const validEvent = {
      id: 'e1',
      name: 'Test Event',
      createdAt: '2024-01-01',
      tournaments: [],
    };

    it('accepts valid event', () => {
      expect(eventSchema.safeParse(validEvent).success).toBe(true);
    });

    it('rejects name shorter than 3 chars', () => {
      expect(eventSchema.safeParse({ ...validEvent, name: 'ab' }).success).toBe(false);
    });
  });

  describe('syncBodySchema', () => {
    const validBody = {
      clubSlug: 'hay-chess',
      events: [{ id: 'e1', name: 'Test', createdAt: '2024-01-01', tournaments: [] }],
      validations: {},
    };

    it('accepts valid sync body', () => {
      expect(syncBodySchema.safeParse(validBody).success).toBe(true);
    });

    it('accepts sync body with currentEventId', () => {
      expect(syncBodySchema.safeParse({ ...validBody, currentEventId: 'e1' }).success).toBe(true);
    });

    it('rejects missing events', () => {
      expect(syncBodySchema.safeParse({ clubSlug: 'hay-chess', validations: {} }).success).toBe(false);
    });

    it('rejects invalid clubSlug', () => {
      expect(syncBodySchema.safeParse({ ...validBody, clubSlug: 'INVALID!' }).success).toBe(false);
    });
  });
});
