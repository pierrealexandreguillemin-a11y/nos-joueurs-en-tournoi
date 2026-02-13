/**
 * Format a player name to uppercase with single spaces
 */
export function formatPlayerName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Format ELO rating for display
 */
export function formatElo(elo: number | null): string {
  return elo ? `${elo}` : 'Non classé';
}

/**
 * Format score as points/total
 */
export function formatScore(points: number, total: number): string {
  return `${points}/${total}`;
}

/**
 * Format percentage with one decimal place
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Format date to French locale
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format datetime to French locale
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('fr-FR');
}

/**
 * Format club name consistently
 */
export function formatClubName(club: string): string {
  return club.trim();
}

/**
 * Format round number with ordinal
 */
export function formatRound(round: number): string {
  if (round === 1) return '1ère ronde';
  return `${round}ème ronde`;
}
