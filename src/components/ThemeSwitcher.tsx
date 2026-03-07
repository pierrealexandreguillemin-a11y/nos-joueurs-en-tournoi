'use client';

import { Sun, Moon, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

const THEME_LABELS = { miami: 'Miami Vice', neutral: 'Neutral' } as const;

export default function ThemeSwitcher() {
  const { theme, mode, setTheme, toggleMode } = useTheme();

  const nextTheme = theme === 'miami' ? 'neutral' : 'miami';

  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMode}
        className="text-secondary hover:bg-primary/10"
        title={mode === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
        aria-label={mode === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      >
        {mode === 'dark' ? (
          <Sun className="w-5 h-5" aria-hidden="true" />
        ) : (
          <Moon className="w-5 h-5" aria-hidden="true" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(nextTheme)}
        className="text-secondary hover:bg-primary/10"
        title={`Thème : ${THEME_LABELS[theme]} → ${THEME_LABELS[nextTheme]}`}
        aria-label={`Changer de thème vers ${THEME_LABELS[nextTheme]}`}
      >
        <Palette className="w-5 h-5" aria-hidden="true" />
      </Button>
    </div>
  );
}
