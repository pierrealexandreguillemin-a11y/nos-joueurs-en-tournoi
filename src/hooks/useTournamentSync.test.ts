// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Event, ClubInfo } from '@/types';
import { makePlayer, makeTournament as makeFixtureTournament } from '@/test/fixtures';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mutable identity — allows testing identity === null (F2)
let mockIdentity: { clubName: string; clubSlug: string; createdAt: string } | null = {
  clubName: 'Test Club',
  clubSlug: 'test-club',
  createdAt: '2024-01-01',
};

vi.mock('@/contexts/ClubContext', () => ({
  useClub: () => ({ identity: mockIdentity, isLoaded: true, setClub: vi.fn(), clearClub: vi.fn() }),
}));

// Mock scraper
const mockScrapeFFE = vi.fn();
const mockScrapeFFEPair = vi.fn();
vi.mock('@/lib/scraper', () => ({
  scrapeFFE: (...args: unknown[]) => mockScrapeFFE(...args),
  scrapeFFEPair: (...args: unknown[]) => mockScrapeFFEPair(...args),
}));

// Mock parser
const mockParseFFePages = vi.fn();
const mockParseStatsClubs = vi.fn();
vi.mock('@/lib/parser', () => ({
  parseFFePages: (...args: unknown[]) => mockParseFFePages(...args),
  getListUrl: (url: string) => `${url}&Ligue=list`,
  getResultsUrl: (url: string) => `${url}&Ligue=results`,
  getStatsUrl: (url: string) => `${url}&Ligue=stats`,
  parseStatsClubs: (...args: unknown[]) => mockParseStatsClubs(...args),
}));

// Mock storage
const mockSaveEvent = vi.fn();
const mockClearTournamentValidations = vi.fn();
vi.mock('@/lib/storage', () => ({
  createClubStorage: () => ({
    saveEvent: mockSaveEvent,
    clearTournamentValidations: mockClearTournamentValidations,
  }),
}));

// Import AFTER mocks
import useTournamentSync from './useTournamentSync';

// ── Fixtures (leverage @/test/fixtures — F12) ────────────────────────────────

function makeTournament(id: string, name: string, players: Event['tournaments'][0]['players'] = []) {
  return makeFixtureTournament({ id, name, url: 'https://ffe.test/tournoi', lastUpdate: '', players });
}

