'use client';
import { Badge } from '@/components/ui/badge';
import { calculateClubStats } from '@/lib/parser';
import type { Player } from '@/types';

interface ClubStatsProps {
  eventName?: string;
  clubName?: string;
  players: Player[];
  currentRound: number;
}

export default function ClubStats({ eventName, clubName, players, currentRound }: ClubStatsProps) {
  const stats = calculateClubStats(players, currentRound);

  return (
    <div className="space-y-2 font-audiowide">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">
          Stats {clubName || 'Club'} - Ronde {stats.round}
        </h2>
        <Badge variant="info">{players.length} joueurs</Badge>
        {eventName && (
          <span className="text-base text-miami-aqua ml-2">
            {eventName}
          </span>
        )}
      </div>

      <div className="flex gap-6 text-sm">
        <div>
          <span className="text-muted-foreground">Score total: </span>
          <span className="font-semibold">
            {stats.totalPoints} points
          </span>
        </div>

        <div>
          <span className="text-muted-foreground">Moyenne: </span>
          <span className="font-semibold">
            {stats.averagePoints} pts/joueur
          </span>
        </div>
      </div>
    </div>
  );
}
