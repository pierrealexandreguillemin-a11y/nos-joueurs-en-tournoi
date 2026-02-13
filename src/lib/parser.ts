/**
 * FFE Tournament Results Parser
 * Parses HTML from French Chess Federation tournament pages
 *
 * IMPORTANT: FFE requires 2 pages to be fetched:
 * - Action=Ls: Player list with clubs
 * - Action=Ga: Results grid (American system)
 */

import * as cheerio from 'cheerio';
import type { Player, Result, ClubStats, ClubInfo } from '@/types';

/**
 * Extract tournament ID from FFE URL
 * Supports: FicheTournoi.aspx?Ref=68994 or Resultats.aspx URLs
 */
function extractTournamentId(url: string): string | null {
  // FicheTournoi.aspx?Ref=68994
  const ficheMatch = url.match(/FicheTournoi\.aspx\?Ref=(\d+)/);
  if (ficheMatch) return ficheMatch[1];

  // Resultats.aspx?URL=Tournois/Id/68994/68994
  const resultsMatch = url.match(/Tournois\/Id\/(\d+)/);
  if (resultsMatch) return resultsMatch[1];

  return null;
}

/**
 * Convert tournament URL to Action=Ls URL (player list with clubs)
 * Handles both FicheTournoi.aspx and Resultats.aspx formats
 */
export function getListUrl(tournamentUrl: string): string {
  const tournamentId = extractTournamentId(tournamentUrl);

  if (!tournamentId) {
    // Fallback: assume already correct format
    return tournamentUrl.replace('Action=Ga', 'Action=Ls');
  }

  return `https://www.echecs.asso.fr/Resultats.aspx?URL=Tournois/Id/${tournamentId}/${tournamentId}&Action=Ls`;
}

/**
 * Convert tournament URL to Action=Ga URL (results grid)
 * Handles both FicheTournoi.aspx and Resultats.aspx formats
 */
export function getResultsUrl(tournamentUrl: string): string {
  const tournamentId = extractTournamentId(tournamentUrl);

  if (!tournamentId) {
    // Fallback: assume already correct format
    return tournamentUrl;
  }

  return `https://www.echecs.asso.fr/Resultats.aspx?URL=Tournois/Id/${tournamentId}/${tournamentId}&Action=Ga`;
}

/**
 * Convert tournament URL to Action=Stats URL (statistics with club list)
 */
export function getStatsUrl(tournamentUrl: string): string {
  const tournamentId = extractTournamentId(tournamentUrl);
  if (!tournamentId) return tournamentUrl;
  return `https://www.echecs.asso.fr/Resultats.aspx?URL=Tournois/Id/${tournamentId}/${tournamentId}&Action=Stats`;
}

/**
 * Parse Stats page (Action=Stats) to extract club list with player counts
 * Looks for the "Répartition par clubs" section
 */
export function parseStatsClubs(htmlStats: string): ClubInfo[] {
  const $ = cheerio.load(htmlStats);
  const clubs: ClubInfo[] = [];
  let inClubsSection = false;

  $('tr').each((_, row) => {
    const $row = $(row);
    if ($row.hasClass('papi_liste_t')) {
      const text = $row.text().trim().toLowerCase();
      if (text.includes('partition par clubs') || text.includes('repartition par clubs') || text.includes('répartition par clubs')) {
        inClubsSection = true;
        return;
      }
      if (inClubsSection && text.includes('clubs repr')) return; // subheader "N clubs représentés"
      if (inClubsSection) { inClubsSection = false; return; } // next section header = end
    }
    if (!inClubsSection) return;

    const cells = $row.find('td.papi_liste_c');
    if (cells.length >= 2) {
      const name = $(cells[0]).text().trim().replace(/\s*:\s*$/, '');
      const count = parseInt($(cells[1]).text().trim().replace(/\s*:\s*$/, '')) || 0;
      if (name) clubs.push({ name, playerCount: count });
    }
  });
  return clubs;
}

/**
 * Clean player name: normalize spaces and uppercase
 * @example "BACHKAT  Fares" -> "BACHKAT FARES"
 */
function cleanPlayerName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Parse ELO from text: "1541 F" -> 1541
 */
function parseElo(text: string): number {
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Parse points: "4½" -> 4.5
 */
function parsePoints(text: string): number {
  const normalized = text.replace('½', '.5');
  return parseFloat(normalized) || 0;
}

/**
 * Parse player list page (Action=Ls) to extract club information
 * @returns Map of player name -> club name
 */
export function parsePlayerClubs(htmlList: string): Map<string, string> {
  const $ = cheerio.load(htmlList);
  const playerClubMap = new Map<string, string>();

  // Find player list table
  $('table tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 8) return; // Skip header rows (need 8 cols: Nr, [empty], Nom, Rapide, Cat, Fede, Ligue, Club)

    const nameRaw = $(cells[2]).text().trim(); // Column 3 = Nom (cells[0]=Nr, cells[1]=empty, cells[2]=Nom)
    const name = cleanPlayerName(nameRaw);
    const club = $(cells[7]).text().trim(); // Column 8 = Club

    if (name && club) {
      playerClubMap.set(name, club);
    }
  });

  return playerClubMap;
}

/**
 * Parse results page (Action=Ga) and filter by club
 * @param htmlResults - HTML from results page
 * @param playerClubMap - Map of player names to clubs
 * @param clubName - Name of the club to filter by
 * @returns Array of players from target club
 */
