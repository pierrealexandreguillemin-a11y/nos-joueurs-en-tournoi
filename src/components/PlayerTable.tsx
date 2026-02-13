'use client';
import { useState, useEffect } from 'react';
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
import { setValidation, getValidation } from '@/lib/storage';
import type { Tournament } from '@/types';

interface PlayerTableProps {
  tournament: Tournament;
}

export default function PlayerTable({ tournament }: PlayerTableProps) {
  // Load validation state using lazy initialization
  const [validationState, setValidationState] = useState<Record<string, Record<number, boolean>>>(() => {
    const state: Record<string, Record<number, boolean>> = {};
    tournament.players.forEach(player => {
      state[player.name] = {};
      player.results.forEach((_, roundIndex) => {
        state[player.name][roundIndex + 1] = getValidation(
          tournament.id,
          player.name,
          roundIndex + 1
        );
      });
    });
    return state;
  });

  // Update validation state when tournament changes (sync with localStorage)
  useEffect(() => {
    const state: Record<string, Record<number, boolean>> = {};
    tournament.players.forEach(player => {
      state[player.name] = {};
      player.results.forEach((_, roundIndex) => {
        state[player.name][roundIndex + 1] = getValidation(
          tournament.id,
          player.name,
          roundIndex + 1
        );
      });
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValidationState(state);
  }, [tournament.id, tournament.players]);

  const handleValidationChange = (playerName: string, round: number, checked: boolean) => {
    setValidation(tournament.id, playerName, round, checked);
    setValidationState(prev => ({
      ...prev,
      [playerName]: {
        ...prev[playerName],
        [round]: checked,
      },
    }));
  };

  const getScoreDisplay = (score: 0 | 0.5 | 1): string => {
    return score.toString();
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
        <Table>
          <TableHeader>
            {/* Club Totals Row - First row in header */}
            <TableRow className="bg-gradient-to-r from-miami-aqua/10 to-miami-navy/10 border-b-2 border-miami-aqua/30">
              <TableHead className="font-bold text-miami-navy">Total Club</TableHead>
              <TableHead className="text-center">-</TableHead>
              {clubTotalsPerRound.map((total, i) => (
                <TableHead key={i} className="text-center font-bold text-miami-aqua">
                  {total > 0 ? total : '-'}
                </TableHead>
              ))}
              <TableHead className="text-center">-</TableHead>
              <TableHead className="text-center">-</TableHead>
              <TableHead className="text-center">-</TableHead>
              <TableHead className="text-center">-</TableHead>
              <TableHead className="text-center">-</TableHead>
            </TableRow>
            {/* Column Headers */}
            <TableRow>
              <TableHead className="font-bold">Nom</TableHead>
              <TableHead className="font-bold text-center">Elo</TableHead>
              {Array.from({ length: maxRounds }, (_, i) => (
                <TableHead key={i} className="text-center font-bold">
                  R{i + 1}
                </TableHead>
              ))}
              <TableHead className="text-center font-bold">Pts</TableHead>
              <TableHead className="text-center font-bold">Tr.</TableHead>
              <TableHead className="text-center font-bold">Buch.</TableHead>
              <TableHead className="text-center font-bold">Perf</TableHead>
              <TableHead className="text-center font-bold">Class.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tournament.players.map((player, playerIndex) => (
              <TableRow
                key={player.name}
                className={playerIndex % 2 === 0 ? 'bg-white/10 hover:bg-white/10' : 'bg-miami-aqua/3 hover:bg-miami-aqua/3'}
              >
                <TableCell className="font-medium">{player.name}</TableCell>
                <TableCell className="text-center">{player.elo}</TableCell>

                {/* Round Results with Validation */}
                {Array.from({ length: maxRounds }, (_, i) => {
                  const result = player.results[i];
                  const round = i + 1;
                  const isValidated = validationState[player.name]?.[round] || false;

                  return (
                    <TableCell key={i} className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {result ? (
                          <>
                            <span className="font-medium">
                              {getScoreDisplay(result.score)}
                            </span>
                            <Checkbox
                              checked={isValidated}
                              onCheckedChange={(checked) =>
                                handleValidationChange(
                                  player.name,
                                  round,
                                  checked as boolean
                                )
                              }
                              title={`Valider R${round} pour ${player.name}`}
                            />
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                  );
                })}

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
