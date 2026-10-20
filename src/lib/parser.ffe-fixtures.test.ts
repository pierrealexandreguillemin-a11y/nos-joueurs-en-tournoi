/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { parsePairings, parseFFePages, parseResults, parsePlayerClubs, parseStatsClubs, filterClubPairings } from './parser';
import round09Html from './__fixtures__/ffe/68994-round09.html?raw';
import gaHtml from './__fixtures__/ffe/68994-ga.html?raw';
import lsHtml from './__fixtures__/ffe/68994-ls.html?raw';
import statsHtml from './__fixtures__/ffe/68994-stats.html?raw';

// Real pages saved from echecs.asso.fr on 2026-10-20 (tournament 68994, 64 players, 9 rounds).
// Synthetic HTML let two parser bugs pass for months: these fixtures pin the actual FFE markup.
const FIXTURES: Record<string, string> = {
  '68994-round09.html': round09Html,
  '68994-ga.html': gaHtml,
  '68994-ls.html': lsHtml,
  '68994-stats.html': statsHtml,
};
const fixture = (name: string) => FIXTURES[name];

const CLUB = 'Marseille-Echecs';

describe('parser on real FFE pages (68994)', () => {
  describe('parsePairings — round 9', () => {
    const pairings = parsePairings(fixture('68994-round09.html'));

    it('reads every board, including the bye', () => {
      expect(pairings).toHaveLength(31);
    });

    it('reads board 1 with names, Elo, result and points', () => {
      expect(pairings[0]).toEqual({
        board: 1,
        whitePlayer: 'BEN AMMAR LAURANS NAEL',
        blackPlayer: 'BARTHEL MALO',
        whiteElo: 1745,
        blackElo: 1773,
        result: '0 - 1',
        whitePoints: 6,
        blackPoints: 7.5,
        isExempt: false,
      });
    });

    it('flags the last board as a bye', () => {
      expect(pairings[30]).toMatchObject({ board: 31, whitePlayer: 'EN NAKHLA LINA', isExempt: true, blackPlayer: 'EXEMPT' });
    });

    it('feeds the club pairings tab: names match the player list', () => {
      const clubPairings = filterClubPairings(pairings, parsePlayerClubs(fixture('68994-ls.html')), CLUB);
      // Board 1 opposes two club members: one entry per side
      expect(clubPairings.filter(p => p.board === 1).map(p => p.color)).toEqual(['white', 'black']);
      expect(clubPairings.find(p => p.clubPlayerName === 'BARTHEL MALO')).toEqual({
        board: 1, clubPlayerName: 'BARTHEL MALO', color: 'black',
        opponentName: 'BEN AMMAR LAURANS NAEL', opponentElo: 1745, result: '1 - 0', isExempt: false,
      });
      expect(clubPairings.map(p => p.clubPlayerName)).not.toContain('SUISSA ARTHUR');
      expect(clubPairings.length).toBeGreaterThan(20);
    });
  });

  describe('parseResults — american grid', () => {
    const playerClubMap = parsePlayerClubs(fixture('68994-ls.html'));
    const html = fixture('68994-ga.html');

    it('emits one row per club player, no layout-row duplicate', () => {
      const clubCount = parseStatsClubs(fixture('68994-stats.html')).find(c => c.name === CLUB)?.playerCount;
      expect(clubCount).toBe(34);
      expect(parseResults(html, playerClubMap, CLUB)).toHaveLength(34);
    });

    it('reads the performance of the first player of the grid', () => {
      const { players } = parseFFePages(fixture('68994-ls.html'), html, CLUB);
      expect(players[0]).toMatchObject({ name: 'BARTHEL MALO', ranking: 1, elo: 1773, currentPoints: 8.5, performance: 2162 });
    });

    it('reads a performance for every player who has one', () => {
      const { players } = parseFFePages(fixture('68994-ls.html'), html, CLUB);
      // SUISSA Arthur withdrew after round 1: the FFE grid shows Perf "0"
      expect(players.filter(p => p.performance === undefined).map(p => p.name)).toEqual(['SUISSA ARTHUR']);
    });
  });
});
