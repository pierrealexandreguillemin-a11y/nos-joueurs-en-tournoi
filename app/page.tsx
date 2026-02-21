'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import NextDynamic from 'next/dynamic';
import { toast } from 'sonner';
import { createClubStorage, decodeEventFromURL } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import EventForm from '@/components/EventForm';
import TournamentTabs from '@/components/TournamentTabs';
import EventsManager from '@/components/EventsManager';
import ShareButton from '@/components/ShareButton';
import AnimationsToggle from '@/components/AnimationsToggle';
import ClubOnboarding from '@/components/ClubOnboarding';
import ClubHeader from '@/components/ClubHeader';
import DuplicateEventDialog from '@/components/DuplicateEventDialog';
import { useAnimations } from '@/contexts/AnimationsContext';
import { useClub } from '@/contexts/ClubContext';
import { Toaster } from 'sonner';
import type { Event } from '@/types';
import type { ExportedEvent } from '@/lib/storage';

const HalftoneWaves = NextDynamic(() => import('@/components/HalftoneWaves'), {
  ssr: false,
  loading: () => null,
});
const BackgroundPaths = NextDynamic(() => import('@/components/BackgroundPaths'), {
  ssr: false,
  loading: () => null,
});
const FloatingParticles = NextDynamic(() => import('@/components/common/FloatingParticles'), {
  ssr: false,
  loading: () => null,
});

// ── Shared style constants (sonarjs/no-duplicate-string) ─────────────
const MIAMI_GRADIENT = 'linear-gradient(135deg, #008E97 0%, #013369 25%, #013369 75%, #008E97 100%)';
const BLUR_SATURATE = 'blur(15px) saturate(130%)';

// ── Sub-components ───────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden" style={{ background: MIAMI_GRADIENT }}>
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Chargement...</div>
        </div>
      </div>
    </div>
  );
}

interface PageHeaderProps {
  currentEvent: Event | null;
  onEventChange: () => void;
  onNewEventClick: () => void;
}

