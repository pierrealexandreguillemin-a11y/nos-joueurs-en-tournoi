'use client';

import { useState, useEffect, useRef } from 'react';
import { Building2, LogOut, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useClub } from '@/contexts/ClubContext';

const MENU_STYLE = {
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(0, 142, 151, 0.3)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
} as const;

export default function ClubHeader() {
  const { identity, clearClub } = useClub();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on Escape key
  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

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
        className="cursor-pointer bg-miami-aqua/20 text-white border-miami-aqua/40 hover:bg-miami-aqua/30 transition-colors px-3 py-1"
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
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div ref={menuRef} role="menu" className="absolute right-0 top-full mt-2 z-50 rounded-lg py-1 min-w-[200px]" style={MENU_STYLE}>
            <div className="px-3 py-2 border-b border-miami-aqua/20">
              <div className="text-xs text-miami-navy/80">Identifiant</div>
              <code className="text-sm text-miami-navy font-mono">{identity.clubSlug}</code>
            </div>
            <Button variant="ghost" size="sm" role="menuitem" className="w-full justify-start rounded-none text-miami-navy hover:bg-miami-aqua/10" onClick={handleCopySlug}>
              <Copy className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
              Copier l&apos;identifiant
            </Button>
            <Button variant="ghost" size="sm" role="menuitem" className="w-full justify-start rounded-none text-red-600 hover:bg-red-50" onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}>
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
            <AlertDialogAction onClick={() => { clearClub(); setConfirmOpen(false); }} className="bg-red-600 hover:bg-red-700 text-white">
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