export function parseResults(
  htmlResults: string,
  playerClubMap: Map<string, string>,
  clubName: string
): Player[] {
  const $ = cheerio.load(htmlResults);
  const players: Player[] = [];

  // FFE structure: Each player row contains a div.papi_joueur_box with nested sub-table
  // See FFE-PARSER-REFERENCE.md for complete documentation
  $('tr').filter((_, row) => {
    return $(row).find('div.papi_joueur_box').length > 0;
  }).each((_, row) => {
    // Extract player name and filter by club
    const playerDiv = $(row).find('div.papi_joueur_box');
    const nameRaw = playerDiv.find('b').first().text().trim();
    const name = cleanPlayerName(nameRaw);

    const club = playerClubMap.get(name) || '';
    if (club !== clubName) return; // Filter: Keep only target club

    // Access sub-table structure (the ONLY reliable data source)
    const subTable = playerDiv.find('table').first();
    const allRows = subTable.find('tr');

    // ═══════════════════════════════════════════════════════════════════════
    // ROW 0: PLAYER HEADER (11 cells - FIXED indices)
    // ═══════════════════════════════════════════════════════════════════════
    const infoRow = allRows.first();
    const infoCells = infoRow.find('td');

    // Verified indices from real FFE HTML analysis
    const ranking = parseInt($(infoCells[1]).text().trim()) || 0;      // Cell[1]
    const elo = parseElo($(infoCells[4]).text().trim());              // Cell[4]
    const currentPoints = parsePoints($(infoCells[8]).text().trim()); // Cell[8]

    // Cell[9] = Tr. (Tronqué/Tiebreak) from sub-table
    const trText = $(infoCells[9]).text().trim()
      .replace('½', '.5')
      .replace('&frac12;', '.5');
    const tiebreak = parseFloat(trText) || undefined;

    // Cell[10] = Buchholz from sub-table
    const buchText = $(infoCells[10]).text().trim()
      .replace('½', '.5')
      .replace('&frac12;', '.5');
    const buchholz = parseFloat(buchText) || undefined;

    // Performance from outer row - RELATIVE indexing (last cell)
    // Outer cells structure: [...rounds..., Pts, Tr., Buch., Perf]
    const tdParent = $(row).find('td').filter((_, td) => {
      return $(td).find('div.papi_joueur_box').length > 0;
    }).first();
    const outerCells = tdParent.nextAll('td');
    const perfText = outerCells.length > 0
      ? $(outerCells[outerCells.length - 1]).text().trim()
      : '';
    const performance = parseInt(perfText) || undefined;

    // ═══════════════════════════════════════════════════════════════════════
    // ROWS 1-N: ROUND RESULTS (13 cells standard, 4 cells for byes)
    // ═══════════════════════════════════════════════════════════════════════
    const results: Result[] = [];
    allRows.slice(1).each((_, resultRow) => {
      const resultCells = $(resultRow).find('td');

      // Skip bye/exempt rows (only 4 cells instead of 13)
      if (resultCells.length < 6) return;

      // Verified indices from FFE-PARSER-REFERENCE.md
      const roundNum = parseInt($(resultCells[0]).text().trim()) || 0; // Cell[0]
      const scoreText = $(resultCells[2]).text().trim();                // Cell[2]
      const opponentName = $(resultCells[5]).text().trim();             // Cell[5]

      // Parse score with HTML entity handling
      let score: 0 | 0.5 | 1 = 0;
      if (scoreText === '1') score = 1;
      else if (scoreText === '½' || scoreText === '0.5' || scoreText === '&frac12;') score = 0.5;
      else score = 0;

      results.push({
        round: roundNum,
        score,
        opponent: opponentName || undefined,
      });
    });

    players.push({
      name,
      elo,
      club,
      ranking,
      results,
      currentPoints,
      tiebreak,
      buchholz,
      performance,
      validated: new Array(results.length).fill(false),
    });
  });

  return players;
}

/**
 * Detect current round based on players' results
 */
export function detectCurrentRound(players: Player[]): number {
  let maxRound = 0;
  players.forEach(player => {
    player.results.forEach(result => {
      if (result.round > maxRound) {
        maxRound = result.round;
      }
    });
  });
  return maxRound;
}

/**
 * Calculate club statistics for a given round
 */
export function calculateClubStats(
  players: Player[],
  currentRound: number
): ClubStats {
  const playerCount = players.length;

  if (playerCount === 0) {
    return {
      round: currentRound,
      totalPoints: 0,
      playerCount: 0,
      averagePoints: 0,
    };
  }

  // Sum points up to current round
  const totalPoints = players.reduce((sum, player) => {
    const pointsUpToRound = player.results
      .filter(r => r.round <= currentRound)
      .reduce((acc, r) => acc + r.score, 0);
    return sum + pointsUpToRound;
  }, 0);

  const averagePoints = Math.round((totalPoints / playerCount) * 100) / 100;

  return {
    round: currentRound,
    totalPoints,
    playerCount,
    averagePoints,
  };
}

/**
 * Parse both FFE pages and return filtered players
 * This is the main entry point for parsing FFE data
 *
 * @param htmlList - HTML from Action=Ls page
 * @param htmlResults - HTML from Action=Ga page
 * @param clubName - Name of the club to filter by
 * @returns Parsed players from target club
 */
export function parseFFePages(
  htmlList: string,
  htmlResults: string,
  clubName: string
): { players: Player[]; currentRound: number } {
  // Step 1: Parse club information from list page
  const playerClubMap = parsePlayerClubs(htmlList);

  // Step 2: Parse results and filter by club
  const playersRaw = parseResults(htmlResults, playerClubMap, clubName);

  // Step 3: Deduplicate players by name (keep first occurrence)
  const seenNames = new Set<string>();
  const players = playersRaw.filter(player => {
    if (seenNames.has(player.name)) {
      return false; // Skip duplicate
    }
    seenNames.add(player.name);
    return true;
  });

  // Step 4: Detect current round
  const currentRound = detectCurrentRound(players);

  return { players, currentRound };
}
