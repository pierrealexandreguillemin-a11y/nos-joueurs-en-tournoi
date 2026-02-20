import { describe, it, expect } from 'vitest';
import {
  formatPlayerName,
  formatElo,
  formatScore,
  formatPercentage,
  formatDate,
  formatDateTime,
  formatClubName,
  formatRound,
} from './formatters';

describe('formatters.ts', () => {
  // ── formatPlayerName ──────────────────────────────────────────────────
  describe('formatPlayerName', () => {
    it('converts to uppercase', () => {
      expect(formatPlayerName('jean dupont')).toBe('JEAN DUPONT');
    });

    it('trims leading and trailing spaces', () => {
      expect(formatPlayerName('  alice  ')).toBe('ALICE');
    });

    it('collapses multiple spaces into one', () => {
      expect(formatPlayerName('jean   dupont')).toBe('JEAN DUPONT');
    });

    it('handles already uppercase name', () => {
      expect(formatPlayerName('JEAN DUPONT')).toBe('JEAN DUPONT');
    });

    it('handles empty string', () => {
      expect(formatPlayerName('')).toBe('');
    });

    it('handles name with tabs and mixed whitespace', () => {
      expect(formatPlayerName(' jean\t  dupont ')).toBe('JEAN DUPONT');
    });
  });

  // ── formatElo ─────────────────────────────────────────────────────────
  describe('formatElo', () => {
    it('formats a valid ELO number', () => {
      expect(formatElo(1500)).toBe('1500');
    });

    it('returns "Non classe" for null', () => {
      expect(formatElo(null)).toBe('Non classé');
    });

    it('returns "Non classe" for 0 (falsy)', () => {
      // 0 is falsy in JS, so elo ? ... : ... will return "Non classé"
      expect(formatElo(0)).toBe('Non classé');
    });

    it('formats high ELO', () => {
      expect(formatElo(2800)).toBe('2800');
    });
  });

  // ── formatScore ───────────────────────────────────────────────────────
  describe('formatScore', () => {
    it('formats score as points/total', () => {
      expect(formatScore(3, 5)).toBe('3/5');
    });

    it('handles zero points and zero total', () => {
      expect(formatScore(0, 0)).toBe('0/0');
    });

    it('handles decimal points', () => {
      expect(formatScore(1.5, 3)).toBe('1.5/3');
    });
  });

  // ── formatPercentage ──────────────────────────────────────────────────
  describe('formatPercentage', () => {
    it('formats with one decimal place', () => {
      expect(formatPercentage(75)).toBe('75.0%');
    });

    it('formats zero', () => {
      expect(formatPercentage(0)).toBe('0.0%');
    });

    it('formats 100', () => {
      expect(formatPercentage(100)).toBe('100.0%');
    });

    it('formats decimal values', () => {
      expect(formatPercentage(33.33)).toBe('33.3%');
    });

    it('rounds to one decimal place', () => {
      expect(formatPercentage(66.666)).toBe('66.7%');
    });
  });

  // ── formatDate ────────────────────────────────────────────────────────
  describe('formatDate', () => {
    it('formats a Date object to French locale', () => {
      const date = new Date('2024-03-15T00:00:00');
      const result = formatDate(date);
      // French locale: "15 mars 2024"
      expect(result).toContain('15');
      expect(result).toContain('2024');
      expect(result.toLowerCase()).toContain('mars');
    });

    it('formats a date string to French locale', () => {
      const result = formatDate('2024-01-01T00:00:00');
      expect(result).toContain('2024');
      expect(result.toLowerCase()).toContain('janvier');
    });
  });

  // ── formatDateTime ────────────────────────────────────────────────────
  describe('formatDateTime', () => {
    it('formats a Date object to French locale with time', () => {
      const date = new Date('2024-03-15T14:30:00');
      const result = formatDateTime(date);
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('formats a date string', () => {
      const result = formatDateTime('2024-06-20T10:00:00');
      expect(result).toContain('2024');
    });
  });

  // ── formatClubName ────────────────────────────────────────────────────
  describe('formatClubName', () => {
    it('trims whitespace', () => {
      expect(formatClubName('  Hay Chess  ')).toBe('Hay Chess');
    });

    it('handles empty string', () => {
      expect(formatClubName('')).toBe('');
    });

    it('handles already trimmed name', () => {
      expect(formatClubName('Hay Chess')).toBe('Hay Chess');
    });
  });

  // ── formatRound ───────────────────────────────────────────────────────
  describe('formatRound', () => {
    it('formats round 1 as "1ere ronde"', () => {
      expect(formatRound(1)).toBe('1ère ronde');
    });

    it('formats round 2 as "2eme ronde"', () => {
      expect(formatRound(2)).toBe('2ème ronde');
    });

    it('formats round 10 as "10eme ronde"', () => {
      expect(formatRound(10)).toBe('10ème ronde');
    });
  });
});
