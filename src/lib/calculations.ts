import type { Player, Result } from '@/types';

/**
 * Calculate total points from results
 */
export function calculateTotalPoints(results: Result[]): number {
  return results.reduce((sum, result) => sum + result.score, 0);
}

/**
 * Calculate win percentage
 */
export function calculatePercentage(points: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((points / total) * 100);
}

/**
 * Calculate performance rating
 */
export function calculatePerformance(points: number, totalGames: number): number {
  if (totalGames === 0) return 0;
  const percentage = points / totalGames;
  return Math.round(percentage * 100);
}

/**
 * Sort players by score (currentPoints, then ELO, then name)
 */
export function sortPlayersByScore(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    // First by currentPoints (descending)
    if (b.currentPoints !== a.currentPoints) {
      return b.currentPoints - a.currentPoints;
    }

    // Then by ELO (descending)
    const aElo = a.elo || 0;
    const bElo = b.elo || 0;
    if (bElo !== aElo) {
      return bElo - aElo;
    }

    // Finally by name (alphabetically)
    return a.name.localeCompare(b.name);
  });
}

/**
 * Calculate average ELO for a list of players
 */
export function calculateAverageElo(players: Player[]): number {
  const playersWithElo = players.filter(p => p.elo);
  if (playersWithElo.length === 0) return 0;

  const total = playersWithElo.reduce((sum, p) => sum + (p.elo || 0), 0);
  return Math.round(total / playersWithElo.length);
}

/**
 * Calculate result statistics from scores
 * Note: Our Result type uses score (0, 0.5, 1) not status strings
 */
export function calculateResultStats(results: Result[]): {
  wins: number;
  draws: number;
  losses: number;
} {
  return results.reduce(
    (stats, result) => {
      if (result.score === 1) return { ...stats, wins: stats.wins + 1 };
      if (result.score === 0.5) return { ...stats, draws: stats.draws + 1 };
      if (result.score === 0) return { ...stats, losses: stats.losses + 1 };
      return stats;
    },
    { wins: 0, draws: 0, losses: 0 }
  );
}

/**
 * Calculate total games played
 */
export function calculateGamesPlayed(results: Result[]): number {
  return results.length;
}
