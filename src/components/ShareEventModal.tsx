'use client';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share2, AlertCircle, Check } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClubStorage } from '@/lib/storage';
import { useClub } from '@/contexts/ClubContext';

interface ShareEventModalProps {
  eventId: string;
  eventName: string;
  trigger?: React.ReactNode;
}

interface ShareData {
  url: string;
  size: number;
}

function QRCodeSection({ shareData, qrSize, qrCodeTooBig }: {
  shareData: ShareData;
  qrSize: number;
  qrCodeTooBig: boolean;
}) {
  if (qrCodeTooBig) {
    return (
      <Alert className="border-red-500/50 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 text-sm">
          <strong>Événement trop volumineux pour un QR code</strong>
          <br />
          Utilisez le bouton &quot;Export&quot; (téléchargement) pour partager cet événement via fichier JSON.
          Le lien ci-dessous reste utilisable pour copier/coller.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 sm:p-6 rounded-lg bg-white">
      <div className="flex items-center justify-center">
        <QRCodeSVG
          value={shareData.url}
          size={qrSize}
          level="M"
          includeMargin={true}
        />
      </div>
      <p className="text-xs text-center text-miami-navy/60 px-2">
        Scannez ce QR code avec un autre appareil pour importer l&apos;événement
      </p>
    </div>
  );
}

function ShareURLSection({ url, copied, onCopy }: {
  url: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-miami-navy">Lien de partage</label>
      <div className="flex gap-2">
        <div className="flex-1 p-3 rounded-md miami-glass-foreground border border-miami-aqua/20 max-h-24 overflow-auto">
          <code className="text-xs break-all text-miami-navy/80">
            {url}
          </code>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onCopy}
          className={`flex-shrink-0 transition-colors ${
            copied
              ? 'bg-green-100 border-green-500 text-green-700'
              : 'miami-glass-foreground border-miami-aqua/30 hover:bg-miami-aqua/10'
          }`}
          title="Copier le lien"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

function ShareInstructions() {
  return (
    <div className="text-sm text-miami-navy/70 space-y-2 p-4 rounded-lg miami-glass-foreground border border-miami-aqua/10">
      <p className="font-semibold text-miami-navy">Comment utiliser :</p>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li>Scannez le QR code avec votre téléphone</li>
        <li>Ou copiez et partagez le lien</li>
        <li>L&apos;événement sera automatiquement importé à l&apos;ouverture</li>
      </ul>
    </div>
  );
}

function ValidationWarning() {
  return (
    <Alert className="border-amber-500/50 bg-amber-50">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800 text-sm">
        <strong>&#x26A0;&#xFE0F; Attention :</strong> Les validations (cases cochées) ne sont pas incluses dans le partage QR code. Le destinataire devra les recocher manuellement. Pour partager avec les validations, utilisez le bouton Export (téléchargement JSON).
      </AlertDescription>
    </Alert>
  );
}

export default function ShareEventModal({ eventId, eventName, trigger }: ShareEventModalProps) {
  const { identity } = useClub();
  const [open, setOpen] = useState(false);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrSize, setQrSize] = useState(240);

  useEffect(() => {
    if (open && identity) {
      const storage = createClubStorage(identity.clubSlug);
      const data = storage.generateShareURL(eventId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShareData(data);

      if (!data) {
        toast.error('Impossible de générer le lien de partage');
      }
    }
  }, [open, eventId, identity]);

  useEffect(() => {
    const updateQRSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setQrSize(Math.min(280, width - 100));
      } else {
        setQrSize(240);
      }
    };

    updateQRSize();
    window.addEventListener('resize', updateQRSize);
    return () => window.removeEventListener('resize', updateQRSize);
  }, []);

  const handleCopyURL = async () => {
    if (!shareData) return;

    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      toast.success('Lien copié dans le presse-papier !');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Erreur lors de la copie');
    }
  };

  const qrCodeTooBig = shareData && shareData.size > 2900;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon" className="miami-glass-foreground border-miami-aqua/30">
            <Share2 className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto miami-card border-miami-aqua/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-miami-aqua to-miami-navy bg-clip-text text-transparent">
            Partager l&apos;événement
          </DialogTitle>
          <DialogDescription className="text-miami-navy/70">
            {eventName}
          </DialogDescription>
        </DialogHeader>

        {!shareData ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-miami-navy/60">Génération du lien...</div>
          </div>
        ) : (
          <div className="space-y-4 pb-2">
            <QRCodeSection shareData={shareData} qrSize={qrSize} qrCodeTooBig={!!qrCodeTooBig} />
            <ShareURLSection url={shareData.url} copied={copied} onCopy={handleCopyURL} />
            {!qrCodeTooBig && <ValidationWarning />}
            <ShareInstructions />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
