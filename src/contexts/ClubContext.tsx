'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { ClubIdentity } from '@/types';
import { getClubIdentity, setClubIdentity, clearClubIdentity, migrateLegacyData } from '@/lib/club';

interface ClubContextType {
  identity: ClubIdentity | null;
  isLoaded: boolean;
  setClub: (name: string) => ClubIdentity;
  clearClub: () => void;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export function ClubProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<ClubIdentity | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage after mount (client-side only)
  useEffect(() => {
    const saved = getClubIdentity();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIdentity(saved);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoaded(true);
  }, []);

  const setClub = useCallback((name: string): ClubIdentity => {
    const newIdentity = setClubIdentity(name);
    migrateLegacyData(newIdentity.clubSlug);
    setIdentity(newIdentity);
    return newIdentity;
  }, []);

  const clearClub = useCallback(() => {
    clearClubIdentity();
    setIdentity(null);
  }, []);

  return (
    <ClubContext.Provider value={{ identity, isLoaded, setClub, clearClub }}>
      {children}
    </ClubContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useClub() {
  const context = useContext(ClubContext);
  if (context === undefined) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
}
