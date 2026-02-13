'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Users } from 'lucide-react';
import type { ClubInfo } from '@/types';

interface ClubSelectorProps {
  clubs: ClubInfo[];
  onSelect: (clubName: string) => void;
}

export default function ClubSelector({ clubs, onSelect }: ClubSelectorProps) {
  const [selected, setSelected] = useState('');

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-miami-aqua" aria-hidden="true" />
        <Label htmlFor="club-select" className="text-sm font-semibold">
          Choisissez votre club
        </Label>
      </div>
      <p className="text-xs text-muted-foreground">
        {clubs.length} clubs détectés dans ce tournoi
      </p>
      <select
        id="club-select"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full rounded-md border border-white/20 bg-white/10 backdrop-blur-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-miami-aqua/50"
        aria-label="Sélectionner un club"
      >
        <option value="" disabled>
          -- Sélectionnez un club --
        </option>
        {clubs.map((club) => (
          <option key={club.name} value={club.name}>
            {club.name} ({club.playerCount} joueur{club.playerCount > 1 ? 's' : ''})
          </option>
        ))}
      </select>
      <Button
        variant="miami"
        size="sm"
        onClick={handleConfirm}
        disabled={!selected}
        className="w-full"
      >
        Valider le choix du club
      </Button>
    </div>
  );
}
