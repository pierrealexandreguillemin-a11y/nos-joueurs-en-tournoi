// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PairingsTable from './PairingsTable';
import type { ClubPairing } from '@/types';

describe('PairingsTable', () => {
  const mockPairings: ClubPairing[] = [
    {
      board: 3,
      clubPlayerName: 'DUPONT JEAN',
      color: 'white',
      opponentName: 'MARTIN PAUL',
      opponentElo: 1450,
      result: '',
      isExempt: false,
    },
    {
      board: 7,
      clubPlayerName: 'DURAND MARIE',
      color: 'black',
      opponentName: 'BERNARD LUC',
      opponentElo: 1400,
      result: '0 - 1',
      isExempt: false,
    },
    {
      board: 12,
      clubPlayerName: 'LEFEBVRE ALICE',
      color: 'white',
      opponentName: 'EXEMPT',
      opponentElo: 0,
      result: '',
      isExempt: true,
    },
  ];

  it('renders all club pairings', () => {
    render(<PairingsTable pairings={mockPairings} pairingsRound={4} />);

    expect(screen.getByText('DUPONT JEAN')).toBeInTheDocument();
    expect(screen.getByText('DURAND MARIE')).toBeInTheDocument();
    expect(screen.getByText('LEFEBVRE ALICE')).toBeInTheDocument();
  });

  it('displays board numbers prominently', () => {
    render(<PairingsTable pairings={mockPairings} pairingsRound={4} />);

    const boardNumbers = screen.getAllByText(/^(3|7|12)$/);
    boardNumbers.forEach(el => {
      expect(el.className).toContain('text-xl');
      expect(el.className).toContain('font-bold');
    });
  });

  it('shows color badges for white and black', () => {
    render(<PairingsTable pairings={mockPairings} pairingsRound={4} />);

    expect(screen.getAllByText('Blancs')).toHaveLength(2);
    expect(screen.getByText('Noirs')).toBeInTheDocument();
  });

  it('shows opponent names and elos', () => {
    render(<PairingsTable pairings={mockPairings} pairingsRound={4} />);

    expect(screen.getByText('MARTIN PAUL')).toBeInTheDocument();
    expect(screen.getByText('1450')).toBeInTheDocument();
    expect(screen.getByText('BERNARD LUC')).toBeInTheDocument();
    expect(screen.getByText('1400')).toBeInTheDocument();
  });

  it('displays Exempt for exempt pairings', () => {
    render(<PairingsTable pairings={mockPairings} pairingsRound={4} />);

    // Exempt appears in both opponent and result columns
    expect(screen.getAllByText('Exempt').length).toBeGreaterThanOrEqual(1);
  });

  it('shows result when available', () => {
    render(<PairingsTable pairings={mockPairings} pairingsRound={4} />);

    expect(screen.getByText('0 - 1')).toBeInTheDocument();
  });

  it('shows "À jouer" for unplayed non-exempt pairings', () => {
    render(<PairingsTable pairings={mockPairings} pairingsRound={4} />);

    expect(screen.getByText('À jouer')).toBeInTheDocument();
  });

  it('shows empty state when no pairings', () => {
    render(<PairingsTable pairings={[]} pairingsRound={4} />);

    expect(screen.getByText(/Aucun joueur du club/i)).toBeInTheDocument();
  });

  it('has correct table aria-label with round number', () => {
    render(<PairingsTable pairings={mockPairings} pairingsRound={4} />);

    expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Appariements ronde 4');
  });

  it('has scope="col" on all column headers', () => {
    render(<PairingsTable pairings={mockPairings} pairingsRound={4} />);

    const headers = screen.getAllByRole('columnheader');
    headers.forEach(th => {
      expect(th).toHaveAttribute('scope', 'col');
    });
  });

  it('uses updated column labels', () => {
    render(<PairingsTable pairings={mockPairings} pairingsRound={4} />);

    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Résultat')).toBeInTheDocument();
    expect(screen.getByText('Elo adv.')).toBeInTheDocument();
  });
});
