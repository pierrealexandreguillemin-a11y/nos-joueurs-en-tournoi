// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import ClubStats from './ClubStats';
import { calculateClubStats } from '@/lib/parser';
import type { Player } from '@/types';

// Mock the calculateClubStats function
vi.mock('@/lib/parser', () => ({
  calculateClubStats: vi.fn(),
}));

describe('ClubStats', () => {
  const mockPlayers: Player[] = [
    {
      name: 'Alice',
      elo: 1500,
      club: 'Hay Chess',
      results: [
        { round: 1, score: 1 as const },
        { round: 2, score: 0.5 as const },
      ],
      currentPoints: 1.5,
      ranking: 1,
      validated: [false, false],
    },
    {
      name: 'Bob',
      elo: 1400,
      club: 'Hay Chess',
      results: [
        { round: 1, score: 0 as const },
        { round: 2, score: 1 as const },
      ],
      currentPoints: 1,
      ranking: 2,
      validated: [false, false],
    },
  ];

  it('displays number of players correctly', () => {
    const mockCalculateClubStats = vi.mocked(calculateClubStats);
    mockCalculateClubStats.mockReturnValue({
      round: 2,
      totalPoints: 2.5,
      playerCount: 2,
      averagePoints: 1.25,
    });

    render(<ClubStats players={mockPlayers} currentRound={2} />);

    expect(screen.getByText('2 joueurs')).toBeInTheDocument();
  });

  it('displays total points correctly', () => {
    const mockCalculateClubStats = vi.mocked(calculateClubStats);
    mockCalculateClubStats.mockReturnValue({
      round: 2,
      totalPoints: 2.5,
      playerCount: 2,
      averagePoints: 1.25,
    });

    render(<ClubStats players={mockPlayers} currentRound={2} />);

    expect(screen.getByText(/2.5 points/i)).toBeInTheDocument();
  });

  it('displays average points correctly', () => {
    const mockCalculateClubStats = vi.mocked(calculateClubStats);
    mockCalculateClubStats.mockReturnValue({
      round: 2,
      totalPoints: 2.5,
      playerCount: 2,
      averagePoints: 1.25,
    });

    render(<ClubStats players={mockPlayers} currentRound={2} />);

    expect(screen.getByText(/1.25 pts\/joueur/i)).toBeInTheDocument();
  });

  it('displays current round correctly', () => {
    const mockCalculateClubStats = vi.mocked(calculateClubStats);
    mockCalculateClubStats.mockReturnValue({
      round: 3,
      totalPoints: 4.0,
      playerCount: 2,
      averagePoints: 2.0,
    });

    render(<ClubStats players={mockPlayers} currentRound={3} />);

    expect(screen.getByText(/Ronde 3/i)).toBeInTheDocument();
  });

  it('handles 0 players gracefully', () => {
    const mockCalculateClubStats = vi.mocked(calculateClubStats);
    mockCalculateClubStats.mockReturnValue({
      round: 0,
      totalPoints: 0,
      playerCount: 0,
      averagePoints: 0,
    });

    render(<ClubStats players={[]} currentRound={0} />);

    expect(screen.getByText('0 joueurs')).toBeInTheDocument();
    expect(screen.getByText(/0 points/i)).toBeInTheDocument();
    expect(screen.getByText(/0 pts\/joueur/i)).toBeInTheDocument();
  });

  it('calls calculateClubStats with correct parameters', () => {
    const mockCalculateClubStats = vi.mocked(calculateClubStats);
    mockCalculateClubStats.mockReturnValue({
      round: 2,
      totalPoints: 2.5,
      playerCount: 2,
      averagePoints: 1.25,
    });

    render(<ClubStats players={mockPlayers} currentRound={2} />);

    expect(mockCalculateClubStats).toHaveBeenCalledWith(mockPlayers, 2);
  });

  it('handles high numbers of players correctly', () => {
    const manyPlayers: Player[] = Array.from({ length: 50 }, (_, i) => ({
      name: `Player ${i + 1}`,
      elo: 1500,
      club: 'Hay Chess',
      results: [
        { round: 1, score: 1 as const },
        { round: 2, score: 0.5 as const },
      ],
      currentPoints: 1.5,
      ranking: i + 1,
      validated: [false, false],
    }));

    const mockCalculateClubStats = vi.mocked(calculateClubStats);
    mockCalculateClubStats.mockReturnValue({
      round: 2,
      totalPoints: 75.0,
      playerCount: 50,
      averagePoints: 1.5,
    });

    render(<ClubStats players={manyPlayers} currentRound={2} />);

    expect(screen.getByText('50 joueurs')).toBeInTheDocument();
    expect(screen.getByText(/75 points/i)).toBeInTheDocument();
    expect(screen.getByText(/1.5 pts\/joueur/i)).toBeInTheDocument();
  });

  it('displays stats heading with club name', () => {
    const mockCalculateClubStats = vi.mocked(calculateClubStats);
    mockCalculateClubStats.mockReturnValue({
      round: 2,
      totalPoints: 2.5,
      playerCount: 2,
      averagePoints: 1.25,
    });

    render(<ClubStats players={mockPlayers} currentRound={2} clubName="Mon Club" />);

    expect(screen.getByText(/Stats Mon Club/i)).toBeInTheDocument();
  });

  it('uses Badge component for player count', () => {
    const mockCalculateClubStats = vi.mocked(calculateClubStats);
    mockCalculateClubStats.mockReturnValue({
      round: 2,
      totalPoints: 2.5,
      playerCount: 2,
      averagePoints: 1.25,
    });

    const { container } = render(<ClubStats players={mockPlayers} currentRound={2} />);

    // Badge component should have specific classes
    const badge = container.querySelector('.inline-flex');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('2 joueurs');
  });

  it('formats decimal values correctly', () => {
    const mockCalculateClubStats = vi.mocked(calculateClubStats);
    mockCalculateClubStats.mockReturnValue({
      round: 2,
      totalPoints: 10.75,
      playerCount: 5,
      averagePoints: 2.15,
    });

    render(<ClubStats players={mockPlayers} currentRound={2} />);

    // Should display exact decimal values from calculateClubStats
    expect(screen.getByText(/10.75 points/i)).toBeInTheDocument();
    expect(screen.getByText(/2.15 pts\/joueur/i)).toBeInTheDocument();
  });
});
