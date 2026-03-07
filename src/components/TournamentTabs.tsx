'use client';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import ClubStats from '@/components/ClubStats';
import ClubSelector from '@/components/ClubSelector';
import PlayerTable from '@/components/PlayerTable';
import ViewToggle, { type ViewMode } from '@/components/ViewToggle';
import PairingsTable from '@/components/PairingsTable';
import { filterClubPairings } from '@/lib/parser';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowLeftRight } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import useTournamentSync from '@/hooks/useTournamentSync';
import type { Event, Tournament } from '@/types';

interface TournamentTabsProps {
  event: Event;
  onEventUpdate: (event: Event) => void;
}

interface StatsCardProps {
  tournament: Tournament;
  event: Event;
  loading: string | null;
  needsClubSelection: boolean | undefined;
  canChangeClub: boolean;
  handleRefresh: (tournament: Tournament) => void;
  requestChangeClub: () => void;
}

function StatsCard({
  tournament,
  event,
  loading,
  needsClubSelection,
  canChangeClub,
  handleRefresh,
  requestChangeClub,
}: StatsCardProps) {
  const isLoading = loading === tournament.id;

  return (
    <Card className="glass-card">
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
          {canChangeClub && (
            <Button
              variant="ghost"
              size="sm"
              onClick={requestChangeClub}
              disabled={loading !== null}
              className="text-xs text-muted-foreground mt-1"
              aria-label="Changer de club"
            >
              <ArrowLeftRight className="h-3 w-3 mr-1" aria-hidden="true" />
              Changer de club
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRefresh(tournament)}
          disabled={isLoading}
          aria-label={
            isLoading
              ? `Actualisation en cours pour ${tournament.name}`
              : `Actualiser les résultats du tournoi ${tournament.name} (Ctrl+R)`
          }
          aria-busy={isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          Actualiser
          {isLoading && (
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
  );
}

interface TournamentPanelProps {
  tournament: Tournament;
  event: Event;
  loading: string | null;
  error: string | null;
  needsClubSelection: boolean | undefined;
  canChangeClub: boolean;
  handleRefresh: (tournament: Tournament) => void;
  handleClubSelect: (clubName: string) => void;
  requestChangeClub: () => void;
}

interface TournamentContentProps {
  tournament: Tournament;
  event: Event;
  loading: string | null;
  viewMode: ViewMode;
  handleRefresh: (tournament: Tournament) => void;
  needsClubSelection: boolean | undefined;
}

function TournamentContent({
  tournament, event, loading, viewMode, handleRefresh, needsClubSelection,
}: TournamentContentProps) {
  const hasPlayers = tournament.players.length > 0;
  const hasPairings = (tournament.pairings?.length ?? 0) > 0;

  const clubPairings = useMemo(() => {
    if (viewMode !== 'pairings' || !tournament.pairings?.length || !event.clubName) return [];
    const playerClubMap = new Map(
      tournament.players.map(p => [p.name, p.club]),
    );
    return filterClubPairings(tournament.pairings, playerClubMap, event.clubName);
  }, [viewMode, tournament.pairings, tournament.players, event.clubName]);

  if (viewMode === 'pairings' && hasPairings) {
    return <PairingsTable pairings={clubPairings} pairingsRound={tournament.pairingsRound ?? 1} />;
  }

  if (viewMode === 'pairings' && !hasPairings) {
    return (
      <Card className="glass-card text-center py-8">
        <p className="text-muted-foreground">
          Les appariements ne sont pas encore publiés.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => handleRefresh(tournament)}>
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          Vérifier maintenant
        </Button>
      </Card>
    );
  }

  if (hasPlayers) return <PlayerTable tournament={tournament} />;

  if (!loading && !needsClubSelection) {
    return (
      <Card className="glass-card text-center py-8">
        <p className="text-muted-foreground">
          {event.clubName
            ? `Aucun joueur ${event.clubName} trouvé dans ce tournoi`
            : 'Cliquez sur Actualiser pour détecter les clubs du tournoi'}
        </p>
        {!event.clubName && (
          <Button variant="gradient" size="sm" className="mt-4" onClick={() => handleRefresh(tournament)}>
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Actualiser
          </Button>
        )}
      </Card>
    );
  }

  return null;
}

function TournamentPanel({
  tournament,
  event,
  loading,
  error,
  needsClubSelection,
  canChangeClub,
  handleRefresh,
  handleClubSelect,
  requestChangeClub,
}: TournamentPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('results');
  const [hasViewedPairings, setHasViewedPairings] = useState(false);
  const prevRoundRef = useRef(tournament.pairingsRound);

  const hasPairings = (tournament.pairings?.length ?? 0) > 0;

  // Reset badge when pairingsRound changes
  useEffect(() => {
    if (tournament.pairingsRound !== prevRoundRef.current) {
      prevRoundRef.current = tournament.pairingsRound;
      // Justification: Reset viewed state when new pairings round is detected
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasViewedPairings(false);
    }
  }, [tournament.pairingsRound]);

  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'pairings') setHasViewedPairings(true);
  }, []);

  return (
    <>
      {needsClubSelection && (
        <Card className="glass-card">
          <ClubSelector clubs={event.availableClubs!} onSelect={handleClubSelect} />
        </Card>
      )}

      <StatsCard
        tournament={tournament}
        event={event}
        loading={loading}
        needsClubSelection={needsClubSelection}
        canChangeClub={canChangeClub}
        handleRefresh={handleRefresh}
        requestChangeClub={requestChangeClub}
      />

      {event.clubName && (
        <ViewToggle
          viewMode={viewMode}
          onChange={handleViewChange}
          hasPairings={hasPairings}
          showBadge={hasPairings && !hasViewedPairings}
        />
      )}

      {error && loading === null && (
        <Card className="bg-destructive/10 border-destructive/30 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      <TournamentContent
        tournament={tournament}
        event={event}
        loading={loading}
        viewMode={viewMode}
        handleRefresh={handleRefresh}
        needsClubSelection={needsClubSelection}
      />
    </>
  );
}

export default function TournamentTabs({ event, onEventUpdate }: TournamentTabsProps) {
  const {
    loading,
    error,
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
  } = useTournamentSync({ event, onEventUpdate });

  return (
    <>
      <Tabs
        defaultValue={event.tournaments[0]?.id}
        className="w-full"
        onValueChange={setActiveTab}
        aria-label="Gestion des tournois"
      >
        <TabsList className="glass-surface" role="tablist">
          {event.tournaments.map(tournament => (
            <TabsTrigger
              key={tournament.id}
              value={tournament.id}
              aria-label={`Tournoi ${tournament.name}`}
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
          >
            <TournamentPanel
              tournament={tournament}
              event={event}
              loading={loading}
              error={error}
              needsClubSelection={needsClubSelection}
              canChangeClub={canChangeClub}
              handleRefresh={handleRefresh}
              handleClubSelect={handleClubSelect}
              requestChangeClub={requestChangeClub}
            />
          </TabsContent>
        ))}
      </Tabs>

      <AlertDialog open={changeClubDialogOpen} onOpenChange={cancelChangeClub}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Changer de club</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera les données de {playerCount} joueur(s) chargés.
              Vous devrez recharger les résultats après avoir sélectionné un nouveau club.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChangeClub}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
