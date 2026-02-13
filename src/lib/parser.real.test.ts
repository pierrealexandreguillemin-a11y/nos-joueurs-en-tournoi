import { describe, it, expect } from 'vitest';
import { parsePlayerClubs, parseResults } from './parser';
import * as fs from 'fs';
import * as path from 'path';

describe('parser.ts - REAL FFE HTML', () => {
  const htmlList = fs.readFileSync(
    path.join(process.cwd(), 'ffe-list.html'),
    'utf-8'
  );
  const htmlResults = fs.readFileSync(
    path.join(process.cwd(), 'ffe-results.html'),
    'utf-8'
  );

  describe('parsePlayerClubs', () => {
    it('parses real FFE list page', () => {
      const clubMap = parsePlayerClubs(htmlList);
      expect(clubMap.size).toBeGreaterThan(0);

      // Check Hay Chess players
      const hayPlayers = Array.from(clubMap.entries()).filter(
        ([, club]) => club === 'Hay Chess'
      );
      expect(hayPlayers.length).toBe(5);

      // Verify specific players
      expect(clubMap.get('BACHKAT FARES')).toBe('Hay Chess');
      expect(clubMap.get('ENGLES BAPTISTE')).toBe('Hay Chess');
      expect(clubMap.get('MONTALDO AARON')).toBe('Hay Chess');
      expect(clubMap.get('SOGOYAN MAXIME')).toBe('Hay Chess');
      expect(clubMap.get('TOULOUMDJIAN INES')).toBe('Hay Chess');
    });
  });

  describe('parseResults', () => {
    it('parses real FFE results page', () => {
      const clubMap = parsePlayerClubs(htmlList);
      const players = parseResults(htmlResults, clubMap);

      console.log(`\n✅ Found ${players.length} Hay Chess players\n`);

      expect(players.length).toBeGreaterThan(0);

      // Check first player structure
      const first = players[0];
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('elo');
      expect(first).toHaveProperty('club');
      expect(first).toHaveProperty('ranking');
      expect(first).toHaveProperty('currentPoints');
      expect(first).toHaveProperty('results');

      expect(first.club).toBe('Hay Chess');
      expect(first.results.length).toBeGreaterThan(0);

      // Log first player for verification
      console.log('First Hay Chess player:');
      console.log(`  Name: ${first.name}`);
      console.log(`  Ranking: ${first.ranking}`);
      console.log(`  Elo: ${first.elo}`);
      console.log(`  Points: ${first.currentPoints}`);
      console.log(`  Rounds: ${first.results.length}`);
    });
  });
});
