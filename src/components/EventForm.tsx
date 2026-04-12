'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { isValidFFeUrl, isValidEventName, isValidTournamentName } from '@/lib/validation';
import type { Event } from '@/types';

interface TournamentInput {
  id: string;
  name: string;
  url: string;
}

interface EventFormProps {
  onEventCreated: (event: Event) => void;
  onCancel?: () => void;
}

function FieldError({ id, error }: { id?: string; error?: string }) {
  if (!error) return null;
  return <p id={id} className="text-xs text-destructive animate-in fade-in-0 duration-200">{error}</p>;
}

interface TournamentRowProps {
  tournament: TournamentInput;
  index: number;
  showRemove: boolean;
  onUpdate: (index: number, field: 'name' | 'url', value: string) => void;
  onRemove: (index: number) => void;
  fieldErrors: Record<string, string>;
  onFieldBlur: (field: string, value: string) => void;
}

function TournamentRow({ tournament, index, showRemove, onUpdate, onRemove, fieldErrors, onFieldBlur }: TournamentRowProps) {
  const nameKey = `name-${tournament.id}`;
  const urlKey = `url-${tournament.id}`;

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-end p-4 border rounded-lg bg-background/50">
      <div className="flex-1 space-y-2">
        <Label htmlFor={`tournament-name-${index}`}>
          {showRemove ? `Catégorie (tournoi ${index + 1})` : 'Catégorie'}
        </Label>
        <Input
          id={`tournament-name-${index}`}
          placeholder="Ex: U12, Open, Seniors"
          value={tournament.name}
          onChange={(e) => onUpdate(index, 'name', e.target.value)}
          onBlur={() => onFieldBlur(nameKey, tournament.name)}
          aria-invalid={!!fieldErrors[nameKey]}
          aria-describedby={fieldErrors[nameKey] ? `error-${nameKey}` : undefined}
        />
        <FieldError id={`error-${nameKey}`} error={fieldErrors[nameKey]} />
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
          onBlur={() => onFieldBlur(urlKey, tournament.url)}
          aria-invalid={!!fieldErrors[urlKey]}
          aria-describedby={fieldErrors[urlKey] ? `error-${urlKey}` : undefined}
        />
        <FieldError id={`error-${urlKey}`} error={fieldErrors[urlKey]} />
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
  fieldErrors: Record<string, string>;
  onFieldBlur: (field: string, value: string) => void;
}

function TournamentsSection({ tournaments, onAdd, onUpdate, onRemove, fieldErrors, onFieldBlur }: TournamentsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Tournois *</Label>
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Ajouter un tournoi
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Pour chaque tournoi, copiez l&apos;URL depuis echecs.asso.fr &gt; votre tournoi &gt; page Résultats.
      </p>
      {tournaments.map((tournament, index) => (
        <TournamentRow
          key={tournament.id}
          tournament={tournament}
          index={index}
          showRemove={tournaments.length > 1}
          onUpdate={onUpdate}
          onRemove={onRemove}
          fieldErrors={fieldErrors}
          onFieldBlur={onFieldBlur}
        />
      ))}
    </div>
  );
}

interface EventFieldsProps {
  eventName: string;
  clubName: string;
  onEventNameChange: (v: string) => void;
  onClubNameChange: (v: string) => void;
  fieldErrors: Record<string, string>;
  onFieldBlur: (field: string, value: string) => void;
}

