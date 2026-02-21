// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import ClubSelector from './ClubSelector';
import type { ClubInfo } from '@/types';

describe('ClubSelector', () => {
  const clubs: ClubInfo[] = [
    { name: 'Hay Chess', playerCount: 5 },
    { name: 'Solo Club', playerCount: 1 },
  ];

  it('appelle onSelect avec le club sélectionné après Valider', async () => {
    const onSelect = vi.fn();
    render(<ClubSelector clubs={clubs} onSelect={onSelect} />);

    await userEvent.selectOptions(screen.getByLabelText('Sélectionner un club'), 'Hay Chess');
    await userEvent.click(screen.getByRole('button', { name: /valider/i }));

    expect(onSelect).toHaveBeenCalledWith('Hay Chess');
  });

  it('n\'appelle pas onSelect si aucun club sélectionné', async () => {
    const onSelect = vi.fn();
    render(<ClubSelector clubs={clubs} onSelect={onSelect} />);

    // Le bouton est disabled quand rien n'est sélectionné
    const button = screen.getByRole('button', { name: /valider/i });
    expect(button).toBeDisabled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  // NOTE Coverage: ClubSelector.tsx line 17 `if(selected)` branche falsy = 75% branches.
  // React 18 vérifie props.disabled dans le fiber tree (pas le DOM).
  // disabled={!selected} empêche handleConfirm d'exécuter quand selected=''.
  // La branche falsy est du defense-in-depth unreachable via React events — 75% accepté.

  it('affiche le pluriel/singulier pour le nombre de joueurs', () => {
    render(<ClubSelector clubs={clubs} onSelect={vi.fn()} />);

    // 5 joueurs → pluriel "s"
    expect(screen.getByText(/5 joueurs/)).toBeInTheDocument();
    // 1 joueur → singulier sans "s"
    expect(screen.getByText(/1 joueur\b/)).toBeInTheDocument();
  });

  it('affiche "0 clubs détectés" avec une liste vide', () => {
    render(<ClubSelector clubs={[]} onSelect={vi.fn()} />);

    expect(screen.getByText(/0 clubs/)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /valider/i });
    expect(button).toBeDisabled();
  });
});
