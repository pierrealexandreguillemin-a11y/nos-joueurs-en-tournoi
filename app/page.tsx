'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import NextDynamic from 'next/dynamic';
import { toast } from 'sonner';
import { createClubStorage, decodeEventFromURL, importEvent } from '@/lib/storage';
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

// Dynamic imports pour les composants d'animation (client-only, lourds)
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

export default function Home() {
  const { animationsEnabled } = useAnimations();
  const { identity, isLoaded } = useClub();

  // Initialize with null to avoid hydration mismatch
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<ExportedEvent | null>(null);
  const [mounted, setMounted] = useState(false);

  // Get club-scoped storage
  const getStorage = useCallback(() => {
    if (!identity) return null;
    return createClubStorage(identity.clubSlug);
  }, [identity]);

  // Load state from localStorage after mount (client-side only)
  useEffect(() => {
    if (!isLoaded || !identity) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(isLoaded);
      return;
    }
    const storage = createClubStorage(identity.clubSlug);
    const event = storage.getCurrentEvent();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentEvent(event);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowEventForm(!event);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, [isLoaded, identity]);

  useEffect(() => {
    if (!identity) return;
    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get('share');

    if (shareParam) {
      const exportedData = decodeEventFromURL(shareParam);
      const storage = createClubStorage(identity.clubSlug);

      if (exportedData) {
        const isDuplicate = exportedData.event && storage.getCurrentEvent()?.id === exportedData.event.id;

        if (isDuplicate) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setPendingImport(exportedData);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setDuplicateDialogOpen(true);
        } else {
          const result = importEvent(exportedData);
          if (result.success) {
            toast.success('Événement importé avec succès !');
            setCurrentEvent(storage.getCurrentEvent());
            setShowEventForm(false);
          } else {
            toast.error('Erreur lors de l\'import de l\'événement');
          }
        }

        window.history.replaceState({}, '', window.location.pathname);
      } else {
        toast.error('Lien de partage invalide');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [identity]);

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

  const handleDuplicateReplace = () => {
    if (!pendingImport) return;
    const result = importEvent(pendingImport, { replaceIfExists: true });
    if (result.success) {
      toast.success('Événement remplacé avec succès !');
      const storage = getStorage();
      if (storage) setCurrentEvent(storage.getCurrentEvent());
      setShowEventForm(false);
    }
    setDuplicateDialogOpen(false);
    setPendingImport(null);
  };

  const handleDuplicateKeepBoth = () => {
    if (!pendingImport) return;
    const result = importEvent(pendingImport, { replaceIfExists: false, generateNewId: true });
    if (result.success) {
      toast.success('Copie de l\'événement créée !');
      const storage = getStorage();
      if (storage) setCurrentEvent(storage.getCurrentEvent());
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

  // Wait for club context to load
  if (!isLoaded) {
    return (
      <div className="min-h-screen p-4 md:p-8 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #008E97 0%, #013369 25%, #013369 75%, #008E97 100%)'
      }}>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-white text-xl">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  // Gate: no club identity → show onboarding
  if (!identity) {
    return <ClubOnboarding />;
  }

  // Show loading state during hydration
  if (!mounted) {
    return (
      <div className="min-h-screen p-4 md:p-8 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #008E97 0%, #013369 25%, #013369 75%, #008E97 100%)'
      }}>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-white text-xl">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #008E97 0%, #013369 25%, #013369 75%, #008E97 100%)'
    }}>
      <Toaster position="top-right" richColors />
      {animationsEnabled && (
        <>
          <HalftoneWaves />
          <BackgroundPaths />
          <FloatingParticles density={30} speed={1} />
        </>
      )}
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-6">
          <div className="rounded-lg p-6" style={{
            background: 'rgba(255, 255, 255, 0.22)',
            backdropFilter: 'blur(15px) saturate(130%)',
            WebkitBackdropFilter: 'blur(15px) saturate(130%)',
            border: '1px solid rgba(255, 255, 255, 0.28)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 16px rgba(0,0,0,0.15)'
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
              <div className="flex items-center gap-2">
                <ClubHeader />
                <AnimationsToggle />
                <ShareButton />
                <EventsManager
                  currentEventId={currentEvent?.id || ''}
                  onEventChange={handleEventChange}
                  onNewEventClick={() => setShowEventForm(true)}
                />
              </div>
            </div>
          </div>
        </header>

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
          <div className="rounded-lg p-12 text-center" style={{
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(15px) saturate(130%)',
            WebkitBackdropFilter: 'blur(15px) saturate(130%)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 16px rgba(0,0,0,0.15)'
          }}>
            <h2 className="text-xl font-semibold mb-2">Aucun événement actif</h2>
            <p className="text-muted-foreground mb-4">Créez un nouvel événement pour commencer</p>
            <Button variant="miami" onClick={() => setShowEventForm(true)}>
              Créer un événement
            </Button>
          </div>
        )}

        <DuplicateEventDialog
          open={duplicateDialogOpen}
          eventName={pendingImport?.event.name || ''}
          onReplace={handleDuplicateReplace}
          onKeepBoth={handleDuplicateKeepBoth}
          onCancel={handleDuplicateCancel}
        />
      </div>
    </div>
  );
}