function EventFields({ eventName, clubName, onEventNameChange, onClubNameChange, fieldErrors, onFieldBlur }: EventFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="eventName">Nom de l&apos;événement *</Label>
        <Input
          id="eventName"
          placeholder="Ex: Championnat départemental 13 - Oct 2025"
          value={eventName}
          onChange={(e) => onEventNameChange(e.target.value)}
          onBlur={() => onFieldBlur('eventName', eventName)}
          aria-invalid={!!fieldErrors.eventName}
          aria-describedby={fieldErrors.eventName ? 'error-eventName' : undefined}
          autoFocus
        />
        <FieldError id="error-eventName" error={fieldErrors.eventName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="clubName">Nom d&apos;affichage du club (optionnel)</Label>
        <Input
          id="clubName"
          placeholder="Auto-détecté au premier Actualiser si vide"
          value={clubName}
          onChange={(e) => onClubNameChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Si vide, le nom du club sera détecté automatiquement depuis la page FFE.
        </p>
      </div>
    </>
  );
}

function FormActions({ onCancel, hasErrors }: { onCancel?: () => void; hasErrors?: boolean }) {
  return (
    <div className="flex gap-2 justify-end">
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      )}
      <Button type="submit" variant="gradient" disabled={hasErrors}>
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

  if (!isValidEventName(eventName)) {
    setError('Le nom de l\'événement doit faire 3 caractères minimum');
    return false;
  }

  const validTournaments = tournaments.filter(t => t.name.trim() && t.url.trim());
  if (validTournaments.length === 0) {
    setError('Au moins un tournoi est requis');
    return false;
  }

  for (const tournament of validTournaments) {
    if (!isValidTournamentName(tournament.name)) {
      setError('Le nom de catégorie doit faire 2 caractères minimum');
      return false;
    }
    if (!isValidFFeUrl(tournament.url)) {
      setError('Les URLs doivent provenir de echecs.asso.fr (incluez https://)');
      return false;
    }
  }

  const urls = validTournaments.map(t => t.url.trim());
  if (new Set(urls).size < urls.length) {
    setError('Une même URL est utilisée plusieurs fois');
    return false;
  }

  return true;
}

function getFieldError(field: string, value: string): string | null {
  if (!value.trim()) return null;
  if (field === 'eventName' && !isValidEventName(value)) return '3 caractères minimum';
  if (field.startsWith('url-') && !isValidFFeUrl(value)) return 'L\'URL doit provenir de echecs.asso.fr';
  if (field.startsWith('name-') && !isValidTournamentName(value)) return '2 caractères minimum';
  return null;
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

function applyFieldValidation(
  setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  field: string,
  value: string,
) {
  const err = getFieldError(field, value);
  setFieldErrors(prev => {
    const next = { ...prev };
    if (err) { next[field] = err; } else { delete next[field]; }
    return next;
  });
}

function warnPartialRows(tournaments: TournamentInput[]) {
  const partial = tournaments.filter(t =>
    (t.name.trim() && !t.url.trim()) || (!t.name.trim() && t.url.trim())
  );
  if (partial.length > 0) {
    toast.info(`${partial.length} tournoi(s) incomplet(s) ignoré(s)`);
  }
}

export default function EventForm({ onEventCreated, onCancel }: EventFormProps) {
  const [eventName, setEventName] = useState('');
  const [clubName, setClubName] = useState('');
  const [tournaments, setTournaments] = useState<TournamentInput[]>([
    { id: crypto.randomUUID(), name: '', url: '' },
  ]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateField = (field: string, value: string) => applyFieldValidation(setFieldErrors, field, value);

  const removeTournament = (index: number) => {
    if (tournaments.length <= 1) return;
    const removedId = tournaments[index].id;
    setTournaments(tournaments.filter((_, i) => i !== index));
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next[`name-${removedId}`];
      delete next[`url-${removedId}`];
      return next;
    });
  };

  const updateTournament = (index: number, field: 'name' | 'url', value: string) => {
    const updated = [...tournaments];
    updated[index][field] = value;
    setTournaments(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEventForm(eventName, tournaments, setError)) {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>('[aria-invalid="true"]');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus();
      });
      return;
    }
    setError('');
    warnPartialRows(tournaments);
    onEventCreated(buildEvent(eventName, clubName, tournaments));
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Créer un nouvel événement</CardTitle>
        <p className="text-sm text-muted-foreground">
          Un événement regroupe un ou plusieurs tournois FFE suivis simultanément.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <EventFields
            eventName={eventName}
            clubName={clubName}
            onEventNameChange={setEventName}
            onClubNameChange={setClubName}
            fieldErrors={fieldErrors}
            onFieldBlur={validateField}
          />
          <TournamentsSection
            tournaments={tournaments}
            onAdd={() => setTournaments([...tournaments, { id: crypto.randomUUID(), name: '', url: '' }])}
            onUpdate={updateTournament}
            onRemove={removeTournament}
            fieldErrors={fieldErrors}
            onFieldBlur={validateField}
          />
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <FormActions onCancel={onCancel} hasErrors={Object.keys(fieldErrors).length > 0} />
        </form>
      </CardContent>
    </Card>
  );
}
