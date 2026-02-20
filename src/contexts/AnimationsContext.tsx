'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AnimationsContextType {
  animationsEnabled: boolean;
  toggleAnimations: () => void;
}

const AnimationsContext = createContext<AnimationsContextType | undefined>(undefined);

export function AnimationsProvider({ children }: { children: ReactNode }) {
  // Initialize with default value to avoid hydration mismatch
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage after mount (client-side only)
  useEffect(() => {
    const saved = localStorage.getItem('animationsEnabled');
    const value = saved !== null ? JSON.parse(saved) : true;
    // Justification: Hydration-safe initialization from localStorage must happen in useEffect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnimationsEnabled(value);
    // Justification: Mounted flag must be set after client-side hydration to avoid SSR mismatch
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Apply to document when state changes
  useEffect(() => {
    if (!mounted) return;

    if (animationsEnabled) {
      document.documentElement.classList.remove('no-animations');
    } else {
      document.documentElement.classList.add('no-animations');
    }
  }, [animationsEnabled, mounted]);

  const toggleAnimations = () => {
    setAnimationsEnabled((prev: boolean) => {
      const newValue = !prev;
      localStorage.setItem('animationsEnabled', JSON.stringify(newValue));
      return newValue;
    });
  };

  return (
    <AnimationsContext.Provider value={{ animationsEnabled, toggleAnimations }}>
      {children}
    </AnimationsContext.Provider>
  );
}

// Justification: useAnimations is a custom hook co-located with its provider by convention
// eslint-disable-next-line react-refresh/only-export-components
export function useAnimations() {
  const context = useContext(AnimationsContext);
  if (context === undefined) {
    throw new Error('useAnimations must be used within an AnimationsProvider');
  }
  return context;
}
