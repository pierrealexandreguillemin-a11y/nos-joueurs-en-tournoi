'use client';

import { useEffect, useRef } from 'react';
import { startAutoSync, syncClub } from '@/lib/sync';

/**
 * Automatic club sync (docs/superpowers/specs/2026-10-20-auto-sync-light-design.md):
 * one sync when the app opens, then a sync a few seconds after each local change and when the
 * network comes back. `onApplied` runs after every successful sync so the screen re-reads storage.
 */
export default function useClubAutoSync(clubSlug: string, onApplied: () => void): void {
  const onAppliedRef = useRef(onApplied);

  useEffect(() => {
    onAppliedRef.current = onApplied;
  }, [onApplied]);

  useEffect(() => {
    if (!clubSlug) return;
    const notify = () => onAppliedRef.current();
    void syncClub(clubSlug).then(result => { if (result.ok) notify(); });
    return startAutoSync(clubSlug, notify);
  }, [clubSlug]);
}
