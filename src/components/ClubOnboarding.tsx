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
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #008E97 0%, #013369 25%, #013369 75%, #008E97 100%)'
    }}>
      <div className="w-full max-w-md rounded-lg p-8" style={{
        background: 'rgba(255, 255, 255, 0.22)',
        backdropFilter: 'blur(15px) saturate(130%)',
        WebkitBackdropFilter: 'blur(15px) saturate(130%)',
        border: '1px solid rgba(255, 255, 255, 0.28)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 16px rgba(0,0,0,0.15)'
      }}>
        <h1 className="text-2xl font-bold text-center mb-2 cyberpunk-title">
          NOS JOUEURS EN TOURNOI
        </h1>
        <p className="text-center text-white/80 mb-6">
          Identifiez votre club pour commencer
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="clubName" className="text-white font-semibold">
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
              className="mt-1 bg-white/90 border-white/30 text-miami-navy placeholder:text-miami-navy/50"
              autoFocus
            />
            {error && (
              <p className="text-red-300 text-sm mt-1">{error}</p>
            )}
          </div>

          {slug && (
            <div className="text-sm text-white/70">
              Identifiant : <code className="bg-white/20 px-2 py-0.5 rounded text-white">{slug}</code>
            </div>
          )}

          <Button
            type="submit"
            variant="miami"
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
