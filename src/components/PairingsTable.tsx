'use client';
import { memo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import type { ClubPairing, PairingColor } from '@/types';

interface ColorBadgeProps {
  color: PairingColor;
}

const ColorBadge = memo(function ColorBadge({ color }: ColorBadgeProps) {
  if (color === 'white') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-white text-black border border-gray-300">
        Blancs
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-900 text-white">
      Noirs
    </span>
  );
});

interface PairingRowProps {
  pairing: ClubPairing;
  index: number;
}

const PairingRow = memo(function PairingRow({ pairing, index }: PairingRowProps) {
  return (
    <TableRow
      className={index % 2 === 0 ? 'bg-white/10 hover:bg-white/10' : 'bg-miami-aqua/3 hover:bg-miami-aqua/3'}
    >
      <TableCell className="text-center">
        <span className="text-xl font-bold text-miami-navy">{pairing.board}</span>
      </TableCell>
      <TableCell className="font-medium">{pairing.clubPlayerName}</TableCell>
      <TableCell className="text-center">
        <ColorBadge color={pairing.color} />
      </TableCell>
      <TableCell className="font-medium">
        {pairing.isExempt ? (
          <span className="text-muted-foreground italic">Exempt</span>
        ) : (
          pairing.opponentName
        )}
      </TableCell>
      <TableCell className="text-center">
        {pairing.isExempt ? '-' : pairing.opponentElo}
      </TableCell>
      <TableCell className="text-center font-semibold">
        {pairing.result || '-'}
      </TableCell>
    </TableRow>
  );
});

interface PairingsTableProps {
  pairings: ClubPairing[];
  pairingsRound: number;
}

export default memo(function PairingsTable({ pairings, pairingsRound }: PairingsTableProps) {
  if (pairings.length === 0) {
    return (
      <Card className="miami-card text-center py-8">
        <p className="text-muted-foreground">
          Aucun appariement disponible pour vos joueurs.
        </p>
      </Card>
    );
  }

  return (
    <Card className="miami-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table aria-label={`Appariements ronde ${pairingsRound}`}>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center font-bold" title="Numéro échiquier">Ech.</TableHead>
              <TableHead className="font-bold">Joueur</TableHead>
              <TableHead className="text-center font-bold">Couleur</TableHead>
              <TableHead className="font-bold">Adversaire</TableHead>
              <TableHead className="text-center font-bold">Elo Adv.</TableHead>
              <TableHead className="text-center font-bold">Res.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pairings.map((pairing, index) => (
              <PairingRow
                key={`${pairing.board}-${pairing.clubPlayerName}`}
                pairing={pairing}
                index={index}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
});
