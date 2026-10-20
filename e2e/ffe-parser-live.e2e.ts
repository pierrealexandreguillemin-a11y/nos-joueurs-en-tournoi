import { describe, it, expect, beforeAll } from 'vitest';
import {
  getStatsUrl, getListUrl, getResultsUrl, getRoundUrl,
  parseStatsClubs, parsePlayerClubs, parseResults, parsePairings,
} from '@/lib/parser';

// Canary on the LIVE echecs.asso.fr markup. Tournament 68994 is finished, so its numbers are
// frozen: any change below means FFE changed its HTML, not that the tournament moved.
// Same expectations as the saved fixtures (src/lib/parser.ffe-fixtures.test.ts); when this
// fails, save the new pages into src/lib/__fixtures__/ffe/ and fix the parser against them.
const URL = 'https://www.echecs.asso.fr/FicheTournoi.aspx?Ref=68994';
const CLUB = 'Marseille-Echecs';
const FFE_TIMEOUT_MS = 90_000; // FFE answers in ~10 s per page

const fetchPage = async (url: string) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (nos-joueurs-en-tournoi canary)' } });
  expect(res.status).toBe(200);
  return res.text();
};

describe('FFE live markup (68994)', () => {
  const pages = { stats: '', list: '', grid: '', round9: '' };

  beforeAll(async () => {
    [pages.stats, pages.list, pages.grid, pages.round9] = await Promise.all([
      fetchPage(getStatsUrl(URL)),
      fetchPage(getListUrl(URL)),
      fetchPage(getResultsUrl(URL)),
      fetchPage(getRoundUrl(URL, 9)),
    ]);
  }, FFE_TIMEOUT_MS);

  it('lists 8 clubs, Marseille-Echecs with 34 players', () => {
    const clubs = parseStatsClubs(pages.stats);
    expect(clubs).toHaveLength(8);
    expect(clubs.find(c => c.name === CLUB)?.playerCount).toBe(34);
  });

  it('reads one result row per club player, with performance', () => {
    const players = parseResults(pages.grid, parsePlayerClubs(pages.list), CLUB);
    expect(players).toHaveLength(34);
    expect(players[0]).toMatchObject({ name: 'BARTHEL MALO', performance: 2162 });
  });

  it('reads the 31 boards of round 9', () => {
    const pairings = parsePairings(pages.round9);
    expect(pairings).toHaveLength(31);
    expect(pairings[0]).toMatchObject({ board: 1, whitePlayer: 'BEN AMMAR LAURANS NAEL', result: '0 - 1' });
  });
});
