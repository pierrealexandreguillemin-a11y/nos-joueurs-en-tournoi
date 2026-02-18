'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { parseFFePages, getListUrl, getResultsUrl, getStatsUrl, parseStatsClubs } from '@/lib/parser';
import { scrapeFFE, scrapeFFEPair } from '@/lib/scraper';
import { createClubStorage } from '@/lib/storage';
import { useClub } from '@/contexts/ClubContext';
import type { Event, Tournament } from '@/types';

interface UseTournamentSyncOptions {
  event: Event;
  onEventUpdate: (event: Event) => void;
}

export default function useTournamentSync({ event, onEventUpdate }: UseTournamentSyncOptions) {
  const { identity } = useClub();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(event.tournaments[0]?.id || '');

  const clubSlug = identity?.clubSlug || '';
  const storage = useMemo(() => clubSlug ? createClubStorage(clubSlug) : null, [clubSlug]);

  // Persist event and notify parent
  const commitEvent = useCallback((updatedEvent: Event) => {
    storage?.saveEvent(updatedEvent);
    onEventUpdate(updatedEvent);
  }, [onEventUpdate, storage]);

  // Shared: fetch results for a single tournament with a given club name
  const fetchTournamentResults = useCallback(async (
    tournament: Tournament,
    clubName: string,
  ): Promise<Tournament> => {
    const listUrl = getListUrl(tournament.url);
    const resultsUrl = getResultsUrl(tournament.url);
    const [htmlList, htmlResults] = await scrapeFFEPair(listUrl, resultsUrl);
    const { players } = parseFFePages(htmlList, htmlResults, clubName);

    return {
      ...tournament,
      players,
      lastUpdate: new Date().toISOString(),
    };
  }, []);

  // Phase 1: Fetch Stats page to detect available clubs
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
    } catch (err) {
      console.error('Error fetching clubs:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(null);
    }
  }, [event, commitEvent]);

  // Phase 2: Fetch results for the selected club
  const fetchResults = useCallback(async (tournament: Tournament) => {
    if (!event.clubName) return;

    setLoading(tournament.id);
    setError(null);

    try {
      const updatedTournament = await fetchTournamentResults(tournament, event.clubName);

      if (updatedTournament.players.length === 0) {
        throw new Error(`Aucun joueur ${event.clubName} trouvé. Le tournoi n'a peut-être pas encore commencé.`);
      }

      commitEvent({
        ...event,
        tournaments: event.tournaments.map(t =>
          t.id === tournament.id ? updatedTournament : t
        ),
      });
    } catch (err) {
      console.error('Error refreshing tournament:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(null);
    }
  }, [event, commitEvent, fetchTournamentResults]);

  // handleRefresh: dispatches to Phase 1 or Phase 2
  const handleRefresh = useCallback(async (tournament: Tournament) => {
    if (!event.clubName) {
      await fetchClubs(tournament);
    } else {
      await fetchResults(tournament);
    }
  }, [event.clubName, fetchClubs, fetchResults]);

  // Handle club selection
  const handleClubSelect = useCallback(async (clubName: string) => {
    let currentEvent: Event = { ...event, clubName };
    commitEvent(currentEvent);

    // Auto-refresh all tournaments sequentially to avoid race conditions
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
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(null);
      }
    }
  }, [event, commitEvent, fetchTournamentResults]);

  // Handle club change: two-step (request opens dialog, confirm executes)
  const [changeClubDialogOpen, setChangeClubDialogOpen] = useState(false);

  const playerCount = event.tournaments.reduce((sum, t) => sum + t.players.length, 0);

  const requestChangeClub = useCallback(() => {
    if (playerCount > 0) {
      setChangeClubDialogOpen(true);
    } else {
      // No players loaded, skip confirmation
      setError(null);
      commitEvent({
        ...event,
        clubName: undefined,
        tournaments: event.tournaments.map(t => ({
          ...t,
          players: [],
          lastUpdate: '',
        })),
      });
    }
  }, [event, commitEvent, playerCount]);

  const confirmChangeClub = useCallback(() => {
    setChangeClubDialogOpen(false);
    setError(null);

    // Clean up validations for all tournaments before resetting
    event.tournaments.forEach(t => {
      storage?.clearTournamentValidations(t.id);
    });

    commitEvent({
      ...event,
      clubName: undefined,
      tournaments: event.tournaments.map(t => ({
        ...t,
        players: [],
        lastUpdate: '',
      })),
    });
  }, [event, commitEvent, storage]);

  const cancelChangeClub = useCallback(() => {
    setChangeClubDialogOpen(false);
  }, []);

  // Keyboard shortcuts: Ctrl+R pour refresh
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r' && activeTab) {
        e.preventDefault();
        const tournament = event.tournaments.find(t => t.id === activeTab);
        if (tournament && loading !== tournament.id) {
          handleRefresh(tournament);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, loading, event.tournaments, handleRefresh]);

  // Derived state
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
