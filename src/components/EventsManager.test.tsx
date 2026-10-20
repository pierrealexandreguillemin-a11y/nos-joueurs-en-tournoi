// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventsManager from './EventsManager';
import { createClubStorage } from '@/lib/storage';
import { makeEvent } from '@/test/fixtures';

vi.mock('@/contexts/ClubContext', () => ({
  useClub: vi.fn(() => ({
    identity: { clubName: 'Test Club', clubSlug: 'test-club', createdAt: '2025-01-01' },
    isLoaded: true,
    setClub: vi.fn(),
    clearClub: vi.fn(),
  })),
}));

// Sync is automatic (docs/superpowers/specs/2026-10-20-auto-sync-light-design.md): no manual cloud controls,
// and deleting an event deletes it for the whole club.
describe('EventsManager', () => {
  beforeEach(() => {
    localStorage.clear();
    const storage = createClubStorage('test-club');
    storage.saveEventLocal(makeEvent('e1', 'Open A'));
    storage.saveEventLocal(makeEvent('e2', 'Open B'));
  });

  const openManager = async () => {
    render(<EventsManager currentEventId="e1" onEventChange={vi.fn()} onNewEventClick={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Gérer les événements' }));
  };

  it('has no manual cloud upload or download control', async () => {
    await openManager();
    expect(screen.queryByRole('button', { name: /cloud/i })).not.toBeInTheDocument();
  });

  it('warns that a deletion applies to the whole club', async () => {
    await openManager();
    await userEvent.click(screen.getByRole('button', { name: "Supprimer l'événement Open B" }));
    expect(await screen.findByText(/pour tout le club, sur tous les téléphones/)).toBeInTheDocument();
  });
});
