import { describe, it, expect } from 'vitest';
import {
  isValidFFeUrl,
  isValidTournamentUrl,
  isValidEventName,
  isValidTournament,
  isValidEvent,
  isValidTournamentName,
  SLUG_REGEX,
} from './validation';

describe('validation.ts', () => {
  // ── isValidFFeUrl ─────────────────────────────────────────────────────
  describe('isValidFFeUrl', () => {
    it('accepts a valid FFE URL', () => {
      expect(isValidFFeUrl('https://echecs.asso.fr/Resultats.aspx?URL=Tournois/Id/123')).toBe(true);
    });

    it('accepts FFE URL with path variations', () => {
      expect(isValidFFeUrl('https://echecs.asso.fr/some-page')).toBe(true);
    });

    it('accepts FFE URL with www. prefix', () => {
      expect(isValidFFeUrl('https://www.echecs.asso.fr/Resultats.aspx')).toBe(true);
    });

    it('rejects URLs from other domains', () => {
      expect(isValidFFeUrl('https://google.com')).toBe(false);
    });

    it('rejects malformed URLs', () => {
      expect(isValidFFeUrl('not-a-url')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidFFeUrl('')).toBe(false);
    });

    it('rejects URL with only spaces', () => {
      expect(isValidFFeUrl('   ')).toBe(false);
    });
  });

  // ── isValidTournamentUrl ──────────────────────────────────────────────
  describe('isValidTournamentUrl', () => {
    it('accepts a valid FFE tournament URL', () => {
      expect(isValidTournamentUrl('https://echecs.asso.fr/Resultats.aspx?URL=Tournois/Id/123')).toBe(true);
    });

    it('rejects empty string', () => {
      expect(isValidTournamentUrl('')).toBe(false);
    });

    it('rejects whitespace-only string', () => {
      expect(isValidTournamentUrl('   ')).toBe(false);
    });

    it('rejects non-FFE URL', () => {
      expect(isValidTournamentUrl('https://example.com/tournament')).toBe(false);
    });

    it('rejects malformed URL', () => {
      expect(isValidTournamentUrl('not-a-url')).toBe(false);
    });
  });

  // ── isValidEventName ──────────────────────────────────────────────────
  describe('isValidEventName', () => {
    it('accepts name with 3 characters', () => {
      expect(isValidEventName('abc')).toBe(true);
    });

    it('accepts long name', () => {
      expect(isValidEventName('Championnat de France 2024')).toBe(true);
    });

    it('rejects name with 2 characters', () => {
      expect(isValidEventName('ab')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidEventName('')).toBe(false);
    });

    it('rejects name that is only spaces (trims to 0 length)', () => {
      expect(isValidEventName('   ')).toBe(false);
    });

    it('rejects name that trims to 2 characters', () => {
      expect(isValidEventName('  ab  ')).toBe(false);
    });

    it('accepts name that trims to 3 characters', () => {
      expect(isValidEventName('  abc  ')).toBe(true);
    });
  });

  // ── isValidTournament ─────────────────────────────────────────────────
  describe('isValidTournament', () => {
    it('accepts a valid tournament', () => {
      expect(isValidTournament({
        name: 'U12',
        url: 'https://echecs.asso.fr/Resultats.aspx?URL=Tournois/Id/123',
      })).toBe(true);
    });

    it('rejects tournament without name', () => {
      expect(isValidTournament({
        url: 'https://echecs.asso.fr/Resultats.aspx?URL=Tournois/Id/123',
      })).toBe(false);
    });

    it('rejects tournament without url', () => {
      expect(isValidTournament({
        name: 'U12',
      })).toBe(false);
    });

    it('rejects tournament with invalid url', () => {
      expect(isValidTournament({
        name: 'U12',
        url: 'https://example.com',
      })).toBe(false);
    });

    it('rejects empty object', () => {
      expect(isValidTournament({})).toBe(false);
    });

    it('rejects tournament with empty name', () => {
      expect(isValidTournament({
        name: '',
        url: 'https://echecs.asso.fr/Resultats.aspx?URL=Tournois/Id/123',
      })).toBe(false);
    });
  });

  // ── isValidEvent ──────────────────────────────────────────────────────
  describe('isValidEvent', () => {
    it('accepts a valid event', () => {
      expect(isValidEvent({
        name: 'Open de Paris',
        tournaments: [
          {
            id: '1',
            name: 'U12',
            url: 'https://echecs.asso.fr/Resultats.aspx',
            lastUpdate: '2024-01-01',
            players: [],
          },
        ],
      })).toBe(true);
    });

    it('rejects event without name', () => {
      expect(isValidEvent({
        tournaments: [
          {
            id: '1',
            name: 'U12',
            url: 'https://echecs.asso.fr/Resultats.aspx',
            lastUpdate: '2024-01-01',
            players: [],
          },
        ],
      })).toBe(false);
    });

    it('rejects event with too short name (< 3 chars)', () => {
      expect(isValidEvent({
        name: 'ab',
        tournaments: [
          {
            id: '1',
            name: 'U12',
            url: 'https://echecs.asso.fr/Resultats.aspx',
            lastUpdate: '2024-01-01',
            players: [],
          },
        ],
      })).toBe(false);
    });

    it('rejects event without tournaments', () => {
      expect(isValidEvent({
        name: 'Open de Paris',
      })).toBe(false);
    });

    it('rejects event with empty tournaments array', () => {
      expect(isValidEvent({
        name: 'Open de Paris',
        tournaments: [],
      })).toBe(false);
    });

    it('rejects empty object', () => {
      expect(isValidEvent({})).toBe(false);
    });
  });

  // ── isValidTournamentName ─────────────────────────────────────────────
  describe('isValidTournamentName', () => {
    it('accepts name with 2 characters', () => {
      expect(isValidTournamentName('U8')).toBe(true);
    });

    it('accepts long name', () => {
      expect(isValidTournamentName('Open seniors 2024')).toBe(true);
    });

    it('rejects single character', () => {
      expect(isValidTournamentName('A')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidTournamentName('')).toBe(false);
    });

    it('rejects whitespace-only string', () => {
      expect(isValidTournamentName('   ')).toBe(false);
    });

    it('rejects name that trims to 1 character', () => {
      expect(isValidTournamentName('  A  ')).toBe(false);
    });

    it('accepts name that trims to 2 characters', () => {
      expect(isValidTournamentName('  U8  ')).toBe(true);
    });
  });

  // ── SLUG_REGEX ────────────────────────────────────────────────────────
  describe('SLUG_REGEX', () => {
    it('accepts lowercase alphanumeric with hyphens', () => {
      expect(SLUG_REGEX.test('hay-chess')).toBe(true);
    });

    it('accepts single character', () => {
      expect(SLUG_REGEX.test('a')).toBe(true);
    });

    it('accepts max 40 characters', () => {
      expect(SLUG_REGEX.test('a'.repeat(40))).toBe(true);
    });

    it('rejects over 40 characters', () => {
      expect(SLUG_REGEX.test('a'.repeat(41))).toBe(false);
    });

    it('rejects uppercase', () => {
      expect(SLUG_REGEX.test('Hay-Chess')).toBe(false);
    });

    it('rejects spaces', () => {
      expect(SLUG_REGEX.test('hay chess')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(SLUG_REGEX.test('')).toBe(false);
    });

    it('rejects special characters', () => {
      expect(SLUG_REGEX.test('hay_chess!')).toBe(false);
    });
  });
});
