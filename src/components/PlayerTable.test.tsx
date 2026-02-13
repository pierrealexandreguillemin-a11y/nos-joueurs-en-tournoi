'use client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import PlayerTable from './PlayerTable';
import { setValidation, getValidation } from '@/lib/storage';
import type { Tournament, Player, Result } from '@/types';

// Mock storage functions
vi.mock('@/lib/storage', () => ({
  setValidation: vi.fn(),
  getValidation: vi.fn(() => false),
}));

describe('PlayerTable', () => {
  const mockPlayer1: Player = {
    name: 'Alice Dupont',
    elo: 1500,
    club: 'Hay Chess',
    results: [
      { round: 1, score: 1 as const },
      { round: 2, score: 0.5 as const },
      { round: 3, score: 0 as const },
    ],
    currentPoints: 1.5,
    buchholz: 5.5,
    performance: 1450,
    ranking: 1,
    validated: [false, false, false],
  };

  const mockPlayer2: Player = {
    name: 'Bob Martin',
    elo: 1400,
    club: 'Hay Chess',
    results: [
      { round: 1, score: 0 as const },
      { round: 2, score: 1 as const },
    ],
    currentPoints: 1,
    buchholz: 4.0,
    performance: 1350,
    ranking: 2,
    validated: [false, false],
  };

  const mockTournament: Tournament = {
    id: 'trn_123',
    name: 'U12',
    url: 'https://echecs.asso.fr/test',
    lastUpdate: '2025-01-01',
    players: [mockPlayer1, mockPlayer2],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Render Player Data', () => {
    it('displays all players in the tournament', () => {
      render(<PlayerTable tournament={mockTournament} />);

      expect(screen.getByText('Alice Dupont')).toBeInTheDocument();
      expect(screen.getByText('Bob Martin')).toBeInTheDocument();
    });

    it('displays player ELO correctly', () => {
      render(<PlayerTable tournament={mockTournament} />);

      expect(screen.getByText('1500')).toBeInTheDocument();
      expect(screen.getByText('1400')).toBeInTheDocument();
    });

    it('displays player ranking correctly', () => {
      render(<PlayerTable tournament={mockTournament} />);

      const badges = screen.getAllByText(/^[12]$/);
      expect(badges.length).toBeGreaterThanOrEqual(2);
    });

    it('displays player points correctly', () => {
      render(<PlayerTable tournament={mockTournament} />);

      // Check for points column values
      expect(screen.getByText('1.5')).toBeInTheDocument();

      // There are multiple "1"s (ranking and points), so just verify both players' data is shown
      const table = screen.getByRole('table');
      expect(table).toHaveTextContent('1.5'); // Player1 points
      expect(table).toHaveTextContent('Alice Dupont');
      expect(table).toHaveTextContent('Bob Martin');
    });

    it('displays Buchholz with 1 decimal place', () => {
      render(<PlayerTable tournament={mockTournament} />);

      expect(screen.getByText('5.5')).toBeInTheDocument();
      expect(screen.getByText('4.0')).toBeInTheDocument();
    });

    it('displays performance ratings', () => {
      render(<PlayerTable tournament={mockTournament} />);

      expect(screen.getByText('1450')).toBeInTheDocument();
      expect(screen.getByText('1350')).toBeInTheDocument();
    });
  });

  describe('Round Results Display', () => {
    it('displays victory icon for score=1', () => {
      render(<PlayerTable tournament={mockTournament} />);

      // Check for green check icons (victory)
      const table = screen.getByRole('table');
      const checkIcons = table.querySelectorAll('.text-green-600');
      expect(checkIcons.length).toBeGreaterThan(0);
    });

    it('displays defeat icon for score=0', () => {
      render(<PlayerTable tournament={mockTournament} />);

      // Check for red X icons (defeat)
      const table = screen.getByRole('table');
      const xIcons = table.querySelectorAll('.text-red-600');
      expect(xIcons.length).toBeGreaterThan(0);
    });

    it('displays draw icon for score=0.5', () => {
      render(<PlayerTable tournament={mockTournament} />);

      // Check for yellow minus icons (draw)
      const table = screen.getByRole('table');
      const minusIcons = table.querySelectorAll('.text-yellow-600');
      expect(minusIcons.length).toBeGreaterThan(0);
    });

    it('displays dash for missing results', () => {
      const tournamentWithMissingRounds: Tournament = {
        ...mockTournament,
        players: [
          {
            ...mockPlayer1,
            results: [{ round: 1, score: 1 as const }], // Only 1 round
          },
          {
            ...mockPlayer2,
            results: [
              { round: 1, score: 1 as const },
              { round: 2, score: 0 as const },
              { round: 3, score: 1 as const },
            ], // 3 rounds
          },
        ],
      };

      render(<PlayerTable tournament={tournamentWithMissingRounds} />);

      // Should show dashes for player1's missing rounds 2 and 3
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThan(0);
    });

    it('handles different number of rounds per player', () => {
      const tournament: Tournament = {
        ...mockTournament,
        players: [
          {
            ...mockPlayer1,
            results: [{ round: 1, score: 1 as const }],
          },
          {
            ...mockPlayer2,
            results: [
              { round: 1, score: 1 as const },
              { round: 2, score: 0 as const },
              { round: 3, score: 1 as const },
              { round: 4, score: 0.5 as const },
              { round: 5, score: 1 as const },
            ],
          },
        ],
      };

      render(<PlayerTable tournament={tournament} />);

      // Should render 5 round columns (max rounds from all players)
      expect(screen.getByText('R1')).toBeInTheDocument();
      expect(screen.getByText('R2')).toBeInTheDocument();
      expect(screen.getByText('R3')).toBeInTheDocument();
      expect(screen.getByText('R4')).toBeInTheDocument();
      expect(screen.getByText('R5')).toBeInTheDocument();
    });
  });

  describe('Validation Checkboxes', () => {
    it('renders validation checkboxes for each round result', () => {
      render(<PlayerTable tournament={mockTournament} />);

      const checkboxes = screen.getAllByRole('checkbox');
      // Player1: 3 rounds, Player2: 2 rounds = 5 total checkboxes
      expect(checkboxes.length).toBe(5);
    });

    it('loads validation state from storage on mount', () => {
      const mockGetValidation = vi.mocked(getValidation);
      mockGetValidation.mockReturnValue(true);

      render(<PlayerTable tournament={mockTournament} />);

      // Should have called getValidation for each player/round combination
      expect(mockGetValidation).toHaveBeenCalled();
    });

    it('saves validation state when checkbox is checked', () => {
      const mockSetValidation = vi.mocked(setValidation);
      const mockGetValidation = vi.mocked(getValidation);
      mockGetValidation.mockReturnValue(false); // Initially unchecked

      render(<PlayerTable tournament={mockTournament} />);

      const checkboxes = screen.getAllByRole('checkbox');

      // Click checkbox to check it (false -> true)
      fireEvent.click(checkboxes[0]);

      // The checkbox onChange passes the new checked state
      // Since checkbox was false and we clicked it, onCheckedChange receives true
      expect(mockSetValidation).toHaveBeenCalledWith(
        'trn_123',
        'Alice Dupont',
        1,
        true
      );
    });

    it('saves validation state when checkbox is unchecked', () => {
      const mockSetValidation = vi.mocked(setValidation);
      const mockGetValidation = vi.mocked(getValidation);

      // Mock to return true for the specific checkbox we'll click
      mockGetValidation.mockImplementation((tournamentId, playerName, round) => {
        return tournamentId === 'trn_123' && playerName === 'Alice Dupont' && round === 1;
      });

      render(<PlayerTable tournament={mockTournament} />);

      const checkboxes = screen.getAllByRole('checkbox');

      // First checkbox should be checked initially
      expect(checkboxes[0]).toBeChecked();

      // Click checkbox to uncheck it (true -> false)
      fireEvent.click(checkboxes[0]);

      expect(mockSetValidation).toHaveBeenCalledWith(
        'trn_123',
        'Alice Dupont',
        1,
        false
      );
    });

    it('persists validation state after tournament change', () => {
      const mockGetValidation = vi.mocked(getValidation);
      mockGetValidation.mockReturnValue(false);

      const { rerender } = render(<PlayerTable tournament={mockTournament} />);

      // Change tournament (simulate tab switch)
      const newTournament: Tournament = {
        ...mockTournament,
        id: 'trn_456',
        name: 'U14',
      };

      rerender(<PlayerTable tournament={newTournament} />);

      // Should reload validation state from storage for new tournament
      expect(mockGetValidation).toHaveBeenCalledWith(
        'trn_456',
        'Alice Dupont',
        1
      );
    });
  });

  describe('Edge Cases', () => {
    it('displays empty state when no players', () => {
      const emptyTournament: Tournament = {
        ...mockTournament,
        players: [],
      };

      render(<PlayerTable tournament={emptyTournament} />);

      expect(screen.getByText('Aucun joueur à afficher')).toBeInTheDocument();
    });

    it('handles player with 0 rounds gracefully', () => {
      const tournament: Tournament = {
        ...mockTournament,
        players: [
          {
            ...mockPlayer1,
            results: [],
            currentPoints: 0,
          },
        ],
      };

      render(<PlayerTable tournament={tournament} />);

      expect(screen.getByText('Alice Dupont')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // Points
    });

    it('handles large number of rounds (>10)', () => {
      const manyRounds: Result[] = Array.from({ length: 15 }, (_, i) => ({
        round: i + 1,
        score: (i % 3 === 0 ? 1 : i % 3 === 1 ? 0.5 : 0) as 0 | 0.5 | 1,
      }));

      const tournament: Tournament = {
        ...mockTournament,
        players: [
          {
            ...mockPlayer1,
            results: manyRounds,
            currentPoints: 7.5,
          },
        ],
      };

      render(<PlayerTable tournament={tournament} />);

      // Should render all 15 rounds
      expect(screen.getByText('R1')).toBeInTheDocument();
      expect(screen.getByText('R15')).toBeInTheDocument();

      // Should have 15 validation checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBe(15);
    });

    it('handles missing Buchholz value', () => {
      const tournament: Tournament = {
        ...mockTournament,
        players: [
          {
            ...mockPlayer1,
            buchholz: undefined,
          },
        ],
      };

      render(<PlayerTable tournament={tournament} />);

      const table = screen.getByRole('table');
      expect(table).toHaveTextContent('-'); // Should show dash for missing Buchholz
    });

    it('handles missing performance value', () => {
      const tournament: Tournament = {
        ...mockTournament,
        players: [
          {
            ...mockPlayer1,
            performance: undefined,
          },
        ],
      };

      render(<PlayerTable tournament={tournament} />);

      const table = screen.getByRole('table');
      expect(table).toHaveTextContent('-'); // Should show dash for missing performance
    });
  });

  describe('Table Structure', () => {
    it('renders table with all required headers', () => {
      render(<PlayerTable tournament={mockTournament} />);

      expect(screen.getByText('Nom')).toBeInTheDocument();
      expect(screen.getByText('Elo')).toBeInTheDocument();
      expect(screen.getByText('Pts')).toBeInTheDocument();
      expect(screen.getByText('Buch.')).toBeInTheDocument();
      expect(screen.getByText('Perf.')).toBeInTheDocument();
      expect(screen.getByText('Class.')).toBeInTheDocument();
      expect(screen.getByText('Valid.')).toBeInTheDocument();
    });

    it('renders round headers dynamically based on max rounds', () => {
      render(<PlayerTable tournament={mockTournament} />);

      // Max rounds is 3 (from mockPlayer1)
      expect(screen.getByText('R1')).toBeInTheDocument();
      expect(screen.getByText('R2')).toBeInTheDocument();
      expect(screen.getByText('R3')).toBeInTheDocument();
    });

    it('applies miami-card styling', () => {
      render(<PlayerTable tournament={mockTournament} />);

      const card = screen.getByRole('table').closest('.miami-card');
      expect(card).toBeInTheDocument();
    });
  });
});
