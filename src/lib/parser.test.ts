import { describe, it, expect } from 'vitest';
import {
  parsePlayerClubs,
  parseResults,
  parseFFePages,
  detectCurrentRound,
  calculateClubStats,
  getListUrl,
  getStatsUrl,
  parseStatsClubs,
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
        return `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`;
      }
      return `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`;
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
});
