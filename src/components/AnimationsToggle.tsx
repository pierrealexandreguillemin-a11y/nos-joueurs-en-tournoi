'use client';

import { Zap, ZapOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnimations } from '@/contexts/AnimationsContext';
import { toast } from 'sonner';

export default function AnimationsToggle() {
  const { animationsEnabled, toggleAnimations } = useAnimations();

  const handleToggle = () => {
    toggleAnimations();
    if (animationsEnabled) {
      toast.success('Animations désactivées', {
        description: 'Économie d\'énergie activée'
      });
    } else {
      toast.success('Animations activées', {
        description: 'Effets visuels restaurés'
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className="text-miami-navy hover:bg-miami-aqua/10"
      title={animationsEnabled ? 'Désactiver les animations (économie batterie)' : 'Activer les animations'}
    >
      {animationsEnabled ? (
        <Zap className="w-5 h-5" />
      ) : (
        <ZapOff className="w-5 h-5" />
      )}
    </Button>
  );
}
