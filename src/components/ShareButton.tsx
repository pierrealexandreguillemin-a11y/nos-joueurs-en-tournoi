'use client';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const APP_URL = 'https://nos-joueurs-en-tournoi.vercel.app';

function QRCodeCard() {
  return (
    <Card className="p-6 glass-surface flex flex-col items-center gap-4">
      <div className="bg-white p-4 rounded-lg text-secondary">
        <QRCodeSVG
          value={APP_URL}
          size={200}
          level="H"
          includeMargin={true}
          fgColor="currentColor"
        />
      </div>
      <p className="text-sm text-secondary/70 text-center">
        Scannez ce QR code pour accéder à l&apos;application
      </p>
    </Card>
  );
}

function CopyUrlCard({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
  return (
    <Card className="p-4 glass-surface">
      <div className="flex items-center gap-2">
        <code className="flex-1 text-sm text-secondary bg-white/50 px-3 py-2 rounded">
          {APP_URL}
        </code>
        <Button
          variant="outline"
          size="icon"
          onClick={onCopy}
          className="border-primary/30"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>
    </Card>
  );
}

export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Nos Joueurs en Tournoi',
          text: 'Suivez les tournois d\'échecs en temps réel',
          url: APP_URL,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-secondary hover:bg-primary/10"
          title="Partager l'application"
          aria-label="Partager l'application"
        >
          <Share2 className="w-5 h-5" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] glass-card border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-2xl dialog-title-gradient">
            Partager l&apos;application
          </DialogTitle>
          <DialogDescription className="text-secondary/70">
            Partagez Nos Joueurs en Tournoi avec d&apos;autres clubs ou joueurs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <QRCodeCard />
          <CopyUrlCard copied={copied} onCopy={handleCopy} />

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              variant="gradient"
              className="w-full"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
