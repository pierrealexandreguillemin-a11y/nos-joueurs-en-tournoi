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
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-popover text-popover-foreground border border-border">
        Blancs
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-secondary text-secondary-foreground">
      Noirs
    </span>
  );
});

function renderResult(pairing: ClubPairing) {
  if (pairing.isExempt) return <span className="text-muted-foreground text-xs">Exempt</span>;
  if (pairing.result) return pairing.result;
  return <span className="text-muted-foreground text-xs italic">À jouer</span>;
}

interface PairingRowProps {
  pairing: ClubPairing;
  index: number;
}

const PairingRow = memo(function PairingRow({ pairing, index }: PairingRowProps) {
  return (
    <TableRow
      className={index % 2 === 0 ? 'bg-muted hover:bg-muted' : 'bg-card hover:bg-card'}
    >
      <TableCell className="text-center">
        <span className="text-xl font-bold text-foreground">{pairing.board}</span>
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
        {renderResult(pairing)}
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
      <Card className="glass-card text-center py-8">
        <p className="text-muted-foreground">
          Aucun joueur du club n&apos;est apparié dans cette ronde.
        </p>
      </Card>
    );
  }

  return (
    <Card className="glass-card overflow-hidden">
      <Table aria-label={`Appariements ronde ${pairingsRound}`}>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="text-center font-bold">Table</TableHead>
            <TableHead scope="col" className="font-bold">Joueur</TableHead>
            <TableHead scope="col" className="text-center font-bold">Couleur</TableHead>
            <TableHead scope="col" className="font-bold">Adversaire</TableHead>
            <TableHead scope="col" className="text-center font-bold">Elo adv.</TableHead>
            <TableHead scope="col" className="text-center font-bold">Résultat</TableHead>
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
    </Card>
  );
});
