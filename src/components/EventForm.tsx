'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Plus } from 'lucide-react';
import type { Event } from '@/types';

interface TournamentInput {
  name: string;
  url: string;
}

interface EventFormProps {
  onEventCreated: (event: Event) => void;
  onCancel?: () => void;
}

interface TournamentRowProps {
  tournament: TournamentInput;
  index: number;
  showRemove: boolean;
  onUpdate: (index: number, field: 'name' | 'url', value: string) => void;
  onRemove: (index: number) => void;
}

function TournamentRow({ tournament, index, showRemove, onUpdate, onRemove }: TournamentRowProps) {
  return (
    <div className="flex gap-2 items-end p-4 border rounded-lg bg-background/50">
      <div className="flex-1 space-y-2">
        <Label htmlFor={`tournament-name-${index}`}>
          Nom (ex: U12, U14)
        </Label>
        <Input
          id={`tournament-name-${index}`}
          placeholder="U12"
          value={tournament.name}
          onChange={(e) => onUpdate(index, 'name', e.target.value)}
        />
      </div>

      <div className="flex-[2] space-y-2">
        <Label htmlFor={`tournament-url-${index}`}>
          URL FFE Tournoi
        </Label>
        <Input
          id={`tournament-url-${index}`}
          type="url"
          placeholder="https://echecs.asso.fr/Resultats.aspx?..."
          value={tournament.url}
          onChange={(e) => onUpdate(index, 'url', e.target.value)}
        />
      </div>

      {showRemove && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => onRemove(index)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface TournamentsSectionProps {
  tournaments: TournamentInput[];
  onAdd: () => void;
  onUpdate: (index: number, field: 'name' | 'url', value: string) => void;
  onRemove: (index: number) => void;
}

function TournamentsSection({ tournaments, onAdd, onUpdate, onRemove }: TournamentsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Tournois *</Label>
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Ajouter un tournoi
        </Button>
      </div>
      {tournaments.map((tournament, index) => (
        <TournamentRow
          key={index}
          tournament={tournament}
          index={index}
          showRemove={tournaments.length > 1}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function FormActions({ onCancel }: { onCancel?: () => void }) {
  return (
    <div className="flex gap-2 justify-end">
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      )}
      <Button type="submit" variant="miami">
        Créer l&apos;événement
      </Button>
    </div>
  );
}

function validateEventForm(
  eventName: string,
  tournaments: TournamentInput[],
  setError: (msg: string) => void,
): boolean {
  if (!eventName.trim()) {
    setError('Le nom de l\'événement est requis');
    return false;
  }

  const validTournaments = tournaments.filter(t => t.name.trim() && t.url.trim());
  if (validTournaments.length === 0) {
    setError('Au moins un tournoi est requis');
    return false;
  }

  for (const tournament of validTournaments) {
    if (!tournament.url.includes('echecs.asso.fr')) {
      setError('Les URLs doivent provenir de echecs.asso.fr');
      return false;
    }
  }

  return true;
}

function buildEvent(eventName: string, clubName: string, tournaments: TournamentInput[]): Event {
  const validTournaments = tournaments.filter(t => t.name.trim() && t.url.trim());
  return {
    id: `event_${crypto.randomUUID()}`,
    name: eventName,
    ...(clubName.trim() ? { clubName: clubName.trim() } : {}),
    createdAt: new Date().toISOString(),
    tournaments: validTournaments.map((t) => ({
      id: `tournament_${crypto.randomUUID()}`,
      name: t.name,
      url: t.url,
      lastUpdate: '',
      players: [],
    })),
  };
}

export default function EventForm({ onEventCreated, onCancel }: EventFormProps) {
  const [eventName, setEventName] = useState('');
  const [clubName, setClubName] = useState('');
  const [tournaments, setTournaments] = useState<TournamentInput[]>([
    { name: '', url: '' },
  ]);
  const [error, setError] = useState('');

  const addTournament = () => {
    setTournaments([...tournaments, { name: '', url: '' }]);
  };

  const removeTournament = (index: number) => {
    if (tournaments.length > 1) {
      setTournaments(tournaments.filter((_, i) => i !== index));
    }
  };

  const updateTournament = (index: number, field: 'name' | 'url', value: string) => {
    const updated = [...tournaments];
    updated[index][field] = value;
    setTournaments(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEventForm(eventName, tournaments, setError)) return;
    setError('');
    onEventCreated(buildEvent(eventName, clubName, tournaments));
  };

  return (
    <Card className="miami-card">
      <CardHeader>
        <CardTitle>Créer un nouvel événement</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Name */}
          <div className="space-y-2">
            <Label htmlFor="eventName">Nom de l&apos;événement *</Label>
            <Input
              id="eventName"
              placeholder="Ex: Championnat départemental 13 - Oct 2025"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
          </div>

          {/* Club Name (optional) */}
          <div className="space-y-2">
            <Label htmlFor="clubName">Nom du club (optionnel)</Label>
            <Input
              id="clubName"
              placeholder="Sera détecté automatiquement au premier Actualiser"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Si vide, les clubs seront détectés depuis la page FFE
            </p>
          </div>

          <TournamentsSection
            tournaments={tournaments}
            onAdd={addTournament}
            onUpdate={updateTournament}
            onRemove={removeTournament}
          />

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FormActions onCancel={onCancel} />
        </form>
      </CardContent>
    </Card>
  );
}
