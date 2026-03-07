'use client';
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

interface DuplicateEventDialogProps {
  open: boolean;
  eventName: string;
  onReplace: () => void;
  onKeepBoth: () => void;
  onCancel: () => void;
}

export default function DuplicateEventDialog({
  open,
  eventName,
  onReplace,
  onKeepBoth,
  onCancel,
}: DuplicateEventDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="glass-surface border-white/20">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl dialog-title-gradient">
            Événement déjà existant
          </AlertDialogTitle>
          <AlertDialogDescription className="text-foreground/90">
            L&apos;événement <strong>&quot;{eventName}&quot;</strong> existe déjà dans votre liste.
            <br />
            <br />
            Que voulez-vous faire ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            onClick={onCancel}
            className="glass-surface hover:bg-white/20 border-white/30"
          >
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onKeepBoth}
            className="glass-surface hover:bg-primary/30 border-primary/50"
          >
            Garder les deux
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onReplace}
            className="bg-red-600 hover:bg-red-700 text-white border-red-700"
          >
            Remplacer l&apos;existant
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
