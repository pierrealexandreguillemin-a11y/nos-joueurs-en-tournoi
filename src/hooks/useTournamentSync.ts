'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { parseFFePages, getListUrl, getResultsUrl, getStatsUrl, getRoundUrl, parseStatsClubs, parsePairings, detectCurrentRound } from '@/lib/parser';
import { scrapeFFE, scrapeFFEPair } from '@/lib/scraper';
import { createClubStorage } from '@/lib/storage';
import { useClub } from '@/contexts/ClubContext';
import type { Event, Tournament, Pairing } from '@/types';
import type { ClubStorage } from '@/lib/storage';

const UNKNOWN_ERROR = 'Erreur inconnue';

interface UseTournamentSyncOptions {
  event: Event;
  onEventUpdate: (event: Event) => void;
}

/** Fetch pairings for a given round. Returns [] on failure (silent). */
async function fetchPairingsForRound(
  tournamentUrl: string,
  roundNumber: number,
): Promise<Pairing[]> {
  try {
    const roundUrl = getRoundUrl(tournamentUrl, roundNumber);
    const html = await scrapeFFE(roundUrl, `de la ronde ${roundNumber}`);
    return parsePairings(html);
  } catch {
    return [];
  }
}

/** Try round N+1 first, fallback to round N */
async function fetchBestPairings(
  tournamentUrl: string,
  currentRound: number,
): Promise<{ pairings: Pairing[]; pairingsRound: number }> {
  if (currentRound <= 0) {
    return { pairings: [], pairingsRound: 0 };
  }

  // Try next round first
  const nextRound = currentRound + 1;
  const nextPairings = await fetchPairingsForRound(tournamentUrl, nextRound);
  if (nextPairings.length > 0) {
    return { pairings: nextPairings, pairingsRound: nextRound };
  }

  // Fallback to current round
  const currentPairings = await fetchPairingsForRound(tournamentUrl, currentRound);
  if (currentPairings.length > 0) {
    return { pairings: currentPairings, pairingsRound: currentRound };
  }

  return { pairings: [], pairingsRound: 0 };
}

/** Build a reset event with club cleared and all tournament players removed */
function buildResetEvent(event: Event): Event {
  return {
    ...event,
    clubName: undefined,
    tournaments: event.tournaments.map(t => ({
      ...t,
      players: [],
      lastUpdate: '',
      pairings: undefined,
      pairingsRound: undefined,
    })),
  };
}

/** Fetch results for a single tournament with a given club name */
async function fetchTournamentResults(
  tournament: Tournament,
  clubName: string,
): Promise<Tournament> {
  const listUrl = getListUrl(tournament.url);
  const resultsUrl = getResultsUrl(tournament.url);
  const [htmlList, htmlResults] = await scrapeFFEPair(listUrl, resultsUrl);
  const { players } = parseFFePages(htmlList, htmlResults, clubName);

  // Fetch pairings (best effort — failure returns empty, doesn't throw)
  // Trade-off: sequential after results (+1-2 req, ~200-500ms latency).
  // Parallel (Promise.all N+1/N) would save ~200ms but complicate error handling.
  const currentRound = detectCurrentRound(players);
  const { pairings, pairingsRound } = await fetchBestPairings(
    tournament.url,
    currentRound,
  );

  // Design: raw pairings (all players, not filtered) are stored in Tournament.
  // This allows club switch without refetching pairings. Trade-off: ~4KB extra
  // per tournament in localStorage (50 pairings × 80 bytes). Acceptable for 5MB limit.
  return {
    ...tournament,
    players,
    pairings: pairings.length > 0 ? pairings : undefined,
    pairingsRound: pairingsRound > 0 ? pairingsRound : undefined,
    lastUpdate: new Date().toISOString(),
  };
}

/** Hook for club change dialog state and handlers */
function useClubChangeHandlers(
  event: Event,
  commitEvent: (e: Event) => void,
  storage: ClubStorage | null,
  setError: (err: string | null) => void,
) {
  const [changeClubDialogOpen, setChangeClubDialogOpen] = useState(false);

  const playerCount = event.tournaments.reduce((sum, t) => sum + t.players.length, 0);

  const requestChangeClub = useCallback(() => {
    if (playerCount > 0) {
      setChangeClubDialogOpen(true);
    } else {
      setError(null);
      commitEvent(buildResetEvent(event));
    }
  }, [event, commitEvent, playerCount, setError]);

  const confirmChangeClub = useCallback(() => {
    setChangeClubDialogOpen(false);
    setError(null);

    event.tournaments.forEach(t => {
      storage?.clearTournamentValidations(t.id);
    });

    commitEvent(buildResetEvent(event));
  }, [event, commitEvent, storage, setError]);

  const cancelChangeClub = useCallback(() => {
    setChangeClubDialogOpen(false);
  }, []);

  return { changeClubDialogOpen, playerCount, requestChangeClub, confirmChangeClub, cancelChangeClub };
}

