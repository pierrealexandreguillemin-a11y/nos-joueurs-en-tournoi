'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { slugifyClubName } from '@/lib/club';
import { useClub } from '@/contexts/ClubContext';
export default function ClubOnboarding() {
  const { setClub } = useClub();
  const [clubName, setClubName] = useState('');
  const [error, setError] = useState('');

  const slug = (() => {
    try {
      return clubName.trim() ? slugifyClubName(clubName) : '';
    } catch {
      return '';
    }
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = clubName.trim();
    if (!trimmed) {
      setError('Veuillez entrer le nom de votre club');
      return;
    }
    try {
      setClub(trimmed);
    } catch {
      setError('Nom de club invalide');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 page-background">
      <div className="glass-card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center mb-2 cyberpunk-title">
          NOS JOUEURS EN TOURNOI
        </h1>
        <p className="text-center text-foreground/80 mb-6">
          Identifiez votre club pour commencer
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="clubName" className="text-foreground font-semibold">
              Nom de votre club
            </Label>
            <Input
              id="clubName"
              type="text"
              value={clubName}
              onChange={(e) => {
                setClubName(e.target.value);
                setError('');
              }}
              placeholder="Ex : Hay Chess, Marseille-Echecs..."
              className="mt-1 bg-popover/90 border-foreground/30 text-popover-foreground placeholder:text-popover-foreground/50"
              autoFocus
            />
            {error && (
              <p className="text-destructive text-sm mt-1">{error}</p>
            )}
          </div>

          {slug && (
            <div className="text-sm text-foreground/70">
              Identifiant : <code className="bg-foreground/20 px-2 py-0.5 rounded text-foreground">{slug}</code>
            </div>
          )}

          <Button
            type="submit"
            variant="gradient"
            className="w-full"
            disabled={!clubName.trim()}
          >
            Commencer
          </Button>
        </form>
      </div>
    </div>
  );
}
