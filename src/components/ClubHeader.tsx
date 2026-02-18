'use client';

import { useState } from 'react';
import { Building2, LogOut, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClub } from '@/contexts/ClubContext';

export default function ClubHeader() {
  const { identity, clearClub } = useClub();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!identity) return null;

  const handleCopySlug = () => {
    navigator.clipboard.writeText(identity.clubSlug);
    toast.success('Identifiant copié !');
    setMenuOpen(false);
  };

  const handleChangeClub = () => {
    clearClub();
    setMenuOpen(false);
  };

  return (
    <div className="relative">
      <Badge
        className="cursor-pointer bg-miami-aqua/20 text-white border-miami-aqua/40 hover:bg-miami-aqua/30 transition-colors px-3 py-1"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <Building2 className="w-3 h-3 mr-1.5" />
        {identity.clubName}
      </Badge>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 rounded-lg py-1 min-w-[200px]" style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 142, 151, 0.3)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}>
            <div className="px-3 py-2 border-b border-miami-aqua/20">
              <div className="text-xs text-miami-navy/60">Identifiant</div>
              <code className="text-sm text-miami-navy font-mono">{identity.clubSlug}</code>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start rounded-none text-miami-navy hover:bg-miami-aqua/10"
              onClick={handleCopySlug}
            >
              <Copy className="w-3.5 h-3.5 mr-2" />
              Copier l&apos;identifiant
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start rounded-none text-red-600 hover:bg-red-50"
              onClick={handleChangeClub}
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Changer de club
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
