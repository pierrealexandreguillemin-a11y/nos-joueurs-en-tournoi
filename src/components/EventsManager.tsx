'use client';
import { useState, useRef, useMemo, useCallback } from 'react';
import { Trash2, CheckCircle2, Download, Upload, Share2, CloudDownload, CloudUpload } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  createClubStorage,
  type ExportedEvent,
} from '@/lib/storage';
import { syncToUpstash, fetchFromUpstash } from '@/lib/sync';
import DuplicateEventDialog from '@/components/DuplicateEventDialog';
import ShareEventModal from '@/components/ShareEventModal';
import { useClub } from '@/contexts/ClubContext';
import type { Event } from '@/types';

interface EventsManagerProps {
  currentEventId: string;
  onEventChange: () => void;
  onNewEventClick: () => void;
}

interface EventCardProps {
  event: Event;
  isCurrent: boolean;
  onSwitch: (eventId: string) => void;
  onExport: (eventId: string) => void;
  onDelete: (eventId: string) => void;
  onCloudUpload: () => void;
}

function EventCard({ event, isCurrent, onSwitch, onExport, onDelete, onCloudUpload }: EventCardProps) {
  return (
    <Card
      className={`p-4 cursor-pointer transition-all ${
        isCurrent
          ? 'bg-gradient-to-r from-miami-aqua/20 to-miami-navy/10 border-miami-aqua/50 shadow-lg'
          : 'miami-glass-foreground hover:border-miami-aqua/30 hover:shadow-md'
      }`}
      onClick={() => onSwitch(event.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-miami-aqua">{event.name}</h3>
            {isCurrent && (
              <Badge className="bg-miami-aqua text-white">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Actif
              </Badge>
            )}
          </div>
          <div className="text-sm text-miami-aqua/70 space-y-1">
            <div>{event.tournaments.length} tournoi(s)</div>
            <div className="text-xs">
              Créé le {new Date(event.createdAt).toLocaleDateString('fr-FR')}
            </div>
          </div>
        </div>
        <EventCardActions
          event={event}
          onExport={onExport}
          onDelete={onDelete}
          onCloudUpload={onCloudUpload}
        />
      </div>
    </Card>
  );
}

interface EventCardActionsProps {
  event: Event;
  onExport: (eventId: string) => void;
  onDelete: (eventId: string) => void;
  onCloudUpload: () => void;
}

function EventCardActions({ event, onExport, onDelete, onCloudUpload }: EventCardActionsProps) {
  return (
    <div className="flex gap-1">
      <div onClick={(e) => e.stopPropagation()}>
        <ShareEventModal
          eventId={event.id}
          eventName={event.name}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="text-miami-aqua hover:text-miami-aqua/80 hover:bg-miami-aqua/10"
              title="Partager avec QR code"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          }
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-miami-aqua hover:text-miami-aqua/80 hover:bg-miami-aqua/10"
        onClick={(e) => {
          e.stopPropagation();
          onExport(event.id);
        }}
        title="Exporter vers fichier JSON"
      >
        <Upload className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-miami-aqua hover:text-miami-aqua/80 hover:bg-miami-aqua/10"
        onClick={(e) => {
          e.stopPropagation();
          onCloudUpload();
        }}
        title="Envoyer tous les événements vers le cloud (Upstash)"
      >
        <CloudUpload className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(event.id);
        }}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

interface DialogHeaderBarProps {
  onImportClick: () => void;
  onCloudDownload: () => void;
  onNewEvent: () => void;
}

function DialogHeaderBar({ onImportClick, onCloudDownload, onNewEvent }: DialogHeaderBarProps) {
  return (
    <DialogHeader>
      <div className="flex items-center justify-between mb-4">
        <div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-miami-aqua to-miami-navy bg-clip-text text-transparent">
            Événements
          </DialogTitle>
          <DialogDescription className="text-miami-aqua/80">
            Sélectionnez un événement ou supprimez ceux que vous ne souhaitez plus suivre.
          </DialogDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onImportClick}
            className="miami-glass-foreground border-miami-aqua/30 hover:bg-miami-aqua/10"
            title="Importer depuis fichier JSON"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onCloudDownload}
            className="miami-glass-foreground border-miami-aqua/30 hover:bg-miami-aqua/10"
            title="Télécharger depuis le cloud (Upstash)"
          >
            <CloudDownload className="w-4 h-4" />
          </Button>
          <Button variant="miami" onClick={onNewEvent}>
            Nouvel événement
          </Button>
        </div>
      </div>
    </DialogHeader>
  );
}

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function DeleteConfirmDialog({ open, onOpenChange, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="miami-card border-miami-aqua/30">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-miami-aqua font-bold">
            Supprimer l&apos;événement ?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-miami-aqua/80">
            Cette action est irréversible. Tous les tournois et données associés seront supprimés définitivement.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-miami-navy/30">Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function downloadJsonFile(data: ExportedEvent) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.event.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function cloudDownload(clubSlug: string, onEventChange: () => void) {
  try {
    toast.info('Téléchargement depuis le cloud...');
    const success = await fetchFromUpstash(clubSlug);
    if (success) {
      toast.success('Événements téléchargés depuis le cloud avec succès !');
      onEventChange();
    } else {
      toast.error('Échec du téléchargement depuis le cloud');
    }
  } catch (error) {
    console.error('Cloud download error:', error);
    toast.error('Erreur lors du téléchargement');
  }
}

async function cloudUpload(clubSlug: string) {
  try {
    toast.info('Envoi vers le cloud...');
    const success = await syncToUpstash(clubSlug);
    if (success) {
      toast.success('Événements envoyés vers le cloud avec succès !');
    } else {
      toast.error('Échec de l\'envoi vers le cloud');
    }
  } catch (error) {
    console.error('Cloud upload error:', error);
    toast.error('Erreur lors de l\'envoi');
  }
}

function useEventsManagerState(currentEventId: string, onEventChange: () => void) {
  const { identity } = useClub();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<ExportedEvent | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clubSlug = identity?.clubSlug || '';
  const storage = useMemo(() => clubSlug ? createClubStorage(clubSlug) : null, [clubSlug]);
  const events = storage?.getAllEvents() || [];

  const handleSwitchEvent = useCallback((eventId: string) => {
    if (eventId !== currentEventId && storage) {
      storage.setCurrentEvent(eventId);
      onEventChange();
      setOpen(false);
    }
  }, [currentEventId, storage, onEventChange]);

  const handleDeleteClick = useCallback((eventId: string) => {
    setEventToDelete(eventId);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (eventToDelete && storage) {
      storage.deleteEvent(eventToDelete);
      const remaining = storage.getAllEvents();
      onEventChange();
      setDeleteDialogOpen(false);
      setEventToDelete(null);
      if (remaining.length <= 1) {
        setOpen(false);
      }
    }
  }, [eventToDelete, storage, onEventChange]);

  const handleExportEvent = useCallback((eventId: string) => {
    const exportedData = storage?.exportEvent(eventId);
    if (!exportedData) {
      toast.error('Erreur lors de l\'export de l\'événement');
      return;
    }
    downloadJsonFile(exportedData);
    toast.success('Événement exporté avec succès !');
  }, [storage]);

  const handleCloudDownload = useCallback(
    () => cloudDownload(clubSlug, onEventChange),
    [clubSlug, onEventChange],
  );

  const handleCloudUpload = useCallback(
    () => cloudUpload(clubSlug),
    [clubSlug],
  );

  return {
    open, setOpen,
    deleteDialogOpen, setDeleteDialogOpen,
    duplicateDialogOpen, setDuplicateDialogOpen,
    pendingImport, setPendingImport,
    fileInputRef,
    clubSlug, storage, events,
    handleSwitchEvent, handleDeleteClick, handleDeleteConfirm,
    handleExportEvent, handleCloudDownload, handleCloudUpload,
  };
}

function useImportHandlers(
  storage: ReturnType<typeof createClubStorage> | null,
  onEventChange: () => void,
  fileInputRef: React.RefObject<HTMLInputElement | null>,
  setPendingImport: (data: ExportedEvent | null) => void,
  setDuplicateDialogOpen: (open: boolean) => void,
  pendingImport: ExportedEvent | null,
) {
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const exportedData = JSON.parse(text) as ExportedEvent;
      if (!exportedData.version || !exportedData.event) {
        toast.error('Format de fichier invalide');
        return;
      }
      const isDuplicate = storage?.checkEventExists(exportedData.event.id) ?? false;
      if (isDuplicate) {
        setPendingImport(exportedData);
        setDuplicateDialogOpen(true);
      } else {
        const result = storage?.importEvent(exportedData);
        if (result?.success) {
          toast.success(`Événement "${exportedData.event.name}" importé avec succès !`);
          onEventChange();
        } else {
          toast.error('Erreur lors de l\'import');
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erreur lors de la lecture du fichier');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [storage, onEventChange, fileInputRef, setPendingImport, setDuplicateDialogOpen]);

  const handleDuplicateReplace = useCallback(() => {
    if (!pendingImport || !storage) return;
    const result = storage.importEvent(pendingImport, { replaceIfExists: true });
    if (result.success) {
      toast.success(`Événement "${pendingImport.event.name}" remplacé avec succès !`);
      onEventChange();
    }
    setDuplicateDialogOpen(false);
    setPendingImport(null);
  }, [pendingImport, storage, onEventChange, setDuplicateDialogOpen, setPendingImport]);

  const handleDuplicateKeepBoth = useCallback(() => {
    if (!pendingImport || !storage) return;
    const result = storage.importEvent(pendingImport, { replaceIfExists: false, generateNewId: true });
    if (result.success) {
      toast.success(`Copie de "${pendingImport.event.name}" créée avec succès !`);
      onEventChange();
    }
    setDuplicateDialogOpen(false);
    setPendingImport(null);
  }, [pendingImport, storage, onEventChange, setDuplicateDialogOpen, setPendingImport]);

  const handleDuplicateCancel = useCallback(() => {
    setDuplicateDialogOpen(false);
    setPendingImport(null);
    toast.info('Import annulé');
  }, [setDuplicateDialogOpen, setPendingImport]);

  return { handleFileChange, handleDuplicateReplace, handleDuplicateKeepBoth, handleDuplicateCancel };
}

export default function EventsManager({ currentEventId, onEventChange, onNewEventClick }: EventsManagerProps) {
  const {
    open, setOpen,
    deleteDialogOpen, setDeleteDialogOpen,
    duplicateDialogOpen, setDuplicateDialogOpen,
    pendingImport, setPendingImport,
    fileInputRef,
    storage, events,
    handleSwitchEvent, handleDeleteClick, handleDeleteConfirm,
    handleExportEvent, handleCloudDownload, handleCloudUpload,
  } = useEventsManagerState(currentEventId, onEventChange);

  const {
    handleFileChange, handleDuplicateReplace, handleDuplicateKeepBoth, handleDuplicateCancel,
  } = useImportHandlers(
    storage, onEventChange, fileInputRef,
    setPendingImport, setDuplicateDialogOpen, pendingImport,
  );

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="miami-glass-foreground border-miami-aqua/30 text-miami-navy hover:bg-miami-aqua/10">
            Gérer les événements
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] miami-card border-miami-aqua/30">
          <DialogHeaderBar
            onImportClick={() => fileInputRef.current?.click()}
            onCloudDownload={handleCloudDownload}
            onNewEvent={() => { setOpen(false); onNewEventClick(); }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-center py-8 text-miami-aqua font-semibold">
                Aucun événement créé
              </div>
            ) : (
              events.map((event: Event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isCurrent={event.id === currentEventId}
                  onSwitch={handleSwitchEvent}
                  onExport={handleExportEvent}
                  onDelete={handleDeleteClick}
                  onCloudUpload={handleCloudUpload}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />

      <DuplicateEventDialog
        open={duplicateDialogOpen}
        eventName={pendingImport?.event.name || ''}
        onReplace={handleDuplicateReplace}
        onKeepBoth={handleDuplicateKeepBoth}
        onCancel={handleDuplicateCancel}
      />
    </>
  );
}
