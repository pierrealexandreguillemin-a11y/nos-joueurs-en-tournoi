'use client';
import { useState } from 'react';
import { Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getStorageData, generateShareURL } from '@/lib/storage';

export default function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const handleDebug = () => {
    const data = getStorageData();

    const info: Record<string, unknown> = {
      totalEvents: data.events.length,
      currentEventId: data.currentEventId,
      events: data.events.map(e => ({
        id: e.id,
        name: e.name,
        tournaments: e.tournaments.length,
        hasValidations: Object.keys(data.validations).filter(k =>
          e.tournaments.some(t => t.id === k)
        ).length,
      })),
      validationsKeys: Object.keys(data.validations).length,
    };

    // Test generateShareURL for current event
    if (data.currentEventId) {
      const shareResult = generateShareURL(data.currentEventId);
      info.shareURLTest = shareResult ? {
        urlLength: shareResult.size,
        urlPreview: shareResult.url.substring(0, 100) + '...',
      } : 'FAILED - generateShareURL returned null';
    }

    setDebugInfo(JSON.stringify(info, null, 2));
  };

  const handleCopyAll = () => {
    const fullData = getStorageData();
    navigator.clipboard.writeText(JSON.stringify(fullData, null, 2));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed bottom-4 right-4 miami-glass-foreground border-amber-500/50 z-50"
          title="Debug Panel"
          onClick={handleDebug}
        >
          <Bug className="w-4 h-4 text-amber-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] miami-card border-miami-aqua/30 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
            🐛 Debug Panel
          </DialogTitle>
          <DialogDescription className="text-miami-navy/70">
            Informations techniques pour diagnostic
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-black/5 rounded-lg font-mono text-xs overflow-x-auto">
            <pre>{debugInfo || 'Cliquez pour générer les infos de debug'}</pre>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleDebug} variant="outline" className="flex-1">
              Rafraîchir Debug Info
            </Button>
            <Button onClick={handleCopyAll} variant="outline" className="flex-1">
              Copier Toutes les Données
            </Button>
          </div>

          <div className="text-xs text-miami-navy/60 space-y-1">
            <p>• Vérifiez la console (F12) pour les logs détaillés</p>
            <p>• &quot;Copier Toutes les Données&quot; = tout le localStorage</p>
            <p>• Envoyez ces infos pour diagnostic</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
