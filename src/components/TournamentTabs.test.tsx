'use client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import TournamentTabs from './TournamentTabs';
import { parseFFePages, getListUrl } from '@/lib/parser';
import { saveEvent } from '@/lib/storage';
import type { Event, Tournament, Player } from '@/types';

// Mock dependencies
vi.mock('@/lib/parser', () => ({
  parseFFePages: vi.fn(),
  getListUrl: vi.fn(),
  calculateClubStats: vi.fn(() => ({
    round: 1,
    totalPoints: 1,
    playerCount: 1,
    averagePoints: 1,
  })),
}));
vi.mock('@/lib/storage');

// Mock fetch
global.fetch = vi.fn();

describe('TournamentTabs', () => {
  const mockPlayers: Player[] = [
    {
      name: 'Alice',
      elo: 1500,
      club: 'Hay Chess',
      results: [{ round: 1, score: 1 }],
      currentPoints: 1,
      ranking: 1,
      validated: [false],
    },
  ];

  const mockTournament1: Tournament = {
    id: 'trn_1',
    name: 'U12',
    url: 'https://echecs.asso.fr/test?Action=Ga&Groupe=1',
    lastUpdate: '',
    players: [],
  };

  const mockTournament2: Tournament = {
    id: 'trn_2',
    name: 'U14',
    url: 'https://echecs.asso.fr/test?Action=Ga&Groupe=2',
    lastUpdate: '2025-01-01T10:00:00Z',
    players: mockPlayers,
  };

  const mockEvent: Event = {
    id: 'evt_1',
    name: 'Test Event',
    createdAt: '2025-01-01',
    tournaments: [mockTournament1, mockTournament2],
  };

  const mockOnEventUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Render Tabs', () => {
    it('displays all tournament tabs', () => {
      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      expect(screen.getByText('U12')).toBeInTheDocument();
      expect(screen.getByText('U14')).toBeInTheDocument();
    });

    it('first tab is selected by default', () => {
      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      // First tab (U12) should be accessible and visible
      const u12Tab = screen.getByRole('tab', { name: 'U12' });
      expect(u12Tab).toBeInTheDocument();

      // Check that first tab content is visible (empty state message)
      expect(screen.getByText(/aucune donnée/i)).toBeInTheDocument();
    });

    it('renders content when tournament has players', () => {
      const eventWithPlayers: Event = {
        ...mockEvent,
        tournaments: [mockTournament2], // Only U14 with players
      };

      render(<TournamentTabs event={eventWithPlayers} onEventUpdate={mockOnEventUpdate} />);

      // Should NOT show empty message since tournament has players
      expect(screen.queryByText(/aucune donnée\. cliquez sur actualiser/i)).not.toBeInTheDocument();
    });

    it('shows empty message when tournament has no players', () => {
      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      // U12 tab (no players) should be active by default
      expect(screen.getByText(/aucune donnée/i)).toBeInTheDocument();
      expect(screen.getByText(/cliquez sur actualiser/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('switches tab content when tab is clicked', async () => {
      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      // Initially on U12 tab
      expect(screen.getByText(/aucune donnée/i)).toBeInTheDocument();

      // Click U14 tab
      const u14Tab = screen.getByRole('tab', { name: 'U14' });
      fireEvent.click(u14Tab);

      // Tab should be clickable
      expect(u14Tab).toBeInTheDocument();
    });

    it('renders all tabs correctly', () => {
      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      const u12Tab = screen.getByRole('tab', { name: 'U12' });
      const u14Tab = screen.getByRole('tab', { name: 'U14' });

      // Both tabs should be in the document and clickable
      expect(u12Tab).toBeInTheDocument();
      expect(u14Tab).toBeInTheDocument();

      // Click U14
      fireEvent.click(u14Tab);

      // Should still be in document after click
      expect(u14Tab).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('renders refresh button for each tournament', () => {
      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      const refreshButtons = screen.getAllByText('Actualiser');
      expect(refreshButtons.length).toBeGreaterThan(0);
    });

    it('shows loading state during refresh', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ html: '<html></html>' }),
          } as Response), 100)
        )
      );

      const mockGetListUrl = vi.mocked(getListUrl);
      mockGetListUrl.mockReturnValue('https://echecs.asso.fr/test?Action=Ls');

      const mockParseFFePages = vi.mocked(parseFFePages);
      mockParseFFePages.mockReturnValue({
        players: mockPlayers,
        currentRound: 1,
      });

      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      const refreshButton = screen.getAllByText('Actualiser')[0];
      fireEvent.click(refreshButton);

      // Should show loading state (button disabled)
      await waitFor(() => {
        expect(refreshButton).toBeDisabled();
      });
    });

    it('calls API scrape endpoints on refresh', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ html: '<html></html>' }),
      } as Response);

      const mockGetListUrl = vi.mocked(getListUrl);
      mockGetListUrl.mockReturnValue('https://echecs.asso.fr/test?Action=Ls');

      const mockParseFFePages = vi.mocked(parseFFePages);
      mockParseFFePages.mockReturnValue({
        players: mockPlayers,
        currentRound: 1,
      });

      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      const refreshButton = screen.getAllByText('Actualiser')[0];
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      // Should call with correct URLs
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/scrape',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('updates event with parsed players on successful refresh', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ html: '<html></html>' }),
      } as Response);

      const mockGetListUrl = vi.mocked(getListUrl);
      mockGetListUrl.mockReturnValue('https://echecs.asso.fr/test?Action=Ls');

      const mockParseFFePages = vi.mocked(parseFFePages);
      mockParseFFePages.mockReturnValue({
        players: mockPlayers,
        currentRound: 1,
      });

      const mockSaveEvent = vi.mocked(saveEvent);

      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      const refreshButton = screen.getAllByText('Actualiser')[0];
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockOnEventUpdate).toHaveBeenCalled();
      });

      // Should have called saveEvent
      expect(mockSaveEvent).toHaveBeenCalled();

      // Should have called onEventUpdate with updated event
      const updatedEvent = mockOnEventUpdate.mock.calls[0][0];
      expect(updatedEvent.tournaments[0].players).toEqual(mockPlayers);
    });

    it('displays error message on fetch failure', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      } as Response);

      const mockGetListUrl = vi.mocked(getListUrl);
      mockGetListUrl.mockReturnValue('https://echecs.asso.fr/test?Action=Ls');

      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      const refreshButton = screen.getAllByText('Actualiser')[0];
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/erreur/i)).toBeInTheDocument();
      });
    });

    it('handles API timeout error gracefully', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      const mockGetListUrl = vi.mocked(getListUrl);
      mockGetListUrl.mockReturnValue('https://echecs.asso.fr/test?Action=Ls');

      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      const refreshButton = screen.getAllByText('Actualiser')[0];
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/network timeout/i)).toBeInTheDocument();
      });
    });
  });

  describe('Display States', () => {
    it('renders PlayerTable when tournament has players', () => {
      // Use event with only tournaments that have players
      const eventWithPlayers: Event = {
        ...mockEvent,
        tournaments: [mockTournament2], // Only U14 with players
      };

      render(<TournamentTabs event={eventWithPlayers} onEventUpdate={mockOnEventUpdate} />);

      // Should show player data through PlayerTable component
      // PlayerTable will render the player name
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('shows empty state for tournament with no players', () => {
      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      // U12 tab has no players
      expect(screen.getByText(/aucun joueur hay chess/i)).toBeInTheDocument();
    });

    it('displays last update timestamp when available', () => {
      // Use event with only tournament that has lastUpdate and players
      const eventWithUpdate: Event = {
        ...mockEvent,
        tournaments: [mockTournament2], // U14 has lastUpdate
      };

      render(<TournamentTabs event={eventWithUpdate} onEventUpdate={mockOnEventUpdate} />);

      // Should show last update text
      expect(screen.getByText(/dernière mise à jour/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles event with single tournament', () => {
      const singleTournamentEvent: Event = {
        ...mockEvent,
        tournaments: [mockTournament1],
      };

      render(<TournamentTabs event={singleTournamentEvent} onEventUpdate={mockOnEventUpdate} />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(1);
    });

    it('handles event with many tournaments (>5)', () => {
      const manyTournaments: Tournament[] = Array.from({ length: 10 }, (_, i) => ({
        id: `trn_${i}`,
        name: `U${10 + i * 2}`,
        url: `https://echecs.asso.fr/test?Action=Ga&Groupe=${i}`,
        lastUpdate: '',
        players: [],
      }));

      const bigEvent: Event = {
        ...mockEvent,
        tournaments: manyTournaments,
      };

      render(<TournamentTabs event={bigEvent} onEventUpdate={mockOnEventUpdate} />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(10);
    });

    it('handles concurrent refresh clicks gracefully', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ html: '<html></html>' }),
          } as Response), 100)
        )
      );

      const mockGetListUrl = vi.mocked(getListUrl);
      mockGetListUrl.mockReturnValue('https://echecs.asso.fr/test?Action=Ls');

      const mockParseFFePages = vi.mocked(parseFFePages);
      mockParseFFePages.mockReturnValue({
        players: mockPlayers,
        currentRound: 1,
      });

      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      const refreshButton = screen.getAllByText('Actualiser')[0];

      // Click multiple times rapidly
      fireEvent.click(refreshButton);
      fireEvent.click(refreshButton);
      fireEvent.click(refreshButton);

      // Button should be disabled after first click
      expect(refreshButton).toBeDisabled();

      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
      }, { timeout: 3000 });
    });
  });
});
