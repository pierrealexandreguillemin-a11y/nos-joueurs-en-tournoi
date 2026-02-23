'use client';
import { memo } from 'react';

export type ViewMode = 'results' | 'pairings';

interface ViewToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
  hasPairings: boolean;
  showBadge?: boolean;
}

const ViewToggle = memo(function ViewToggle({
  viewMode,
  onChange,
  hasPairings,
  showBadge = false,
}: ViewToggleProps) {
  const baseClass = 'relative px-3 py-1.5 text-sm font-medium rounded-md transition-all';
  const activeClass = 'bg-gradient-to-r from-miami-aqua to-miami-navy text-white shadow-sm';
  const inactiveClass = 'text-muted-foreground hover:text-foreground';
  const disabledClass = 'opacity-50 cursor-not-allowed';

  return (
    <div
      role="group"
      aria-label="Basculer entre résultats et appariements"
      className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted/50"
    >
      <button
        type="button"
        role="radio"
        aria-checked={viewMode === 'results'}
        className={`${baseClass} ${viewMode === 'results' ? activeClass : inactiveClass}`}
        onClick={() => onChange('results')}
      >
        Résultats
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={viewMode === 'pairings'}
        aria-disabled={!hasPairings}
        disabled={!hasPairings}
        className={`${baseClass} ${viewMode === 'pairings' ? activeClass : inactiveClass} ${!hasPairings ? disabledClass : ''}`}
        onClick={() => onChange('pairings')}
      >
        Appariements
        {showBadge && hasPairings && (
          <span
            className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-miami-orange"
            aria-label="Nouveaux appariements disponibles"
          />
        )}
      </button>
    </div>
  );
});

export default ViewToggle;
