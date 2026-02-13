import type { Tournament, Event } from '@/types';

/**
 * Validate if a URL is a valid FFE tournament URL
 */
export function isValidFFeUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'echecs.asso.fr';
  } catch {
    return false;
  }
}

/**
 * Validate if a tournament URL is valid
 */
export function isValidTournamentUrl(url: string): boolean {
  if (!url || url.trim().length === 0) {
    return false;
  }
  return isValidFFeUrl(url);
}

/**
 * Validate if an event name is valid
 */
export function isValidEventName(name: string): boolean {
  return name.trim().length >= 3;
}

/**
 * Validate if a tournament object is valid
 */
export function isValidTournament(tournament: Partial<Tournament>): boolean {
  return Boolean(
    tournament?.name &&
    tournament?.url &&
    isValidTournamentUrl(tournament.url)
  );
}

/**
 * Validate if an event object is valid
 */
export function isValidEvent(event: Partial<Event>): boolean {
  return Boolean(
    event?.name &&
    isValidEventName(event.name) &&
    event?.tournaments &&
    Array.isArray(event.tournaments) &&
    event.tournaments.length > 0
  );
}

/**
 * Validate if a tournament name is valid
 */
export function isValidTournamentName(name: string): boolean {
  return name.trim().length >= 2;
}