function PageHeader({ currentEvent, onEventChange, onNewEventClick }: PageHeaderProps) {
  return (
    <header className="mb-6">
      <div className="rounded-lg p-6" style={{
        background: 'rgba(255, 255, 255, 0.22)',
        backdropFilter: BLUR_SATURATE,
        WebkitBackdropFilter: BLUR_SATURATE,
        border: '1px solid rgba(255, 255, 255, 0.28)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 16px rgba(0,0,0,0.15)',
      }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/chess-logo.png"
              alt="Nos Joueurs en Tournoi Logo"
              width={48}
              height={50}
              className="hidden md:block chess-logo"
              priority
              quality={90}
            />
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold cyberpunk-title">
              NOS JOUEURS EN TOURNOI
            </h1>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <Image
              src="/chess-logo.png"
              alt="Nos Joueurs en Tournoi Logo"
              width={40}
              height={42}
              className="chess-logo"
              priority
              quality={90}
            />
          </div>
          <nav className="flex items-center gap-1 md:gap-2 flex-wrap justify-end" aria-label="Actions principales">
            <ClubHeader />
            <AnimationsToggle />
            <ShareButton />
            <EventsManager
              currentEventId={currentEvent?.id || ''}
              onEventChange={onEventChange}
              onNewEventClick={onNewEventClick}
            />
          </nav>
        </div>
      </div>
    </header>
  );
}

function EmptyState({ onCreateEvent }: { onCreateEvent: () => void }) {
  return (
    <div className="rounded-lg p-12 text-center" style={{
      background: 'rgba(255, 255, 255, 0.12)',
      backdropFilter: BLUR_SATURATE,
      WebkitBackdropFilter: BLUR_SATURATE,
      border: '1px solid rgba(255, 255, 255, 0.18)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 16px rgba(0,0,0,0.15)',
    }}>
      <h2 className="text-xl font-semibold mb-2">Aucun événement actif</h2>
      <p className="text-muted-foreground mb-4">Créez un nouvel événement pour commencer</p>
      <Button variant="miami" onClick={onCreateEvent}>
        Créer un événement
      </Button>
    </div>
  );
}

// ── Share URL import hook (handles ?share= parameter) ────────────────

function useShareURLImport(
  identity: { clubSlug: string } | null,
  setCurrentEvent: (e: Event | null) => void,
  setShowEventForm: (v: boolean) => void,
  setPendingImport: (v: ExportedEvent | null) => void,
  setDuplicateDialogOpen: (v: boolean) => void,
) {
  useEffect(() => {
    if (!identity) return;
    const shareParam = new URLSearchParams(window.location.search).get('share');
    if (!shareParam) return;
    const exportedData = decodeEventFromURL(shareParam);
    const storage = createClubStorage(identity.clubSlug);
    if (exportedData) {
      if (exportedData.event && storage.getCurrentEvent()?.id === exportedData.event.id) {
        // Duplicate detected — prompt user for resolution
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPendingImport(exportedData);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDuplicateDialogOpen(true);
      } else {
        const result = storage.importEvent(exportedData);
        if (result.success) {
          toast.success('Événement importé avec succès !');
          setCurrentEvent(storage.getCurrentEvent());
          setShowEventForm(false);
        } else {
          toast.error('Erreur lors de l\'import de l\'événement');
        }
      }
    } else {
      toast.error('Lien de partage invalide');
    }
    window.history.replaceState({}, '', window.location.pathname);
  }, [identity, setCurrentEvent, setShowEventForm, setPendingImport, setDuplicateDialogOpen]);
}

// ── Custom hook: page state and handlers ─────────────────────────────

function useHomePage() {
  const { identity, isLoaded } = useClub();
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<ExportedEvent | null>(null);
  const [mounted, setMounted] = useState(false);

  const getStorage = useCallback(() => {
    if (!identity) return null;
    return createClubStorage(identity.clubSlug);
  }, [identity]);

  // Client-side hydration from localStorage on mount
  useEffect(() => {
    if (!isLoaded || !identity) {
      // Hydration flag — setState in effect is the standard React pattern for client-only init
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(isLoaded);
      return;
    }
    const storage = createClubStorage(identity.clubSlug);
    const event = storage.getCurrentEvent();
    // Hydration from localStorage — setState in effect is the standard React pattern
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentEvent(event);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowEventForm(!event);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, [isLoaded, identity]);

  useShareURLImport(identity, setCurrentEvent, setShowEventForm, setPendingImport, setDuplicateDialogOpen);

  const handleEventCreated = (event: Event) => {
    const storage = getStorage();
    if (!storage) return;
    storage.saveEvent(event);
    setCurrentEvent(event);
    setShowEventForm(false);
  };

  const handleEventChange = () => {
    const storage = getStorage();
    if (!storage) return;
    setCurrentEvent(storage.getCurrentEvent());
    setShowEventForm(false);
  };

  const handleDuplicateImport = (replace: boolean) => {
    if (!pendingImport) return;
    const storage = getStorage();
    if (!storage) return;
    const opts = replace ? { replaceIfExists: true } : { replaceIfExists: false, generateNewId: true };
    const result = storage.importEvent(pendingImport, opts);
    if (result.success) {
      toast.success(replace ? 'Événement remplacé avec succès !' : 'Copie de l\'événement créée !');
      setCurrentEvent(storage.getCurrentEvent());
      setShowEventForm(false);
    }
    setDuplicateDialogOpen(false);
    setPendingImport(null);
  };

  const handleDuplicateCancel = () => {
    setDuplicateDialogOpen(false);
    setPendingImport(null);
    toast.info('Import annulé');
  };

  return {
    isLoaded, identity, currentEvent, showEventForm, duplicateDialogOpen,
    pendingImport, mounted, setShowEventForm, setCurrentEvent,
    handleEventCreated, handleEventChange, handleDuplicateImport, handleDuplicateCancel,
  };
}

// ── Main component ───────────────────────────────────────────────────

export default function Home() {
  const { animationsEnabled } = useAnimations();
  const {
    isLoaded, identity, currentEvent, showEventForm, duplicateDialogOpen,
    pendingImport, mounted, setShowEventForm, setCurrentEvent,
    handleEventCreated, handleEventChange, handleDuplicateImport, handleDuplicateCancel,
  } = useHomePage();

  if (!isLoaded) return <LoadingScreen />;
  if (!identity) return <ClubOnboarding />;
  if (!mounted) return <LoadingScreen />;

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden" style={{ background: MIAMI_GRADIENT }}>
      <Toaster position="top-right" richColors />
      {animationsEnabled && (
        <>
          <HalftoneWaves />
          <BackgroundPaths />
          <FloatingParticles density={30} speed={1} />
        </>
      )}
      <div className="max-w-7xl mx-auto relative z-10">
        <PageHeader
          currentEvent={currentEvent}
          onEventChange={handleEventChange}
          onNewEventClick={() => setShowEventForm(true)}
        />
        {showEventForm && (
          <div className="mb-6">
            <EventForm
              onEventCreated={handleEventCreated}
              onCancel={() => setShowEventForm(false)}
            />
          </div>
        )}
        {currentEvent && !showEventForm && (
          <TournamentTabs event={currentEvent} onEventUpdate={setCurrentEvent} />
        )}
        {!currentEvent && !showEventForm && (
          <EmptyState onCreateEvent={() => setShowEventForm(true)} />
        )}
        <DuplicateEventDialog
          open={duplicateDialogOpen}
          eventName={pendingImport?.event.name || ''}
          onReplace={() => handleDuplicateImport(true)}
          onKeepBoth={() => handleDuplicateImport(false)}
          onCancel={handleDuplicateCancel}
        />
      </div>
    </div>
  );
}
