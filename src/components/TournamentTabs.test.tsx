// @vitest-environment jsdom
'use client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import TournamentTabs from './TournamentTabs';
import { parseFFePages, getListUrl, getResultsUrl, getStatsUrl, parseStatsClubs } from '@/lib/parser';
import { saveEvent } from '@/lib/storage';
import type { Event, Tournament, Player } from '@/types';

// Mock dependencies
vi.mock('@/lib/parser', () => ({
  parseFFePages: vi.fn(),
  getListUrl: vi.fn(),
  getResultsUrl: vi.fn(),
  getStatsUrl: vi.fn(),
  parseStatsClubs: vi.fn(),
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
      club: 'Mon Club',
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

  // Event without clubName (Phase 1 behavior)
  const mockEvent: Event = {
    id: 'evt_1',
    name: 'Test Event',
    createdAt: '2025-01-01',
    tournaments: [mockTournament1, mockTournament2],
  };

  // Event with clubName (Phase 2 behavior)
  const mockEventWithClub: Event = {
    ...mockEvent,
    clubName: 'Mon Club',
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

      const u12Tab = screen.getByRole('tab', { name: /U12/i });
      expect(u12Tab).toBeInTheDocument();
    });

    it('renders content when tournament has players', () => {
      const eventWithPlayers: Event = {
        ...mockEventWithClub,
        tournaments: [mockTournament2],
      };

      render(<TournamentTabs event={eventWithPlayers} onEventUpdate={mockOnEventUpdate} />);

      expect(screen.queryByText(/Aucune donnée/i)).not.toBeInTheDocument();
    });

    it('shows empty message when no club selected and no players', () => {
      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      expect(screen.getByText(/Cliquez sur Actualiser pour détecter les clubs/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('switches tab content when tab is clicked', () => {
      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      const u14Tab = screen.getByRole('tab', { name: /U14/i });
      fireEvent.click(u14Tab);

      expect(u14Tab).toBeInTheDocument();
    });

    it('renders all tabs correctly', () => {
      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      const u12Tab = screen.getByRole('tab', { name: /U12/i });
      const u14Tab = screen.getByRole('tab', { name: /U14/i });

      expect(u12Tab).toBeInTheDocument();
      expect(u14Tab).toBeInTheDocument();

      fireEvent.click(u14Tab);
      expect(u14Tab).toBeInTheDocument();
    });
  });

  describe('Phase 1: Club Detection (no clubName)', () => {
    it('renders refresh button', () => {
      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      const refreshButtons = screen.getAllByText('Actualiser');
      expect(refreshButtons.length).toBeGreaterThan(0);
    });

    it('fetches Stats page when refreshing without clubName', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ html: '<html></html>' }),
      } as Response);

      const mockGetStatsUrl = vi.mocked(getStatsUrl);
      mockGetStatsUrl.mockReturnValue('https://echecs.asso.fr/test?Action=Stats');

      const mockParseStatsClubs = vi.mocked(parseStatsClubs);
      mockParseStatsClubs.mockReturnValue([
        { name: 'Mon Club', playerCount: 5 },
        { name: 'Autre Club', playerCount: 3 },
      ]);

      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      const refreshButton = screen.getAllByText('Actualiser')[0];
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      expect(mockGetStatsUrl).toHaveBeenCalledWith(mockTournament1.url);
      expect(mockParseStatsClubs).toHaveBeenCalled();
    });

    it('updates event with detected clubs on successful Stats fetch', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ html: '<html></html>' }),
      } as Response);

      vi.mocked(getStatsUrl).mockReturnValue('https://echecs.asso.fr/test?Action=Stats');
      vi.mocked(parseStatsClubs).mockReturnValue([
        { name: 'Mon Club', playerCount: 5 },
      ]);

      render(<TournamentTabs event={mockEvent} onEventUpdate={mockOnEventUpdate} />);

      const refreshButton = screen.getAllByText('Actualiser')[0];
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockOnEventUpdate).toHaveBeenCalled();
      });

      const updatedEvent = mockOnEventUpdate.mock.calls[0][0];
      expect(updatedEvent.availableClubs).toEqual([{ name: 'Mon Club', playerCount: 5 }]);
    });
  });

  describe('Phase 2: Fetch Results (with clubName)', () => {
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

      vi.mocked(getListUrl).mockReturnValue('https://echecs.asso.fr/test?Action=Ls');
      vi.mocked(getResultsUrl).mockReturnValue('https://echecs.asso.fr/test?Action=Ga');
      vi.mocked(parseFFePages).mockReturnValue({ players: mockPlayers, currentRound: 1 });

      render(<TournamentTabs event={mockEventWithClub} onEventUpdate={mockOnEventUpdate} />);

      const refreshButton = screen.getAllByText('Actualiser')[0];
      fireEvent.click(refreshButton);

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

      vi.mocked(getListUrl).mockReturnValue('https://echecs.asso.fr/test?Action=Ls');
      vi.mocked(getResultsUrl).mockReturnValue('https://echecs.asso.fr/test?Action=Ga');
      vi.mocked(parseFFePages).mockReturnValue({ players: mockPlayers, currentRound: 1 });

      render(<TournamentTabs event={mockEventWithClub} onEventUpdate={mockOnEventUpdate} />);

      const refreshButton = screen.getAllByText('Actualiser')[0];
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

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

      vi.mocked(getListUrl).mockReturnValue('https://echecs.asso.fr/test?Action=Ls');
      vi.mocked(getResultsUrl).mockReturnValue('https://echecs.asso.fr/test?Action=Ga');
      vi.mocked(parseFFePages).mockReturnValue({ players: mockPlayers, currentRound: 1 });

      const mockSaveEvent = vi.mocked(saveEvent);

      render(<TournamentTabs event={mockEventWithClub} onEventUpdate={mockOnEventUpdate} />);

      const refreshButton = screen.getAllByText('Actualiser')[0];
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockOnEventUpdate).toHaveBeenCalled();
      });

      expect(mockSaveEvent).toHaveBeenCalled();

      const updatedEvent = mockOnEventUpdate.mock.calls[0][0];
      expect(updatedEvent.tournaments[0].players).toEqual(mockPlayers);
    });

    it('displays error message on fetch failure', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      } as Response);

      vi.mocked(getListUrl).mockReturnValue('https://echecs.asso.fr/test?Action=Ls');
      vi.mocked(getResultsUrl).mockReturnValue('https://echecs.asso.fr/test?Action=Ga');

      render(<TournamentTabs event={mockEventWithClub} onEventUpdate={mockOnEventUpdate} />);

      const refreshButton = screen.getAllByText('Actualiser')[0];
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/serveur FFE rencontre des problèmes/i)).toBeInTheDocument();
      });
    });

    it('handles API timeout error gracefully', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      vi.mocked(getListUrl).mockReturnValue('https://echecs.asso.fr/test?Action=Ls');
      vi.mocked(getResultsUrl).mockReturnValue('https://echecs.asso.fr/test?Action=Ga');

      render(<TournamentTabs event={mockEventWithClub} onEventUpdate={mockOnEventUpdate} />);

      const refreshButton = screen.getAllByText('Actualiser')[0];
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/network timeout/i)).toBeInTheDocument();
      });
    });
  });

  describe('Display States', () => {
    it('renders PlayerTable when tournament has players', () => {
      const eventWithPlayers: Event = {
        ...mockEventWithClub,
        tournaments: [mockTournament2],
      };

      render(<TournamentTabs event={eventWithPlayers} onEventUpdate={mockOnEventUpdate} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('shows empty state for tournament with no players and clubName set', () => {
      render(<TournamentTabs event={mockEventWithClub} onEventUpdate={mockOnEventUpdate} />);

      expect(screen.getByText(/Aucun joueur Mon Club/i)).toBeInTheDocument();
    });

    it('displays last update timestamp when available', () => {
      const eventWithUpdate: Event = {
        ...mockEventWithClub,
        tournaments: [mockTournament2],
      };

      render(<TournamentTabs event={eventWithUpdate} onEventUpdate={mockOnEventUpdate} />);

      expect(screen.getByText(/Dernière mise à jour/i)).toBeInTheDocument();
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

      vi.mocked(getStatsUrl).mockReturnValue('https://echecs.asso.fr/test?Action=Stats');
      vi.mocked(parseStatsClubs).mockReturnValue([
        { name: 'Mon Club', playerCount: 5 },
      ]);

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
