'use client';
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import ClubStats from '@/components/ClubStats';
import ClubSelector from '@/components/ClubSelector';
import PlayerTable from '@/components/PlayerTable';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { parseFFePages, getListUrl, getResultsUrl, getStatsUrl, parseStatsClubs } from '@/lib/parser';
import { saveEvent } from '@/lib/storage';
import type { Event, Tournament } from '@/types';

interface TournamentTabsProps {
  event: Event;
  onEventUpdate: (event: Event) => void;
}

export default function TournamentTabs({ event, onEventUpdate }: TournamentTabsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(event.tournaments[0]?.id || '');

  // Phase 1: Fetch Stats page to detect available clubs
  const fetchClubs = useCallback(async (tournament: Tournament) => {
    setLoading(tournament.id);
    setError(null);

    try {
      const statsUrl = getStatsUrl(tournament.url);
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: statsUrl }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 404) {
          throw new Error('Tournoi introuvable sur le site FFE');
        } else if (status === 500) {
          throw new Error('Le serveur FFE rencontre des problèmes');
        } else {
          throw new Error(`Erreur lors du chargement des statistiques FFE (${status})`);
        }
      }

      const data = await response.json();
      const clubs = parseStatsClubs(data.html);

      if (clubs.length === 0) {
        throw new Error('Aucun club détecté. Le tournoi n\'a peut-être pas encore commencé.');
      }

      // Store available clubs in the event
      const updatedEvent: Event = {
        ...event,
        availableClubs: clubs,
      };

      saveEvent(updatedEvent);
      onEventUpdate(updatedEvent);
    } catch (err) {
      console.error('Error fetching clubs:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(null);
    }
  }, [event, onEventUpdate]);

  // Phase 2: Fetch results for the selected club
  const fetchResults = useCallback(async (tournament: Tournament) => {
    if (!event.clubName) return;

    setLoading(tournament.id);
    setError(null);

    try {
      const listUrl = getListUrl(tournament.url);
      const resultsUrl = getResultsUrl(tournament.url);

      const [responseList, responseResults] = await Promise.all([
        fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: listUrl }),
        }),
        fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: resultsUrl }),
        }),
      ]);

      if (!responseList.ok || !responseResults.ok) {
        const status = !responseList.ok ? responseList.status : responseResults.status;
        if (status === 404) {
          throw new Error('Tournoi introuvable sur le site FFE');
        } else if (status === 500) {
          throw new Error('Le serveur FFE rencontre des problèmes');
        } else {
          throw new Error(`Erreur lors du chargement des résultats FFE (${status})`);
        }
      }

      const [dataList, dataResults] = await Promise.all([
        responseList.json(),
        responseResults.json(),
      ]);

      const { players } = parseFFePages(
        dataList.html,
        dataResults.html,
        event.clubName
      );

      if (players.length === 0) {
        throw new Error(`Aucun joueur ${event.clubName} trouvé. Le tournoi n'a peut-être pas encore commencé.`);
      }

      const updatedTournament: Tournament = {
        ...tournament,
        players,
        lastUpdate: new Date().toISOString(),
      };

      const updatedEvent: Event = {
        ...event,
        tournaments: event.tournaments.map(t =>
          t.id === tournament.id ? updatedTournament : t
        ),
      };

      saveEvent(updatedEvent);
      onEventUpdate(updatedEvent);
    } catch (err) {
      console.error('Error refreshing tournament:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(null);
    }
  }, [event, onEventUpdate]);

  // handleRefresh: dispatches to Phase 1 or Phase 2
  const handleRefresh = useCallback(async (tournament: Tournament) => {
    if (!event.clubName) {
      // Phase 1: detect clubs
      await fetchClubs(tournament);
    } else {
      // Phase 2: fetch results with selected club
      await fetchResults(tournament);
    }
  }, [event.clubName, fetchClubs, fetchResults]);

  // Handle club selection
  const handleClubSelect = useCallback(async (clubName: string) => {
    let currentEvent: Event = {
      ...event,
      clubName,
    };
    saveEvent(currentEvent);
    onEventUpdate(currentEvent);

    // Auto-refresh all tournaments sequentially to avoid race conditions
    for (const tournament of currentEvent.tournaments) {
      try {
        setLoading(tournament.id);
        setError(null);

        const listUrl = getListUrl(tournament.url);
        const resultsUrl = getResultsUrl(tournament.url);

        const [responseList, responseResults] = await Promise.all([
          fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: listUrl }),
          }),
          fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: resultsUrl }),
          }),
        ]);

        if (!responseList.ok || !responseResults.ok) {
          throw new Error('Erreur lors du chargement des résultats FFE');
        }

        const [dataList, dataResults] = await Promise.all([
          responseList.json(),
          responseResults.json(),
        ]);
        const { players } = parseFFePages(dataList.html, dataResults.html, clubName);

        const updatedTournament: Tournament = {
          ...tournament,
          players,
          lastUpdate: new Date().toISOString(),
        };

        currentEvent = {
          ...currentEvent,
          tournaments: currentEvent.tournaments.map(t =>
            t.id === tournament.id ? updatedTournament : t
          ),
        };

        saveEvent(currentEvent);
        onEventUpdate(currentEvent);
      } catch (err) {
        console.error('Error auto-refreshing after club selection:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(null);
      }
    }
  }, [event, onEventUpdate]);

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

  // Show club selector if clubs detected but no club chosen
  const needsClubSelection = event.availableClubs && event.availableClubs.length > 0 && !event.clubName;

  return (
    <Tabs
      defaultValue={event.tournaments[0]?.id}
      className="w-full"
      onValueChange={setActiveTab}
      aria-label="Gestion des tournois"
    >
      <TabsList className="miami-glass-foreground" role="tablist">
        {event.tournaments.map(tournament => (
          <TabsTrigger
            key={tournament.id}
            value={tournament.id}
            aria-label={`Tournoi ${tournament.name}`}
            aria-controls={`tournament-panel-${tournament.id}`}
          >
            {tournament.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {event.tournaments.map(tournament => (
        <TabsContent
          key={tournament.id}
          value={tournament.id}
          className="space-y-4"
          id={`tournament-panel-${tournament.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tournament.id}`}
        >
          {/* Club Selector (Phase 1 result) */}
          {needsClubSelection && (
            <Card className="miami-card">
              <ClubSelector
                clubs={event.availableClubs!}
                onSelect={handleClubSelect}
              />
            </Card>
          )}

          {/* Stats and Refresh */}
          <Card className="miami-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {tournament.players.length > 0 && (
                  <ClubStats
                    eventName={event.name}
                    clubName={event.clubName}
                    players={tournament.players}
                    currentRound={tournament.players[0]?.results.length || 1}
                  />
                )}
                {tournament.players.length === 0 && !needsClubSelection && (
                  <p className="text-sm text-muted-foreground">
                    Aucune donnée. Cliquez sur Actualiser pour charger les résultats.
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRefresh(tournament)}
                disabled={loading === tournament.id}
                aria-label={
                  loading === tournament.id
                    ? `Actualisation en cours pour ${tournament.name}`
                    : `Actualiser les résultats du tournoi ${tournament.name} (Ctrl+R)`
                }
                aria-busy={loading === tournament.id}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading === tournament.id ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                Actualiser
                {loading === tournament.id && (
                  <span className="sr-only">Chargement en cours...</span>
                )}
              </Button>
            </div>

            {tournament.lastUpdate && (
              <p className="text-xs text-muted-foreground mt-2">
                Dernière mise à jour :{' '}
                {new Date(tournament.lastUpdate).toLocaleString('fr-FR')}
              </p>
            )}
          </Card>

          {/* Error Message */}
          {error && loading === null && (
            <Card className="bg-red-50 border-red-200 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </Card>
          )}

          {/* Player Table */}
          {tournament.players.length > 0 && (
            <PlayerTable tournament={tournament} />
          )}

          {/* Empty State */}
          {tournament.players.length === 0 && !loading && !needsClubSelection && (
            <Card className="miami-card text-center py-8">
              <p className="text-muted-foreground">
                {event.clubName
                  ? `Aucun joueur ${event.clubName} trouvé dans ce tournoi`
                  : 'Cliquez sur Actualiser pour détecter les clubs du tournoi'}
              </p>
            </Card>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
