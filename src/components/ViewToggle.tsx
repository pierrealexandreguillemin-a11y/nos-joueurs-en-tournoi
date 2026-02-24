'use client';
import { memo } from 'react';

export type ViewMode = 'results' | 'pairings';

interface ViewToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
  hasPairings: boolean;
  showBadge?: boolean;
}

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-miami-aqua focus-visible:ring-offset-2';

const ViewToggle = memo(function ViewToggle({
  viewMode,
  onChange,
  hasPairings,
  showBadge = false,
}: ViewToggleProps) {
  const baseClass = `relative px-3 py-1.5 text-sm font-medium rounded-md transition-all ${FOCUS_RING}`;
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
        aria-pressed={viewMode === 'results'}
        className={`${baseClass} ${viewMode === 'results' ? activeClass : inactiveClass}`}
        onClick={() => onChange('results')}
      >
        Résultats
      </button>
      <button
        type="button"
        aria-pressed={viewMode === 'pairings'}
        aria-disabled={!hasPairings}
        disabled={!hasPairings}
        className={`${baseClass} ${viewMode === 'pairings' ? activeClass : inactiveClass} ${!hasPairings ? disabledClass : ''}`}
        onClick={() => onChange('pairings')}
        title={!hasPairings ? 'Les appariements ne sont pas encore publiés' : undefined}
      >
        Appariements
        {showBadge && hasPairings && (
          <span
            className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-miami-orange"
            role="status"
            aria-label="Nouveaux appariements disponibles"
          />
        )}
      </button>
    </div>
  );
});

export default ViewToggle;
