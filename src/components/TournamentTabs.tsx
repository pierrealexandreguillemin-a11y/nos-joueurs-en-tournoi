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
import type { Event } from '@/types';

interface TournamentTabsProps {
  event: Event;
  onEventUpdate: (event: Event) => void;
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

      {/* Change Club Confirmation Dialog */}
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
