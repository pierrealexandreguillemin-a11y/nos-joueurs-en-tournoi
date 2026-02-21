'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
// Icons removed - displaying text scores (1/0/0.5) instead
import { createClubStorage } from '@/lib/storage';
import { useClub } from '@/contexts/ClubContext';
import type { Tournament, Player } from '@/types';

interface PlayerTableProps {
  tournament: Tournament;
}

type ValidationMap = Record<string, Record<number, boolean>>;

type ClubStorage = ReturnType<typeof createClubStorage>;

function buildValidationState(
  tournamentId: string,
  players: Player[],
  storage: ClubStorage
): ValidationMap {
  const state: ValidationMap = {};
  players.forEach(player => {
    state[player.name] = {};
    player.results.forEach((_, roundIndex) => {
      state[player.name][roundIndex + 1] = storage.getValidation(
        tournamentId,
        player.name,
        roundIndex + 1
      );
    });
  });
  return state;
}

interface ClubTotalsRowProps {
  clubTotalsPerRound: number[];
}

function ClubTotalsRow({ clubTotalsPerRound }: ClubTotalsRowProps) {
  return (
    <TableRow className="bg-gradient-to-r from-miami-aqua/10 to-miami-navy/10 border-b-2 border-miami-aqua/30">
      <TableHead className="font-bold text-miami-navy" title="Score cumulé de tous les joueurs du club par ronde">Total Club</TableHead>
      <TableHead className="text-center">-</TableHead>
      {clubTotalsPerRound.map((total, i) => (
        <TableHead key={`round-${i}`} className="text-center font-bold text-miami-aqua">
          {total > 0 ? total : '-'}
        </TableHead>
      ))}
      <TableHead className="text-center">-</TableHead>
      <TableHead className="text-center">-</TableHead>
      <TableHead className="text-center">-</TableHead>
      <TableHead className="text-center">-</TableHead>
      <TableHead className="text-center">-</TableHead>
    </TableRow>
  );
}

interface ColumnHeadersRowProps {
  maxRounds: number;
}

function ColumnHeadersRow({ maxRounds }: ColumnHeadersRowProps) {
  return (
    <TableRow>
      <TableHead className="font-bold">Nom</TableHead>
      <TableHead className="font-bold text-center">Elo</TableHead>
      {Array.from({ length: maxRounds }, (_, i) => (
        <TableHead key={`round-${i}`} className="text-center font-bold">
          R{i + 1}
        </TableHead>
      ))}
      <TableHead className="text-center font-bold">Pts</TableHead>
      <TableHead className="text-center font-bold" title="Départage (Tiebreak)">Tr.</TableHead>
      <TableHead className="text-center font-bold" title="Buchholz">Buch.</TableHead>
      <TableHead className="text-center font-bold" title="Performance Elo">Perf</TableHead>
      <TableHead className="text-center font-bold" title="Classement">Class.</TableHead>
    </TableRow>
  );
}

interface RoundCellProps {
  player: Player;
  roundIndex: number;
  isValidated: boolean;
  tournamentId: string;
  onValidationChange: (playerName: string, round: number, checked: boolean) => void;
}

function RoundCell({ player, roundIndex, isValidated, onValidationChange }: RoundCellProps) {
  const result = player.results[roundIndex];
  const round = roundIndex + 1;

  return (
    <TableCell className="text-center">
      <div className="flex items-center justify-center gap-2">
        {result ? (
          <>
            <span className="font-medium">
              {result.score.toString()}
            </span>
            <Checkbox
              checked={isValidated}
              onCheckedChange={(checked) =>
                onValidationChange(player.name, round, checked as boolean)
              }
              title={`Valider R${round} pour ${player.name}`}
              aria-label={`Valider ronde ${round} pour ${player.name}`}
            />
          </>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </div>
    </TableCell>
  );
}

interface PlayerRowProps {
  player: Player;
  playerIndex: number;
  maxRounds: number;
  validationState: ValidationMap;
  tournamentId: string;
  onValidationChange: (playerName: string, round: number, checked: boolean) => void;
}

function PlayerRow({ player, playerIndex, maxRounds, validationState, tournamentId, onValidationChange }: PlayerRowProps) {
  return (
    <TableRow
      className={playerIndex % 2 === 0 ? 'bg-white/10 hover:bg-white/10' : 'bg-miami-aqua/3 hover:bg-miami-aqua/3'}
    >
      <TableCell className="font-medium">{player.name}</TableCell>
      <TableCell className="text-center">{player.elo}</TableCell>

      {/* Round Results with Validation */}
      {Array.from({ length: maxRounds }, (_, i) => (
        <RoundCell
          key={`round-${i}`}
          player={player}
          roundIndex={i}
          isValidated={validationState[player.name]?.[i + 1] || false}
          tournamentId={tournamentId}
          onValidationChange={onValidationChange}
        />
      ))}

      <TableCell className="text-center font-semibold">
        {player.currentPoints}
      </TableCell>
      <TableCell className="text-center">
        {player.tiebreak ? player.tiebreak.toFixed(1) : '-'}
      </TableCell>
      <TableCell className="text-center">
        {player.buchholz ? player.buchholz.toFixed(1) : '-'}
      </TableCell>
      <TableCell className="text-center">
        {player.performance || '-'}
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="outline">{player.ranking}</Badge>
      </TableCell>
    </TableRow>
  );
}

export default function PlayerTable({ tournament }: PlayerTableProps) {
  const { identity } = useClub();
  const clubSlug = identity?.clubSlug || '';
  const storage = useMemo(() => clubSlug ? createClubStorage(clubSlug) : null, [clubSlug]);

  // Load validation state using lazy initialization
  const [validationState, setValidationState] = useState<ValidationMap>(() => {
    if (!storage) return {};
    return buildValidationState(tournament.id, tournament.players, storage);
  });

  // Update validation state when tournament changes (sync with localStorage)
  useEffect(() => {
    if (!storage) return;
    // Justification: Validation state must re-sync from localStorage when tournament data changes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValidationState(buildValidationState(tournament.id, tournament.players, storage));
  }, [tournament.id, tournament.players, storage]);

  const handleValidationChange = (playerName: string, round: number, checked: boolean) => {
    storage?.setValidation(tournament.id, playerName, round, checked);
    setValidationState(prev => ({
      ...prev,
      [playerName]: {
        ...prev[playerName],
        [round]: checked,
      },
    }));
  };

  const maxRounds = Math.max(...tournament.players.map(p => p.results.length), 0);

  // Calculate club totals per round
  const clubTotalsPerRound = Array.from({ length: maxRounds }, (_, roundIndex) => {
    return tournament.players.reduce((sum, player) => {
      const result = player.results[roundIndex];
      return sum + (result?.score || 0);
    }, 0);
  });

  return (
    <Card className="miami-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table aria-label={`Résultats des joueurs — ${tournament.name}`}>
          <TableHeader>
            <ClubTotalsRow clubTotalsPerRound={clubTotalsPerRound} />
            <ColumnHeadersRow maxRounds={maxRounds} />
          </TableHeader>
          <TableBody>
            {tournament.players.map((player, playerIndex) => (
              <PlayerRow
                key={player.name}
                player={player}
                playerIndex={playerIndex}
                maxRounds={maxRounds}
                validationState={validationState}
                tournamentId={tournament.id}
                onValidationChange={handleValidationChange}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {tournament.players.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Aucun joueur à afficher
        </div>
      )}
    </Card>
  );
}
