import { describe, it, expect } from 'vitest';
import {
  parsePlayerClubs,
  parseResults,
  parseFFePages,
  detectCurrentRound,
  calculateClubStats,
  getListUrl,
  getStatsUrl,
  getRoundUrl,
  parseStatsClubs,
  parsePairings,
  filterClubPairings,
  invertResult,
} from './parser';

describe('parser.ts', () => {
  describe('getListUrl', () => {
    it('converts Action=Ga to Action=Ls', () => {
      const input = 'https://echecs.asso.fr/Tournaments.aspx?Action=Ga&id=123';
      const expected = 'https://echecs.asso.fr/Tournaments.aspx?Action=Ls&id=123';
      expect(getListUrl(input)).toBe(expected);
    });
  });

  describe('parsePlayerClubs', () => {
    it('extracts player clubs from HTML', () => {
      const html = `
        <table>
          <tr>
            <td>1</td>
            <td>&nbsp;</td>
            <td>BACHKAT  Fares</td>
            <td>1541</td>
            <td></td>
            <td></td>
            <td></td>
            <td>Hay Chess</td>
          </tr>
          <tr>
            <td>2</td>
            <td>&nbsp;</td>
            <td>DUPONT Jean</td>
            <td>1600</td>
            <td></td>
            <td></td>
            <td></td>
            <td>Other Club</td>
          </tr>
        </table>
      `;

      const result = parsePlayerClubs(html);

      expect(result.get('BACHKAT FARES')).toBe('Hay Chess');
      expect(result.get('DUPONT JEAN')).toBe('Other Club');
      expect(result.size).toBe(2);
    });

    it('handles empty HTML', () => {
      const result = parsePlayerClubs('<html></html>');
      expect(result.size).toBe(0);
    });

    it('normalizes player names (uppercase, single spaces)', () => {
      const html = `
        <table>
          <tr>
            <td>1</td>
            <td>&nbsp;</td>
            <td>bachkat    fares</td>
            <td>1541</td>
            <td></td>
            <td></td>
            <td></td>
            <td>Hay Chess</td>
          </tr>
        </table>
      `;

      const result = parsePlayerClubs(html);
      expect(result.get('BACHKAT FARES')).toBe('Hay Chess');
    });
  });

  // Helper: generate FFE-style HTML with div.papi_joueur_box structure
  // This matches the real FFE HTML structure the parser expects
  function makeFFEPlayerRow(name: string, ranking: number, elo: string, points: string, tr: string, buch: string, rounds: string[][]) {
    // rounds: array of [roundNum, score, ...padding..., opponentName] (13-cell rows) or fewer for byes
    const roundRows = rounds.map(r => {
      if (r.length >= 6) {
        const cells = r.map(c => `<td>${c}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }
      const cells = r.map(c => `<td>${c}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `
      <tr>
        <td>
          <div class="papi_joueur_box">
            <b>${name}</b>
            <table>
              <tr>
                <td></td><td>${ranking}</td><td></td><td></td><td>${elo}</td>
                <td></td><td></td><td></td><td>${points}</td><td>${tr}</td><td>${buch}</td>
              </tr>
              ${roundRows}
            </table>
          </div>
        </td>
        <td>1600</td>
      </tr>
    `;
  }

  describe('parseResults', () => {
    it('filters players by club', () => {
      const htmlResults = `<table>
        ${makeFFEPlayerRow('BACHKAT FARES', 1, '1541 F', '1.5', '12.5', '30', [
          ['1', '', '1', '', '', 'Opponent A', '', '', '', '', '', '', ''],
          ['2', '', '½', '', '', 'Opponent B', '', '', '', '', '', '', ''],
        ])}
        ${makeFFEPlayerRow('DUPONT JEAN', 2, '1600', '1.5', '13', '28', [
          ['1', '', '1', '', '', 'Opponent C', '', '', '', '', '', '', ''],
        ])}
      </table>`;

      const playerClubMap = new Map([
        ['BACHKAT FARES', 'Mon Club'],
        ['DUPONT JEAN', 'Other Club'],
      ]);

      const results = parseResults(htmlResults, playerClubMap, 'Mon Club');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('BACHKAT FARES');
      expect(results[0].club).toBe('Mon Club');
      expect(results[0].elo).toBe(1541);
      expect(results[0].ranking).toBe(1);
      expect(results[0].currentPoints).toBe(1.5);
      expect(results[0].results).toHaveLength(2);
    });

    it('parses round results correctly', () => {
      const htmlResults = `<table>
        ${makeFFEPlayerRow('TEST PLAYER', 1, '1500', '1.5', '10', '25', [
          ['1', '', '1', '', '', 'Opp1', '', '', '', '', '', '', ''],
          ['2', '', '0', '', '', 'Opp2', '', '', '', '', '', '', ''],
          ['3', '', '½', '', '', 'Opp3', '', '', '', '', '', '', ''],
        ])}
      </table>`;

      const playerClubMap = new Map([['TEST PLAYER', 'Mon Club']]);
      const results = parseResults(htmlResults, playerClubMap, 'Mon Club');

      expect(results[0].results).toEqual([
        { round: 1, score: 1, opponent: 'Opp1' },
        { round: 2, score: 0, opponent: 'Opp2' },
        { round: 3, score: 0.5, opponent: 'Opp3' },
      ]);
    });

    it('returns empty array when no players match club', () => {
      const htmlResults = `<table>
        ${makeFFEPlayerRow('DUPONT JEAN', 1, '1600', '0', '0', '0', [])}
      </table>`;

      const playerClubMap = new Map([['DUPONT JEAN', 'Other Club']]);
      const results = parseResults(htmlResults, playerClubMap, 'Mon Club');

      expect(results).toHaveLength(0);
    });
  });

  describe('parseFFePages', () => {
    it('integrates parsePlayerClubs and parseResults', () => {
      const htmlList = `
        <table>
          <tr>
            <td>1</td><td>&nbsp;</td><td>PLAYER ONE</td><td>1500</td>
            <td></td><td></td><td></td><td>Mon Club</td>
          </tr>
        </table>
      `;

      const htmlResults = `<table>
        ${makeFFEPlayerRow('PLAYER ONE', 1, '1500', '1', '5', '20', [
          ['1', '', '1', '', '', 'Opp1', '', '', '', '', '', '', ''],
        ])}
      </table>`;

      const { players, currentRound } = parseFFePages(htmlList, htmlResults, 'Mon Club');

      expect(players).toHaveLength(1);
      expect(players[0].name).toBe('PLAYER ONE');
      expect(players[0].club).toBe('Mon Club');
      expect(currentRound).toBe(1);
    });
  });

  describe('detectCurrentRound', () => {
    it('detects max round from player results', () => {
      const players = [
        {
          name: 'Player 1',
          elo: 1500,
          club: 'Test Club',
          ranking: 1,
          results: [
            { round: 1, score: 1 as const, opponent: '2' },
            { round: 2, score: 0.5 as const, opponent: '3' },
          ],
          currentPoints: 1.5,
          validated: [false, false],
        },
        {
          name: 'Player 2',
          elo: 1450,
          club: 'Test Club',
          ranking: 2,
          results: [
            { round: 1, score: 0 as const, opponent: '1' },
            { round: 2, score: 1 as const, opponent: '4' },
            { round: 3, score: 0.5 as const, opponent: '5' },
          ],
          currentPoints: 1.5,
          validated: [false, false, false],
        },
      ];

      expect(detectCurrentRound(players)).toBe(3);
    });

    it('returns 0 for empty players array', () => {
      expect(detectCurrentRound([])).toBe(0);
    });
  });

  describe('calculateClubStats', () => {
    it('calculates stats correctly', () => {
      const players = [
        {
          name: 'Player 1',
          elo: 1500,
          club: 'Test Club',
          ranking: 1,
          results: [
            { round: 1, score: 1 as const, opponent: '2' },
            { round: 2, score: 0.5 as const, opponent: '3' },
          ],
          currentPoints: 1.5,
          validated: [false, false],
        },
        {
          name: 'Player 2',
          elo: 1450,
          club: 'Test Club',
          ranking: 2,
          results: [
            { round: 1, score: 0 as const, opponent: '1' },
            { round: 2, score: 1 as const, opponent: '4' },
          ],
          currentPoints: 1,
          validated: [false, false],
        },
      ];

      const stats = calculateClubStats(players, 2);

      expect(stats.round).toBe(2);
      expect(stats.playerCount).toBe(2);
      expect(stats.totalPoints).toBe(2.5);
      expect(stats.averagePoints).toBe(1.25);
    });

    it('returns zero stats for empty players', () => {
      const stats = calculateClubStats([], 1);

      expect(stats).toEqual({
        round: 1,
        totalPoints: 0,
        playerCount: 0,
        averagePoints: 0,
      });
    });

    it('only counts points up to specified round', () => {
      const players = [
        {
          name: 'Player 1',
          elo: 1500,
          club: 'Test Club',
          ranking: 1,
          results: [
            { round: 1, score: 1 as const, opponent: '2' },
            { round: 2, score: 1 as const, opponent: '3' },
            { round: 3, score: 1 as const, opponent: '4' },
          ],
          currentPoints: 3,
          validated: [false, false, false],
        },
      ];

      const stats = calculateClubStats(players, 2);

      expect(stats.totalPoints).toBe(2);
      expect(stats.averagePoints).toBe(2);
    });
  });

  describe('getStatsUrl', () => {
    it('converts tournament URL to Stats URL', () => {
      const input = 'https://www.echecs.asso.fr/Resultats.aspx?URL=Tournois/Id/68994/68994&Action=Ga';
      const expected = 'https://www.echecs.asso.fr/Resultats.aspx?URL=Tournois/Id/68994/68994&Action=Stats';
      expect(getStatsUrl(input)).toBe(expected);
    });

    it('returns original URL when no tournament ID found', () => {
      const input = 'https://example.com/no-id';
      expect(getStatsUrl(input)).toBe(input);
    });
  });

  describe('parseStatsClubs', () => {
    it('extracts clubs from Stats HTML with papi_liste structure', () => {
      const html = `
        <table>
          <tr class="papi_liste_t"><td>Répartition par clubs</td></tr>
          <tr class="papi_liste_t"><td>8 clubs représentés</td></tr>
          <tr><td class="papi_liste_c">Hay Chess</td><td class="papi_liste_c">5</td></tr>
          <tr><td class="papi_liste_c">Marseille-Echecs</td><td class="papi_liste_c">3</td></tr>
          <tr><td class="papi_liste_c">Lyon-Echecs</td><td class="papi_liste_c">2</td></tr>
          <tr class="papi_liste_t"><td>Another section</td></tr>
        </table>
      `;

      const clubs = parseStatsClubs(html);

      expect(clubs).toHaveLength(3);
      expect(clubs[0]).toEqual({ name: 'Hay Chess', playerCount: 5 });
      expect(clubs[1]).toEqual({ name: 'Marseille-Echecs', playerCount: 3 });
      expect(clubs[2]).toEqual({ name: 'Lyon-Echecs', playerCount: 2 });
    });

    it('returns empty array for HTML without clubs section', () => {
      const html = '<html><body><table></table></body></html>';
      expect(parseStatsClubs(html)).toEqual([]);
    });

    it('handles "partition par clubs" variant', () => {
      const html = `
        <table>
          <tr class="papi_liste_t"><td>partition par clubs</td></tr>
          <tr><td class="papi_liste_c">Club A</td><td class="papi_liste_c">4</td></tr>
          <tr class="papi_liste_t"><td>Other</td></tr>
        </table>
      `;

      const clubs = parseStatsClubs(html);
      expect(clubs).toHaveLength(1);
      expect(clubs[0].name).toBe('Club A');
    });

    it('strips trailing colons from names and counts', () => {
      const html = `
        <table>
          <tr class="papi_liste_t"><td>Répartition par clubs</td></tr>
          <tr><td class="papi_liste_c">Club A :</td><td class="papi_liste_c">4 :</td></tr>
          <tr class="papi_liste_t"><td>Other</td></tr>
        </table>
      `;

      const clubs = parseStatsClubs(html);
      expect(clubs[0]).toEqual({ name: 'Club A', playerCount: 4 });
    });
  });

  describe('getRoundUrl', () => {
    it('converts tournament URL to round 1 URL (Action=01)', () => {
      const input = 'https://www.echecs.asso.fr/Resultats.aspx?URL=Tournois/Id/68994/68994&Action=Ga';
      const expected = 'https://www.echecs.asso.fr/Resultats.aspx?URL=Tournois/Id/68994/68994&Action=01';
      expect(getRoundUrl(input, 1)).toBe(expected);
    });

    it('converts tournament URL to round 9 URL (Action=09)', () => {
      const input = 'https://www.echecs.asso.fr/FicheTournoi.aspx?Ref=68994';
      const expected = 'https://www.echecs.asso.fr/Resultats.aspx?URL=Tournois/Id/68994/68994&Action=09';
      expect(getRoundUrl(input, 9)).toBe(expected);
    });

    it('returns original URL when no tournament ID found', () => {
      const input = 'https://example.com/no-id';
      expect(getRoundUrl(input, 1)).toBe(input);
    });
  });

  describe('parsePairings', () => {
    function makePairingHTML(rows: string[][]): string {
      const trs = rows.map(cells => {
        const tds = cells.map(c => `<td class="papi_liste_c">${c}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      return `<table>${trs}</table>`;
    }

    it('parses standard 8-column pairing rows', () => {
      const html = makePairingHTML([
        ['1', '2', 'DUPONT JEAN', '1600 F', '1 - 0', 'MARTIN PAUL', '1450', '1.5'],
        ['2', '1.5', 'DURAND MARIE', '1500', '', 'BERNARD LUC', '1400', '2'],
      ]);

      const pairings = parsePairings(html);

      expect(pairings).toHaveLength(2);
      expect(pairings[0].board).toBe(1);
      expect(pairings[0].whitePlayer).toBe('DUPONT JEAN');
      expect(pairings[0].whiteElo).toBe(1600);
      expect(pairings[0].blackPlayer).toBe('MARTIN PAUL');
      expect(pairings[0].blackElo).toBe(1450);
      expect(pairings[0].result).toBe('1 - 0');
      expect(pairings[0].whitePoints).toBe(2);
      expect(pairings[0].blackPoints).toBe(1.5);
      expect(pairings[0].isExempt).toBe(false);
    });

    it('detects EXEMPT player', () => {
      const html = makePairingHTML([
        ['3', '1', 'LEFEBVRE ALICE', '1300', '', 'EXEMPT', '0', '0'],
      ]);

      const pairings = parsePairings(html);

      expect(pairings).toHaveLength(1);
      expect(pairings[0].isExempt).toBe(true);
      expect(pairings[0].blackPlayer).toBe('EXEMPT');
      expect(pairings[0].blackElo).toBe(0);
    });

    it('returns empty array for HTML without pairing data', () => {
      const html = '<html><body><p>No data</p></body></html>';
      expect(parsePairings(html)).toEqual([]);
    });

    it('parses results that have been played (non-empty result)', () => {
      const html = makePairingHTML([
        ['1', '0', 'PLAYER A', '1500', '1/2 - 1/2', 'PLAYER B', '1600', '0'],
      ]);

      const pairings = parsePairings(html);
      expect(pairings[0].result).toBe('1/2 - 1/2');
    });

    it('parses unplayed pairings (empty result)', () => {
      const html = makePairingHTML([
        ['1', '0', 'PLAYER A', '1500', '', 'PLAYER B', '1600', '0'],
      ]);

      const pairings = parsePairings(html);
      expect(pairings[0].result).toBe('');
    });

    it('handles mixed papi_liste_f and papi_liste_c classes', () => {
      const html = `<table><tr>
        <td class="papi_liste_f">1</td>
        <td class="papi_liste_c">0</td>
        <td class="papi_liste_f">PLAYER A</td>
        <td class="papi_liste_c">1500</td>
        <td class="papi_liste_f"></td>
        <td class="papi_liste_c">PLAYER B</td>
        <td class="papi_liste_f">1600</td>
        <td class="papi_liste_c">0</td>
      </tr></table>`;

      const pairings = parsePairings(html);
      expect(pairings).toHaveLength(1);
      expect(pairings[0].whitePlayer).toBe('PLAYER A');
    });

    it('skips rows with fewer than 8 cells', () => {
      const html = `<table>
        <tr><td class="papi_liste_c">Header</td></tr>
        <tr>
          <td class="papi_liste_c">1</td>
          <td class="papi_liste_c">0</td>
          <td class="papi_liste_c">PLAYER A</td>
          <td class="papi_liste_c">1500</td>
          <td class="papi_liste_c"></td>
          <td class="papi_liste_c">PLAYER B</td>
          <td class="papi_liste_c">1600</td>
          <td class="papi_liste_c">0</td>
        </tr>
      </table>`;

      const pairings = parsePairings(html);
      expect(pairings).toHaveLength(1);
    });

    it('handles half points with ½ symbol', () => {
      const html = makePairingHTML([
        ['1', '2½', 'PLAYER A', '1500', '', 'PLAYER B', '1600', '1½'],
      ]);

      const pairings = parsePairings(html);
      expect(pairings[0].whitePoints).toBe(2.5);
      expect(pairings[0].blackPoints).toBe(1.5);
    });

    it('parses realistic FFE HTML with nested tags, &nbsp;, font, b elements', () => {
      // Simulates real FFE output with <b>, <font>, &nbsp; and mixed classes
      const html = `<table>
        <tr class="papi_liste_t">
          <td class="papi_liste_c" colspan="8"><b>Ronde 3</b></td>
        </tr>
        <tr>
          <td class="papi_liste_f"><b>1</b></td>
          <td class="papi_liste_c">&nbsp;2½&nbsp;</td>
          <td class="papi_liste_f"><font color="#000000"><b>DUPONT&nbsp;&nbsp;Jean</b></font></td>
          <td class="papi_liste_c"><font color="#808080">1541 F</font></td>
          <td class="papi_liste_f"><b>1 - 0</b></td>
          <td class="papi_liste_c"><font color="#000000">MARTIN&nbsp;Paul</font></td>
          <td class="papi_liste_f"><font color="#808080">1450</font></td>
          <td class="papi_liste_c">&nbsp;1½</td>
        </tr>
        <tr>
          <td class="papi_liste_c">2</td>
          <td class="papi_liste_f">1</td>
          <td class="papi_liste_c"><span>LEFEBVRE  Alice</span></td>
          <td class="papi_liste_f">1300</td>
          <td class="papi_liste_c"></td>
          <td class="papi_liste_f">EXEMPT</td>
          <td class="papi_liste_c">0</td>
          <td class="papi_liste_f">0</td>
        </tr>
      </table>`;

      const pairings = parsePairings(html);

      expect(pairings).toHaveLength(2);

      // Row 1: nested <b>, <font>, &nbsp;
      expect(pairings[0].board).toBe(1);
      expect(pairings[0].whitePlayer).toBe('DUPONT JEAN');
      expect(pairings[0].whiteElo).toBe(1541);
      expect(pairings[0].result).toBe('1 - 0');
      expect(pairings[0].blackPlayer).toBe('MARTIN PAUL');
      expect(pairings[0].blackElo).toBe(1450);
      expect(pairings[0].whitePoints).toBe(2.5);
      expect(pairings[0].blackPoints).toBe(1.5);
      expect(pairings[0].isExempt).toBe(false);

      // Row 2: EXEMPT with <span>
      expect(pairings[1].board).toBe(2);
      expect(pairings[1].whitePlayer).toBe('LEFEBVRE ALICE');
      expect(pairings[1].isExempt).toBe(true);
      expect(pairings[1].blackPlayer).toBe('EXEMPT');
    });
  });

  describe('invertResult', () => {
    it('inverts "1 - 0" to "0 - 1"', () => {
      expect(invertResult('1 - 0')).toBe('0 - 1');
    });

    it('inverts "0 - 1" to "1 - 0"', () => {
      expect(invertResult('0 - 1')).toBe('1 - 0');
    });

    it('keeps "1/2 - 1/2" unchanged', () => {
      expect(invertResult('1/2 - 1/2')).toBe('1/2 - 1/2');
    });

    it('returns empty string for empty result', () => {
      expect(invertResult('')).toBe('');
    });

    it('returns as-is for malformed result without separator', () => {
      expect(invertResult('forfait')).toBe('forfait');
    });
  });

  describe('filterClubPairings', () => {
    const pairings = [
      {
        board: 1,
        whitePlayer: 'DUPONT JEAN',
        blackPlayer: 'MARTIN PAUL',
        whiteElo: 1600,
        blackElo: 1450,
        result: '1 - 0',
        whitePoints: 2,
        blackPoints: 1.5,
        isExempt: false,
      },
      {
        board: 2,
        whitePlayer: 'BERNARD LUC',
        blackPlayer: 'DURAND MARIE',
        whiteElo: 1400,
        blackElo: 1500,
        result: '0 - 1',
        whitePoints: 1,
        blackPoints: 2,
        isExempt: false,
      },
      {
        board: 3,
        whitePlayer: 'LEFEBVRE ALICE',
        blackPlayer: 'EXEMPT',
        whiteElo: 1300,
        blackElo: 0,
        result: '',
        whitePoints: 1,
        blackPoints: 0,
        isExempt: true,
      },
    ];

    it('filters white player from club with correct result', () => {
      const map = new Map([
        ['DUPONT JEAN', 'Mon Club'],
        ['MARTIN PAUL', 'Other Club'],
      ]);

      const result = filterClubPairings(pairings, map, 'Mon Club');

      expect(result).toHaveLength(1);
      expect(result[0].clubPlayerName).toBe('DUPONT JEAN');
      expect(result[0].color).toBe('white');
      expect(result[0].opponentName).toBe('MARTIN PAUL');
      expect(result[0].opponentElo).toBe(1450);
      expect(result[0].result).toBe('1 - 0'); // White perspective: unchanged
    });

    it('filters black player from club and inverts result', () => {
      const map = new Map([
        ['BERNARD LUC', 'Other Club'],
        ['DURAND MARIE', 'Mon Club'],
      ]);

      const result = filterClubPairings(pairings, map, 'Mon Club');

      expect(result).toHaveLength(1);
      expect(result[0].clubPlayerName).toBe('DURAND MARIE');
      expect(result[0].color).toBe('black');
      expect(result[0].opponentName).toBe('BERNARD LUC');
      expect(result[0].opponentElo).toBe(1400);
      expect(result[0].result).toBe('1 - 0'); // Original "0 - 1" inverted to black's perspective
    });

    it('handles two club players facing each other (both perspectives, results inverted for black)', () => {
      const map = new Map([
        ['DUPONT JEAN', 'Mon Club'],
        ['MARTIN PAUL', 'Mon Club'],
      ]);

      const result = filterClubPairings(pairings, map, 'Mon Club');

      // Both players appear: white and black perspective on the same board
      expect(result).toHaveLength(2);
      expect(result[0].clubPlayerName).toBe('DUPONT JEAN');
      expect(result[0].color).toBe('white');
      expect(result[0].result).toBe('1 - 0'); // White won
      expect(result[1].clubPlayerName).toBe('MARTIN PAUL');
      expect(result[1].color).toBe('black');
      expect(result[1].result).toBe('0 - 1'); // Black lost (inverted from "1 - 0")
      expect(result[0].board).toBe(result[1].board);
    });

    it('handles EXEMPT pairing', () => {
      const map = new Map([
        ['LEFEBVRE ALICE', 'Mon Club'],
      ]);

      const result = filterClubPairings(pairings, map, 'Mon Club');

      expect(result).toHaveLength(1);
      expect(result[0].isExempt).toBe(true);
      expect(result[0].opponentName).toBe('EXEMPT');
      expect(result[0].opponentElo).toBe(0);
    });

    it('sorts results by board number', () => {
      const map = new Map([
        ['DURAND MARIE', 'Mon Club'],
        ['DUPONT JEAN', 'Mon Club'],
        ['LEFEBVRE ALICE', 'Mon Club'],
      ]);

      const result = filterClubPairings(pairings, map, 'Mon Club');

      expect(result.map(p => p.board)).toEqual([1, 2, 3]);
    });

    it('returns empty array when no club players found', () => {
      const map = new Map([
        ['NOBODY', 'Mon Club'],
      ]);

      const result = filterClubPairings(pairings, map, 'Mon Club');
      expect(result).toEqual([]);
    });
  });

  describe('parseResults — QG-8: invariance FFE', () => {
    it('le filtrage par clubName est indépendant du slug namespace', () => {
      // The FFE clubName "Hay Chess" should work regardless of what slug is used for storage
      const htmlResults = `<table>
        ${makeFFEPlayerRow('BACHKAT FARES', 1, '1541 F', '1', '10', '25', [
          ['1', '', '1', '', '', 'Opponent A', '', '', '', '', '', '', ''],
        ])}
      </table>`;

      const playerClubMap = new Map([['BACHKAT FARES', 'Hay Chess']]);

      // Filtering by the exact FFE club name works
      const results = parseResults(htmlResults, playerClubMap, 'Hay Chess');
      expect(results).toHaveLength(1);
      expect(results[0].club).toBe('Hay Chess');
    });

    it('"Hay Chess" (FFE) matche "Hay Chess" (event.clubName) — exact match', () => {
      const htmlResults = `<table>
        ${makeFFEPlayerRow('PLAYER ONE', 1, '1500', '1', '5', '20', [
          ['1', '', '1', '', '', 'Opp1', '', '', '', '', '', '', ''],
        ])}
      </table>`;

      const playerClubMap = new Map([['PLAYER ONE', 'Hay Chess']]);

      const results = parseResults(htmlResults, playerClubMap, 'Hay Chess');
      expect(results).toHaveLength(1);
    });

    it('"Hay Chess" (FFE) ne matche PAS "hay-chess" (slug) — prouve la séparation', () => {
      const htmlResults = `<table>
        ${makeFFEPlayerRow('PLAYER ONE', 1, '1500', '1', '5', '20', [
          ['1', '', '1', '', '', 'Opp1', '', '', '', '', '', '', ''],
        ])}
      </table>`;

      const playerClubMap = new Map([['PLAYER ONE', 'Hay Chess']]);

      // Using slug "hay-chess" as clubName should NOT match "Hay Chess" in FFE data
      const results = parseResults(htmlResults, playerClubMap, 'hay-chess');
      expect(results).toHaveLength(0);
    });
  });
});
