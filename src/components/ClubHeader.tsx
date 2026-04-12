'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Building2, LogOut, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useClub } from '@/contexts/ClubContext';

function useMenuKeyboard(
  menuOpen: boolean,
  menuRef: React.RefObject<HTMLDivElement | null>,
  close: () => void,
) {
  useEffect(() => {
    if (!menuOpen) return;

    const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    firstItem?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
      if (!items?.length) return;
      const index = Array.from(items).indexOf(document.activeElement as HTMLElement);

      if (e.key === 'Escape' || e.key === 'Tab') {
        close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[(index + 1) % items.length].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[(index - 1 + items.length) % items.length].focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen, menuRef, close]);
}

export default function ClubHeader() {
  const { identity, clearClub } = useClub();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useMenuKeyboard(menuOpen, menuRef, closeMenu);

  if (!identity) return null;

  const handleBadgeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setMenuOpen(!menuOpen);
    }
  };

  const handleCopySlug = () => {
    navigator.clipboard.writeText(identity.clubSlug);
    toast.success('Identifiant copié !');
    setMenuOpen(false);
  };

  return (
    <div className="relative">
      <Badge
        className="cursor-pointer bg-primary/20 text-foreground border-primary/40 hover:bg-primary/30 transition-colors px-3 py-1"
        onClick={() => setMenuOpen(!menuOpen)}
        onKeyDown={handleBadgeKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <Building2 className="w-3 h-3 mr-1.5" aria-hidden="true" />
        {identity.clubName}
      </Badge>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} />
          <div ref={menuRef} role="menu" className="absolute right-0 top-full mt-2 z-50 rounded-lg py-1 min-w-[200px] menu-dropdown">
            <div className="px-3 py-2 border-b border-primary/20">
              <div className="text-xs text-muted-foreground">Identifiant</div>
              <code className="text-sm text-foreground font-mono">{identity.clubSlug}</code>
            </div>
            <Button variant="ghost" size="sm" role="menuitem" className="w-full justify-start rounded-none text-foreground hover:bg-primary/10" onClick={handleCopySlug}>
              <Copy className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
              Copier l&apos;identifiant
            </Button>
            <Button variant="ghost" size="sm" role="menuitem" className="w-full justify-start rounded-none text-destructive hover:bg-destructive/10" onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}>
              <LogOut className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
              Changer de club
            </Button>
          </div>
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Changer de club</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez quitter <strong>{identity.clubName}</strong>. Toutes les données locales seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { clearClub(); setConfirmOpen(false); }} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
