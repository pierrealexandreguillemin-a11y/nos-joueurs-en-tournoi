'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import ClubStats from '@/components/ClubStats';
import ClubSelector from '@/components/ClubSelector';
import PlayerTable from '@/components/PlayerTable';
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
  const hasPlayers = tournament.players.length > 0;

  return (
    <>
      {needsClubSelection && (
        <Card className="miami-card">
          <ClubSelector
            clubs={event.availableClubs!}
            onSelect={handleClubSelect}
          />
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

      {error && loading === null && (
        <Card className="bg-red-50 border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </Card>
      )}

      {hasPlayers && <PlayerTable tournament={tournament} />}

      {!hasPlayers && !loading && !needsClubSelection && (
        <Card className="miami-card text-center py-8">
          <p className="text-muted-foreground">
            {event.clubName
              ? `Aucun joueur ${event.clubName} trouvé dans ce tournoi`
              : 'Cliquez sur Actualiser pour détecter les clubs du tournoi'}
          </p>
          {!event.clubName && (
            <Button
              variant="miami"
              size="sm"
              className="mt-4"
              onClick={() => handleRefresh(tournament)}
            >
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Actualiser
            </Button>
          )}
        </Card>
      )}
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
