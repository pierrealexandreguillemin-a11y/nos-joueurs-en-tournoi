import { describe, it, expect } from 'vitest';
import {
  calculateTotalPoints,
  calculatePercentage,
  calculatePerformance,
  sortPlayersByScore,
  calculateAverageElo,
  calculateResultStats,
  calculateGamesPlayed,
} from './calculations';
import type { Player, Result } from '@/types';

// Helper to build a minimal Player object for testing
function makePlayer(overrides: Partial<Player>): Player {
  return {
    name: 'Default Player',
    elo: 1500,
    club: 'Test Club',
    ranking: 1,
    results: [],
    currentPoints: 0,
    validated: [],
    ...overrides,
  };
}

describe('calculations.ts', () => {
  // ── calculateTotalPoints ──────────────────────────────────────────────
  describe('calculateTotalPoints', () => {
    it('sums scores from results', () => {
      const results: Result[] = [
        { round: 1, score: 1 },
        { round: 2, score: 0.5 },
        { round: 3, score: 0 },
      ];
      expect(calculateTotalPoints(results)).toBe(1.5);
    });

    it('returns 0 for an empty array', () => {
      expect(calculateTotalPoints([])).toBe(0);
    });

    it('handles all wins', () => {
      const results: Result[] = [
        { round: 1, score: 1 },
        { round: 2, score: 1 },
        { round: 3, score: 1 },
      ];
      expect(calculateTotalPoints(results)).toBe(3);
    });

    it('handles all draws', () => {
      const results: Result[] = [
        { round: 1, score: 0.5 },
        { round: 2, score: 0.5 },
      ];
      expect(calculateTotalPoints(results)).toBe(1);
    });

    it('handles all losses', () => {
      const results: Result[] = [
        { round: 1, score: 0 },
        { round: 2, score: 0 },
      ];
      expect(calculateTotalPoints(results)).toBe(0);
    });
  });

  // ── calculatePercentage ───────────────────────────────────────────────
  describe('calculatePercentage', () => {
    it('calculates percentage correctly', () => {
      expect(calculatePercentage(3, 4)).toBe(75);
    });

    it('returns 0 when total is 0', () => {
      expect(calculatePercentage(0, 0)).toBe(0);
    });

    it('returns 100 for perfect score', () => {
      expect(calculatePercentage(5, 5)).toBe(100);
    });

    it('returns 0 for zero points with non-zero total', () => {
      expect(calculatePercentage(0, 10)).toBe(0);
    });

    it('rounds to nearest integer', () => {
      // 1/3 = 33.333... rounds to 33
      expect(calculatePercentage(1, 3)).toBe(33);
      // 2/3 = 66.666... rounds to 67
      expect(calculatePercentage(2, 3)).toBe(67);
    });
  });

  // ── calculatePerformance ──────────────────────────────────────────────
  describe('calculatePerformance', () => {
    it('calculates performance correctly', () => {
      expect(calculatePerformance(3, 4)).toBe(75);
    });

    it('returns 0 when totalGames is 0', () => {
      expect(calculatePerformance(0, 0)).toBe(0);
    });

    it('returns 100 for perfect score', () => {
      expect(calculatePerformance(5, 5)).toBe(100);
    });

    it('returns 0 for zero points', () => {
      expect(calculatePerformance(0, 5)).toBe(0);
    });

    it('rounds to nearest integer', () => {
      expect(calculatePerformance(1, 3)).toBe(33);
    });
  });

  // ── sortPlayersByScore ────────────────────────────────────────────────
  describe('sortPlayersByScore', () => {
    it('sorts by currentPoints descending', () => {
      const players = [
        makePlayer({ name: 'Low', currentPoints: 1 }),
        makePlayer({ name: 'High', currentPoints: 3 }),
        makePlayer({ name: 'Mid', currentPoints: 2 }),
      ];

      const sorted = sortPlayersByScore(players);
      expect(sorted.map(p => p.name)).toEqual(['High', 'Mid', 'Low']);
    });

    it('uses ELO as tiebreaker when points are equal', () => {
      const players = [
        makePlayer({ name: 'LowElo', currentPoints: 2, elo: 1200 }),
        makePlayer({ name: 'HighElo', currentPoints: 2, elo: 1800 }),
      ];

      const sorted = sortPlayersByScore(players);
      expect(sorted.map(p => p.name)).toEqual(['HighElo', 'LowElo']);
    });

    it('uses name alphabetically as final tiebreaker', () => {
      const players = [
        makePlayer({ name: 'Charlie', currentPoints: 2, elo: 1500 }),
        makePlayer({ name: 'Alice', currentPoints: 2, elo: 1500 }),
        makePlayer({ name: 'Bob', currentPoints: 2, elo: 1500 }),
      ];

      const sorted = sortPlayersByScore(players);
      expect(sorted.map(p => p.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('does not mutate the original array', () => {
      const players = [
        makePlayer({ name: 'B', currentPoints: 1 }),
        makePlayer({ name: 'A', currentPoints: 2 }),
      ];
      const original = [...players];
      sortPlayersByScore(players);
      expect(players[0].name).toBe(original[0].name);
    });

    it('returns empty array for empty input', () => {
      expect(sortPlayersByScore([])).toEqual([]);
    });

    it('handles single player', () => {
      const players = [makePlayer({ name: 'Solo' })];
      const sorted = sortPlayersByScore(players);
      expect(sorted).toHaveLength(1);
      expect(sorted[0].name).toBe('Solo');
    });
  });

  // ── calculateAverageElo ───────────────────────────────────────────────
  describe('calculateAverageElo', () => {
    it('calculates average ELO for players with ELO', () => {
      const players = [
        makePlayer({ elo: 1400 }),
        makePlayer({ elo: 1600 }),
      ];
      expect(calculateAverageElo(players)).toBe(1500);
    });

    it('returns 0 for empty array', () => {
      expect(calculateAverageElo([])).toBe(0);
    });

    it('excludes players without ELO (elo = 0)', () => {
      const players = [
        makePlayer({ elo: 1500 }),
        makePlayer({ elo: 0 }),
      ];
      // elo 0 is falsy, so only 1500 counts
      expect(calculateAverageElo(players)).toBe(1500);
    });

    it('rounds to nearest integer', () => {
      const players = [
        makePlayer({ elo: 1501 }),
        makePlayer({ elo: 1502 }),
      ];
      // (1501 + 1502) / 2 = 1501.5 -> rounds to 1502
      expect(calculateAverageElo(players)).toBe(1502);
    });

    it('handles single player', () => {
      const players = [makePlayer({ elo: 1234 })];
      expect(calculateAverageElo(players)).toBe(1234);
    });
  });

  // ── calculateResultStats ──────────────────────────────────────────────
  describe('calculateResultStats', () => {
    it('counts wins, draws, and losses correctly', () => {
      const results: Result[] = [
        { round: 1, score: 1 },
        { round: 2, score: 0.5 },
        { round: 3, score: 0 },
        { round: 4, score: 1 },
        { round: 5, score: 0 },
      ];

      expect(calculateResultStats(results)).toEqual({
        wins: 2,
        draws: 1,
        losses: 2,
      });
    });

    it('returns all zeros for empty results', () => {
      expect(calculateResultStats([])).toEqual({
        wins: 0,
        draws: 0,
        losses: 0,
      });
    });

    it('handles all wins', () => {
      const results: Result[] = [
        { round: 1, score: 1 },
        { round: 2, score: 1 },
      ];
      expect(calculateResultStats(results)).toEqual({
        wins: 2,
        draws: 0,
        losses: 0,
      });
    });

    it('handles all draws', () => {
      const results: Result[] = [
        { round: 1, score: 0.5 },
        { round: 2, score: 0.5 },
      ];
      expect(calculateResultStats(results)).toEqual({
        wins: 0,
        draws: 2,
        losses: 0,
      });
    });

    it('handles all losses', () => {
      const results: Result[] = [
        { round: 1, score: 0 },
        { round: 2, score: 0 },
      ];
      expect(calculateResultStats(results)).toEqual({
        wins: 0,
        draws: 0,
        losses: 2,
      });
    });
  });

  // ── calculateGamesPlayed ──────────────────────────────────────────────
  describe('calculateGamesPlayed', () => {
    it('returns the number of results', () => {
      const results: Result[] = [
        { round: 1, score: 1 },
        { round: 2, score: 0 },
        { round: 3, score: 0.5 },
      ];
      expect(calculateGamesPlayed(results)).toBe(3);
    });

    it('returns 0 for empty results', () => {
      expect(calculateGamesPlayed([])).toBe(0);
    });

    it('returns 1 for single result', () => {
      const results: Result[] = [{ round: 1, score: 1 }];
      expect(calculateGamesPlayed(results)).toBe(1);
    });
  });
});
