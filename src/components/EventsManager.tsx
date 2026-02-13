'use client';
import { useState, useRef } from 'react';
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
  getAllEvents,
  setCurrentEvent,
  deleteEvent,
  exportEvent,
  importEvent,
  checkEventExists,
  type ExportedEvent,
} from '@/lib/storage';
import { syncToMongoDB, fetchFromMongoDB } from '@/lib/sync';
import DuplicateEventDialog from '@/components/DuplicateEventDialog';
import ShareEventModal from '@/components/ShareEventModal';
import type { Event } from '@/types';

interface EventsManagerProps {
  currentEventId: string;
  onEventChange: () => void;
  onNewEventClick: () => void;
}

export default function EventsManager({ currentEventId, onEventChange, onNewEventClick }: EventsManagerProps) {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<ExportedEvent | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const events = getAllEvents();

  const handleSwitchEvent = (eventId: string) => {
    if (eventId !== currentEventId) {
      setCurrentEvent(eventId);
      onEventChange();
      setOpen(false);
    }
  };

  const handleDeleteClick = (eventId: string) => {
    setEventToDelete(eventId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (eventToDelete) {
      deleteEvent(eventToDelete);
      onEventChange();
      setDeleteDialogOpen(false);
      setEventToDelete(null);

      // Close main dialog if no events left
      if (events.length <= 1) {
        setOpen(false);
      }
    }
  };

  const handleExportEvent = (eventId: string) => {
    const exportedData = exportEvent(eventId);
    if (!exportedData) {
      toast.error('Erreur lors de l\'export de l\'événement');
      return;
    }

    // Create download
    const blob = new Blob([JSON.stringify(exportedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportedData.event.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Événement exporté avec succès !');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const exportedData = JSON.parse(text) as ExportedEvent;

      // Validate structure
      if (!exportedData.version || !exportedData.event) {
        toast.error('Format de fichier invalide');
        return;
      }

      // Check for duplicates
      const isDuplicate = checkEventExists(exportedData.event.id);

      if (isDuplicate) {
        setPendingImport(exportedData);
        setDuplicateDialogOpen(true);
      } else {
        // Import directly
        const result = importEvent(exportedData);
        if (result.success) {
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
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDuplicateReplace = () => {
    if (!pendingImport) return;

    const result = importEvent(pendingImport, { replaceIfExists: true });
    if (result.success) {
      toast.success(`Événement "${pendingImport.event.name}" remplacé avec succès !`);
      onEventChange();
    }

    setDuplicateDialogOpen(false);
    setPendingImport(null);
  };

  const handleDuplicateKeepBoth = () => {
    if (!pendingImport) return;

    const result = importEvent(pendingImport, { replaceIfExists: false, generateNewId: true });
    if (result.success) {
      toast.success(`Copie de "${pendingImport.event.name}" créée avec succès !`);
      onEventChange();
    }

    setDuplicateDialogOpen(false);
    setPendingImport(null);
  };

  const handleDuplicateCancel = () => {
    setDuplicateDialogOpen(false);
    setPendingImport(null);
    toast.info('Import annulé');
  };

  const handleCloudDownload = async () => {
    try {
      toast.info('Téléchargement depuis le cloud...');
      const success = await fetchFromMongoDB();
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
  };

  const handleCloudUpload = async () => {
    try {
      toast.info('Envoi vers le cloud...');
      const success = await syncToMongoDB();
      if (success) {
        toast.success('Événements envoyés vers le cloud avec succès !');
      } else {
        toast.error('Échec de l\'envoi vers le cloud');
      }
    } catch (error) {
      console.error('Cloud upload error:', error);
      toast.error('Erreur lors de l\'envoi');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="miami-glass-foreground border-miami-aqua/30 text-miami-navy hover:bg-miami-aqua/10">
            Gérer les événements
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] miami-card border-miami-aqua/30">
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
                  onClick={handleImportClick}
                  className="miami-glass-foreground border-miami-aqua/30 hover:bg-miami-aqua/10"
                  title="Importer depuis fichier JSON"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCloudDownload}
                  className="miami-glass-foreground border-miami-aqua/30 hover:bg-miami-aqua/10"
                  title="Télécharger depuis le cloud (Upstash)"
                >
                  <CloudDownload className="w-4 h-4" />
                </Button>
                <Button
                  variant="miami"
                  onClick={() => {
                    setOpen(false);
                    onNewEventClick();
                  }}
                >
                  Nouvel événement
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Hidden file input */}
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
              events.map((event: Event) => {
                const isCurrent = event.id === currentEventId;
                return (
                  <Card
                    key={event.id}
                    className={`p-4 cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-gradient-to-r from-miami-aqua/20 to-miami-navy/10 border-miami-aqua/50 shadow-lg'
                        : 'miami-glass-foreground hover:border-miami-aqua/30 hover:shadow-md'
                    }`}
                    onClick={() => handleSwitchEvent(event.id)}
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
                            handleExportEvent(event.id);
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
                            handleCloudUpload();
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
                            handleDeleteClick(event.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Event Dialog */}
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
