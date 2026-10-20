// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockSyncClub = vi.fn();
const mockStop = vi.fn();
const mockStartAutoSync = vi.fn((_slug: string, _onApplied: () => void) => mockStop);
vi.mock('@/lib/sync', () => ({
  syncClub: (...args: unknown[]) => mockSyncClub(...args),
  startAutoSync: (slug: string, onApplied: () => void) => mockStartAutoSync(slug, onApplied),
}));

import useClubAutoSync from './useClubAutoSync';

describe('useClubAutoSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs once on open and reports the applied state', async () => {
    mockSyncClub.mockResolvedValue({ ok: true });
    const onApplied = vi.fn();
    renderHook(() => useClubAutoSync('hay-chess', onApplied));
    await waitFor(() => expect(onApplied).toHaveBeenCalledTimes(1));
    expect(mockSyncClub).toHaveBeenCalledWith('hay-chess');
  });

  it('does not report when the open sync fails (offline)', async () => {
    mockSyncClub.mockResolvedValue({ ok: false });
    const onApplied = vi.fn();
    renderHook(() => useClubAutoSync('hay-chess', onApplied));
    await waitFor(() => expect(mockSyncClub).toHaveBeenCalled());
    expect(onApplied).not.toHaveBeenCalled();
  });

  it('starts auto-sync for the club and stops it on unmount', () => {
    mockSyncClub.mockResolvedValue({ ok: true });
    const { unmount } = renderHook(() => useClubAutoSync('hay-chess', vi.fn()));
    expect(mockStartAutoSync).toHaveBeenCalledWith('hay-chess', expect.any(Function));
    unmount();
    expect(mockStop).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a club', () => {
    renderHook(() => useClubAutoSync('', vi.fn()));
    expect(mockSyncClub).not.toHaveBeenCalled();
    expect(mockStartAutoSync).not.toHaveBeenCalled();
  });
});
