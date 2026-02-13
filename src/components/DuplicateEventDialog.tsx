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
      <AlertDialogContent className="miami-glass-foreground border-white/20">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold bg-gradient-to-r from-miami-aqua to-miami-navy bg-clip-text text-transparent">
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
            className="miami-glass-button hover:bg-white/20 border-white/30"
          >
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onKeepBoth}
            className="miami-glass-button hover:bg-miami-aqua/30 border-miami-aqua/50"
          >
            Garder les deux
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onReplace}
            className="miami-glass-button hover:bg-miami-coral/30 border-miami-coral/50"
          >
            Remplacer l&apos;existant
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