function makeTestEvent(overrides?: Partial<Event>): Event {
  return {
    id: 'evt-1',
    name: 'Test Event',
    createdAt: '2024-01-01',
    tournaments: [makeTournament('trn-1', 'U12')],
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useTournamentSync', () => {
  let onEventUpdate: ReturnType<typeof vi.fn<(event: Event) => void>>;

  beforeEach(() => {
    vi.clearAllMocks();
    onEventUpdate = vi.fn<(event: Event) => void>();
    // Reset identity to default for each test
    mockIdentity = { clubName: 'Test Club', clubSlug: 'test-club', createdAt: '2024-01-01' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderSync(event: Event) {
    return renderHook(() => useTournamentSync({ event, onEventUpdate }));
  }

  // ── Initial state ──────────────────────────────────────────────────────

  it('retourne l\'état initial correct', () => {
    const event = makeTestEvent();
    const { result } = renderSync(event);

    expect(result.current.loading).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.activeTab).toBe('trn-1');
    expect(result.current.needsClubSelection).toBeFalsy();
    expect(result.current.canChangeClub).toBe(false);
    expect(result.current.changeClubDialogOpen).toBe(false);
    expect(result.current.playerCount).toBe(0);
  });

  it('activeTab vide quand pas de tournois', () => {
    const event = makeTestEvent({ tournaments: [] });
    const { result } = renderSync(event);

    expect(result.current.activeTab).toBe('');
  });

  // ── identity === null (F2: lines 213-214) ──────────────────────────────

  it('identity null → clubSlug vide, storage null, commitEvent ne persiste pas', async () => {
    mockIdentity = null;

    const clubs: ClubInfo[] = [{ name: 'Hay Chess', playerCount: 5 }];
    mockScrapeFFE.mockResolvedValueOnce('<html>stats</html>');
    mockParseStatsClubs.mockReturnValueOnce(clubs);

    const event = makeTestEvent();
    const { result } = renderSync(event);

    await act(async () => {
      await result.current.handleRefresh(event.tournaments[0]);
    });

    // onEventUpdate called but storage.saveEvent NOT called (storage is null)
    expect(onEventUpdate).toHaveBeenCalled();
    expect(mockSaveEvent).not.toHaveBeenCalled();
  });

  // ── needsClubSelection / canChangeClub ─────────────────────────────────

  it('needsClubSelection=true quand clubs disponibles sans clubName', () => {
    const clubs: ClubInfo[] = [{ name: 'Club A', playerCount: 3 }];
    const event = makeTestEvent({ availableClubs: clubs });
    const { result } = renderSync(event);

    expect(result.current.needsClubSelection).toBeTruthy();
    expect(result.current.canChangeClub).toBe(false);
  });

  it('canChangeClub=true quand clubName et clubs disponibles', () => {
    const clubs: ClubInfo[] = [{ name: 'Club A', playerCount: 3 }];
    const event = makeTestEvent({ clubName: 'Club A', availableClubs: clubs });
    const { result } = renderSync(event);

    expect(result.current.canChangeClub).toBe(true);
    expect(result.current.needsClubSelection).toBeFalsy();
  });

  // ── handleRefresh → fetchClubs (pas de clubName) ──────────────────────

  it('handleRefresh appelle fetchClubs quand pas de clubName', async () => {
    const clubs: ClubInfo[] = [{ name: 'Hay Chess', playerCount: 5 }];
    mockScrapeFFE.mockResolvedValueOnce('<html>stats</html>');
    mockParseStatsClubs.mockReturnValueOnce(clubs);

    const event = makeTestEvent();
    const { result } = renderSync(event);

    await act(async () => {
      await result.current.handleRefresh(event.tournaments[0]);
    });

    expect(mockScrapeFFE).toHaveBeenCalled();
    expect(mockParseStatsClubs).toHaveBeenCalledWith('<html>stats</html>');
    expect(onEventUpdate).toHaveBeenCalledWith(expect.objectContaining({ availableClubs: clubs }));
  });

  it('fetchClubs — erreur quand aucun club détecté', async () => {
    mockScrapeFFE.mockResolvedValueOnce('<html>stats</html>');
    mockParseStatsClubs.mockReturnValueOnce([]);

    const event = makeTestEvent();
    const { result } = renderSync(event);

    await act(async () => {
      await result.current.handleRefresh(event.tournaments[0]);
    });

    expect(result.current.error).toBe('Aucun club détecté. Le tournoi n\'a peut-être pas encore commencé.');
  });

  it('fetchClubs — erreur non-Error donne UNKNOWN_ERROR', async () => {
    mockScrapeFFE.mockRejectedValueOnce('raw string error');

    const event = makeTestEvent();
    const { result } = renderSync(event);

    await act(async () => {
      await result.current.handleRefresh(event.tournaments[0]);
    });

    expect(result.current.error).toBe('Erreur inconnue');
  });

  it('fetchClubs — erreur réseau donne le message d\'erreur', async () => {
    mockScrapeFFE.mockRejectedValueOnce(new Error('Network failure'));

    const event = makeTestEvent();
    const { result } = renderSync(event);

    await act(async () => {
      await result.current.handleRefresh(event.tournaments[0]);
    });

    expect(result.current.error).toBe('Network failure');
  });

  // ── handleRefresh → fetchResults (avec clubName) ──────────────────────

  it('handleRefresh appelle fetchResults quand clubName défini', async () => {
    const players = [makePlayer({ name: 'Alice', club: 'Hay Chess' })];
    mockScrapeFFEPair.mockResolvedValueOnce(['<list>', '<results>']);
    mockParseFFePages.mockReturnValueOnce({ players });

    const event = makeTestEvent({ clubName: 'Hay Chess' });
    const { result } = renderSync(event);

    await act(async () => {
      await result.current.handleRefresh(event.tournaments[0]);
    });

    expect(mockScrapeFFEPair).toHaveBeenCalled();
    expect(onEventUpdate).toHaveBeenCalled();
    const updatedEvent = onEventUpdate.mock.calls[0][0] as Event;
    expect(updatedEvent.tournaments[0].players).toHaveLength(1);
  });

  it('fetchResults — erreur quand aucun joueur trouvé', async () => {
    mockScrapeFFEPair.mockResolvedValueOnce(['<list>', '<results>']);
    mockParseFFePages.mockReturnValueOnce({ players: [] });

    const event = makeTestEvent({ clubName: 'Hay Chess' });
    const { result } = renderSync(event);

    await act(async () => {
      await result.current.handleRefresh(event.tournaments[0]);
    });

    expect(result.current.error).toContain('Aucun joueur Hay Chess trouvé');
  });

  // F1 FIX: This test was renamed — handleRefresh without clubName dispatches
  // to fetchClubs, not fetchResults. Line 142 is NOT reachable via handleRefresh
  // because handleRefresh checks event.clubName first (line 169).
  // The early return at line 142 is defense-in-depth for direct fetchResults calls.
  // We document this honestly instead of pretending coverage.
  it('handleRefresh sans clubName → fetchClubs (pas fetchResults)', async () => {
    mockScrapeFFE.mockResolvedValueOnce('<html>stats</html>');
    mockParseStatsClubs.mockReturnValueOnce([{ name: 'Club', playerCount: 1 }]);

    const event = makeTestEvent(); // no clubName
    const { result } = renderSync(event);

    await act(async () => {
      await result.current.handleRefresh(event.tournaments[0]);
    });

    // Proves fetchClubs was called (scrapeFFE), NOT fetchResults (scrapeFFEPair)
    expect(mockScrapeFFE).toHaveBeenCalled();
    expect(mockScrapeFFEPair).not.toHaveBeenCalled();
  });

  it('fetchResults — erreur non-Error donne UNKNOWN_ERROR', async () => {
    mockScrapeFFEPair.mockRejectedValueOnce(42);

    const event = makeTestEvent({ clubName: 'Hay Chess' });
    const { result } = renderSync(event);

    await act(async () => {
      await result.current.handleRefresh(event.tournaments[0]);
    });

    expect(result.current.error).toBe('Erreur inconnue');
  });

  // ── handleClubSelect ──────────────────────────────────────────────────

  it('handleClubSelect met à jour l\'event puis rafraîchit chaque tournoi', async () => {
    const players = [makePlayer({ name: 'Alice', club: 'Hay Chess' })];
    mockScrapeFFEPair.mockResolvedValue(['<list>', '<results>']);
    mockParseFFePages.mockReturnValue({ players });

    const event = makeTestEvent({
      tournaments: [makeTournament('trn-1', 'U12'), makeTournament('trn-2', 'U14')],
    });
    const { result } = renderSync(event);

    await act(async () => {
      await result.current.handleClubSelect('Hay Chess');
    });

    // commitEvent appelé pour le clubName initial + une fois par tournoi
    expect(onEventUpdate).toHaveBeenCalledTimes(3);
    // Première invocation : set clubName
    expect((onEventUpdate.mock.calls[0][0] as Event).clubName).toBe('Hay Chess');
  });

  it('handleClubSelect — erreur pendant un tournoi ne bloque pas les autres', async () => {
    const players = [makePlayer({ name: 'Alice', club: 'Hay Chess' })];
    // Premier tournoi échoue, second réussit
    mockScrapeFFEPair
      .mockRejectedValueOnce(new Error('FFE down'))
      .mockResolvedValueOnce(['<list>', '<results>']);
    mockParseFFePages.mockReturnValue({ players });

    const event = makeTestEvent({
      tournaments: [makeTournament('trn-1', 'U12'), makeTournament('trn-2', 'U14')],
    });
    const { result } = renderSync(event);

    await act(async () => {
      await result.current.handleClubSelect('Hay Chess');
    });

    // commitEvent: 1 (clubName) + 1 (trn-2 success) = 2 (trn-1 a échoué)
    expect(onEventUpdate).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull(); // 2nd tournament succeeds, clears error
  });

  it('handleClubSelect — erreur non-Error donne UNKNOWN_ERROR', async () => {
    mockScrapeFFEPair.mockRejectedValueOnce({ weird: 'object' });

    const event = makeTestEvent({ tournaments: [makeTournament('trn-1', 'U12')] });
    const { result } = renderSync(event);

    await act(async () => {
      await result.current.handleClubSelect('Hay Chess');
    });

    expect(result.current.error).toBe('Erreur inconnue');
  });

  // ── requestChangeClub / confirmChangeClub / cancelChangeClub ──────────

  it('requestChangeClub ouvre le dialog quand il y a des joueurs', () => {
    const players = [makePlayer({ name: 'Alice', club: 'Club' })];
    const event = makeTestEvent({
      clubName: 'Club',
      tournaments: [makeTournament('trn-1', 'U12', players)],
    });
    const { result } = renderSync(event);

    expect(result.current.playerCount).toBe(1);

    act(() => {
      result.current.requestChangeClub();
    });

    expect(result.current.changeClubDialogOpen).toBe(true);
  });

  it('requestChangeClub reset directement quand pas de joueurs', () => {
    const event = makeTestEvent({ clubName: 'Club' });
    const { result } = renderSync(event);

    expect(result.current.playerCount).toBe(0);

    act(() => {
      result.current.requestChangeClub();
    });

    expect(result.current.changeClubDialogOpen).toBe(false);
    expect(onEventUpdate).toHaveBeenCalledWith(expect.objectContaining({ clubName: undefined }));
  });

  it('confirmChangeClub ferme le dialog, clear les validations et reset', () => {
    const players = [makePlayer({ name: 'Alice', club: 'Club' })];
    const event = makeTestEvent({
      clubName: 'Club',
      tournaments: [makeTournament('trn-1', 'U12', players)],
    });
    const { result } = renderSync(event);

    act(() => {
      result.current.requestChangeClub();
    });
    expect(result.current.changeClubDialogOpen).toBe(true);

    act(() => {
      result.current.confirmChangeClub();
    });

    expect(result.current.changeClubDialogOpen).toBe(false);
    expect(mockClearTournamentValidations).toHaveBeenCalledWith('trn-1');
    expect(onEventUpdate).toHaveBeenCalledWith(expect.objectContaining({
      clubName: undefined,
      tournaments: expect.arrayContaining([expect.objectContaining({ players: [] })]),
    }));
  });

  it('cancelChangeClub ferme le dialog sans modifier', () => {
    const players = [makePlayer({ name: 'Alice', club: 'Club' })];
    const event = makeTestEvent({
      clubName: 'Club',
      tournaments: [makeTournament('trn-1', 'U12', players)],
    });
    const { result } = renderSync(event);

    act(() => {
      result.current.requestChangeClub();
    });
    act(() => {
      result.current.cancelChangeClub();
    });

    expect(result.current.changeClubDialogOpen).toBe(false);
    expect(onEventUpdate).not.toHaveBeenCalled();
  });

  // ── Ctrl+R shortcut ───────────────────────────────────────────────────

  it('Ctrl+R déclenche handleRefresh sur le tournoi actif', async () => {
    mockScrapeFFE.mockResolvedValueOnce('<html>stats</html>');
    mockParseStatsClubs.mockReturnValueOnce([{ name: 'Club', playerCount: 1 }]);

    const event = makeTestEvent();
    renderSync(event);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', ctrlKey: true }));
      // F8 FIX: use waitFor instead of fragile setTimeout
      await waitFor(() => {
        expect(mockScrapeFFE).toHaveBeenCalled();
      });
    });
  });

  it('Ctrl+R ne fait rien sans activeTab', () => {
    const event = makeTestEvent({ tournaments: [] });
    renderSync(event);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', ctrlKey: true }));
    });

    expect(mockScrapeFFE).not.toHaveBeenCalled();
    expect(mockScrapeFFEPair).not.toHaveBeenCalled();
  });

  // F7: loading guard — Ctrl+R while already loading does nothing
  it('Ctrl+R ne fait rien quand le tournoi actif est déjà en chargement', async () => {
    // Make scrapeFFE hang (never resolve) to keep loading state
    let resolveScrape!: (v: string) => void;
    mockScrapeFFE.mockImplementation(() => new Promise<string>(r => { resolveScrape = r; }));

    const event = makeTestEvent();
    const { result } = renderSync(event);

    // Trigger first refresh → sets loading = 'trn-1'
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', ctrlKey: true }));
    });

    // loading should now be set
    await waitFor(() => {
      expect(result.current.loading).toBe('trn-1');
    });

    // Reset call count
    mockScrapeFFE.mockClear();

    // Fire Ctrl+R again while loading
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', ctrlKey: true }));
    });

    // scrapeFFE should NOT have been called a second time
    expect(mockScrapeFFE).not.toHaveBeenCalled();

    // Clean up: resolve the pending promise
    await act(async () => {
      resolveScrape('<html></html>');
      mockParseStatsClubs.mockReturnValueOnce([]);
    });
  });

  // ── commitEvent persistence ───────────────────────────────────────────

  it('commitEvent persiste dans le storage et notifie onEventUpdate', async () => {
    const clubs: ClubInfo[] = [{ name: 'Hay Chess', playerCount: 5 }];
    mockScrapeFFE.mockResolvedValueOnce('<html>stats</html>');
    mockParseStatsClubs.mockReturnValueOnce(clubs);

    const event = makeTestEvent();
    const { result } = renderSync(event);

    await act(async () => {
      await result.current.handleRefresh(event.tournaments[0]);
    });

    expect(mockSaveEvent).toHaveBeenCalled();
    expect(onEventUpdate).toHaveBeenCalled();
  });
});
