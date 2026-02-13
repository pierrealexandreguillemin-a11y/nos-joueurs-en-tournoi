import { describe, it, expect } from 'vitest';
import {
  parsePlayerClubs,
  parseResults,
  parseFFePages,
  detectCurrentRound,
  calculateClubStats,
  getListUrl,
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

  describe('parseResults', () => {
    it('filters players by club', () => {
      const htmlResults = `
        <table>
          <thead>
            <tr>
              <th>Pl</th>
              <th>Nom</th>
              <th>Elo</th>
              <th>R 1</th>
              <th>R 2</th>
              <th>Pts</th>
              <th>Tr</th>
              <th>Perf</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>BACHKAT FARES</td>
              <td>1541 F</td>
              <td>+ 10B</td>
              <td>= 2N</td>
              <td>1½</td>
              <td>12.5</td>
              <td>1600</td>
            </tr>
            <tr>
              <td>2</td>
              <td>DUPONT JEAN</td>
              <td>1600</td>
              <td>+ 11N</td>
              <td>= 1B</td>
              <td>1½</td>
              <td>13</td>
              <td>1550</td>
            </tr>
          </tbody>
        </table>
      `;

      const playerClubMap = new Map([
        ['BACHKAT FARES', 'Hay Chess'],
        ['DUPONT JEAN', 'Other Club'],
      ]);

      const results = parseResults(htmlResults, playerClubMap);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('BACHKAT FARES');
      expect(results[0].club).toBe('Hay Chess');
      expect(results[0].elo).toBe(1541);
      expect(results[0].ranking).toBe(1);
      expect(results[0].currentPoints).toBe(1.5);
      expect(results[0].buchholz).toBe(12.5);
      expect(results[0].performance).toBe(1600);
      expect(results[0].results).toHaveLength(2);
    });

    it('parses round results correctly', () => {
      const htmlResults = `
        <table>
          <thead>
            <tr>
              <th>Pl</th>
              <th>Nom</th>
              <th>Elo</th>
              <th>R 1</th>
              <th>R 2</th>
              <th>R 3</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>TEST PLAYER</td>
              <td>1500</td>
              <td>+ 10B</td>
              <td>- 2N</td>
              <td>= 3B</td>
              <td>1½</td>
            </tr>
          </tbody>
        </table>
      `;

      const playerClubMap = new Map([['TEST PLAYER', 'Hay Chess']]);
      const results = parseResults(htmlResults, playerClubMap);

      expect(results[0].results).toEqual([
        { round: 1, score: 1, opponent: '10' },
        { round: 2, score: 0, opponent: '2' },
        { round: 3, score: 0.5, opponent: '3' },
      ]);
    });

    it('handles exempt (EXE) results', () => {
      const htmlResults = `
        <table>
          <thead>
            <tr>
              <th>Pl</th>
              <th>Nom</th>
              <th>Elo</th>
              <th>R 1</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>TEST PLAYER</td>
              <td>1500</td>
              <td>EXE</td>
              <td>1</td>
            </tr>
          </tbody>
        </table>
      `;

      const playerClubMap = new Map([['TEST PLAYER', 'Hay Chess']]);
      const results = parseResults(htmlResults, playerClubMap);

      expect(results[0].results[0]).toEqual({
        round: 1,
        score: 1,
        opponent: 'EXEMPT',
      });
    });

    it('returns empty array when no players match club', () => {
      const htmlResults = `
        <table>
          <thead>
            <tr>
              <th>Pl</th>
              <th>Nom</th>
              <th>Elo</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>DUPONT JEAN</td>
              <td>1600</td>
              <td>0</td>
            </tr>
          </tbody>
        </table>
      `;

      const playerClubMap = new Map([['DUPONT JEAN', 'Other Club']]);
      const results = parseResults(htmlResults, playerClubMap);

      expect(results).toHaveLength(0);
    });
  });

  describe('parseFFePages', () => {
    it('integrates parsePlayerClubs and parseResults', () => {
      const htmlList = `
        <table>
          <tr>
            <td>1</td>
            <td>&nbsp;</td>
            <td>PLAYER ONE</td>
            <td>1500</td>
            <td></td>
            <td></td>
            <td></td>
            <td>Hay Chess</td>
          </tr>
        </table>
      `;

      const htmlResults = `
        <table>
          <thead>
            <tr>
              <th>Pl</th>
              <th>Nom</th>
              <th>Elo</th>
              <th>R 1</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>PLAYER ONE</td>
              <td>1500</td>
              <td>+ 5B</td>
              <td>1</td>
            </tr>
          </tbody>
        </table>
      `;

      const { players, currentRound } = parseFFePages(htmlList, htmlResults);

      expect(players).toHaveLength(1);
      expect(players[0].name).toBe('PLAYER ONE');
      expect(players[0].club).toBe('Hay Chess');
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
});