/** Hook for Ctrl+R keyboard shortcut to refresh active tournament */
function useRefreshShortcut(
  activeTab: string,
  loading: string | null,
  tournaments: Tournament[],
  handleRefresh: (t: Tournament) => void,
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r' && activeTab) {
        e.preventDefault();
        const tournament = tournaments.find(t => t.id === activeTab);
        if (tournament && loading !== tournament.id) {
          handleRefresh(tournament);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, loading, tournaments, handleRefresh]);
}

interface SyncSetters {
  setLoading: (v: string | null) => void;
  setError: (v: string | null) => void;
}

/** Hook for FFE fetch / refresh callbacks */
function useFetchCallbacks(
  event: Event,
  commitEvent: (e: Event) => void,
  { setLoading, setError }: SyncSetters,
) {
  const fetchClubs = useCallback(async (tournament: Tournament) => {
    setLoading(tournament.id);
    setError(null);

    try {
      const statsUrl = getStatsUrl(tournament.url);
      const html = await scrapeFFE(statsUrl, 'des statistiques FFE');
      const clubs = parseStatsClubs(html);

      if (clubs.length === 0) {
        throw new Error('Aucun club détecté. Le tournoi n\'a peut-être pas encore commencé.');
      }

      commitEvent({ ...event, availableClubs: clubs });
      toast.success(`${clubs.length} club(s) détecté(s)`);
    } catch (err) {
      console.error('Error fetching clubs:', err);
      setError(err instanceof Error ? err.message : UNKNOWN_ERROR);
    } finally {
      setLoading(null);
    }
  }, [event, commitEvent, setLoading, setError]);

  const fetchResults = useCallback(async (tournament: Tournament) => {
    if (!event.clubName) return;

    setLoading(tournament.id);
    setError(null);

    try {
      const updatedTournament = await fetchTournamentResults(tournament, event.clubName);

      if (updatedTournament.players.length === 0) {
        throw new Error(`Aucun joueur « ${event.clubName} » trouvé. Vérifiez le nom du club ou laissez-le vide pour utiliser la détection automatique.`);
      }

      commitEvent({
        ...event,
        tournaments: event.tournaments.map(t =>
          t.id === tournament.id ? updatedTournament : t
        ),
      });
      toast.success(`${updatedTournament.players.length} joueur(s) mis à jour`);
    } catch (err) {
      console.error('Error refreshing tournament:', err);
      setError(err instanceof Error ? err.message : UNKNOWN_ERROR);
    } finally {
      setLoading(null);
    }
  }, [event, commitEvent, setLoading, setError]);

  const handleRefresh = useCallback(async (tournament: Tournament) => {
    if (!event.clubName) {
      await fetchClubs(tournament);
    } else {
      await fetchResults(tournament);
    }
  }, [event.clubName, fetchClubs, fetchResults]);

  return { handleRefresh };
}

/** Hook for club selection with sequential tournament refresh */
function useClubSelectCallback(
  event: Event,
  commitEvent: (e: Event) => void,
  { setLoading, setError }: SyncSetters,
) {
  return useCallback(async (clubName: string) => {
    let currentEvent: Event = { ...event, clubName };
    commitEvent(currentEvent);

    for (const tournament of currentEvent.tournaments) {
      try {
        setLoading(tournament.id);
        setError(null);

        const updatedTournament = await fetchTournamentResults(tournament, clubName);

        currentEvent = {
          ...currentEvent,
          tournaments: currentEvent.tournaments.map(t =>
            t.id === tournament.id ? updatedTournament : t
          ),
        };

        commitEvent(currentEvent);
      } catch (err) {
        console.error('Error auto-refreshing after club selection:', err);
        setError(err instanceof Error ? err.message : UNKNOWN_ERROR);
      } finally {
        setLoading(null);
      }
    }
  }, [event, commitEvent, setLoading, setError]);
}

export default function useTournamentSync({ event, onEventUpdate }: UseTournamentSyncOptions) {
  const { identity } = useClub();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(event.tournaments[0]?.id || '');

  const clubSlug = identity?.clubSlug || '';
  const storage = useMemo(() => clubSlug ? createClubStorage(clubSlug) : null, [clubSlug]);

  const commitEvent = useCallback((updatedEvent: Event) => {
    storage?.saveEvent(updatedEvent);
    onEventUpdate(updatedEvent);
  }, [onEventUpdate, storage]);

  const syncSetters = { setLoading, setError };
  const { handleRefresh } = useFetchCallbacks(event, commitEvent, syncSetters);
  const handleClubSelect = useClubSelectCallback(event, commitEvent, syncSetters);

  const {
    changeClubDialogOpen, playerCount,
    requestChangeClub, confirmChangeClub, cancelChangeClub,
  } = useClubChangeHandlers(event, commitEvent, storage, setError);

  useRefreshShortcut(activeTab, loading, event.tournaments, handleRefresh);

  const needsClubSelection = event.availableClubs && event.availableClubs.length > 0 && !event.clubName;
  const canChangeClub = !!event.clubName && !!event.availableClubs && event.availableClubs.length > 0;

  return {
    loading,
    error,
    activeTab,
    setActiveTab,
    needsClubSelection,
    canChangeClub,
    handleRefresh,
    handleClubSelect,
    changeClubDialogOpen,
    playerCount,
    requestChangeClub,
    confirmChangeClub,
    cancelChangeClub,
  };
}
