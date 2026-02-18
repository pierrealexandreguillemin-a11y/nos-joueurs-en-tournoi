'use client';

import type { ClubIdentity } from '@/types';

const CLUB_IDENTITY_KEY = 'nos-joueurs-club-identity';
const LEGACY_STORAGE_KEY = 'nos-joueurs-en-tournoi';

/**
 * Slugify a club name for use as a namespace key.
 * Deterministic: same input always produces same output.
 */
export function slugifyClubName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Club name cannot be empty');
  }

  const slug = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')    // replace non-alphanum sequences with single dash
    .replace(/^-+|-+$/g, '')         // trim leading/trailing dashes
    .slice(0, 40)                    // max 40 chars
    .replace(/-+$/, '');             // trim any trailing dash from truncation

  if (!slug) {
    throw new Error('Club name cannot be empty');
  }

  return slug;
}

/**
 * Get the localStorage key for a given club slug.
 */
export function getStorageKeyForSlug(slug: string): string {
  return `${LEGACY_STORAGE_KEY}:${slug}`;
}

/**
 * Get the current club identity from localStorage.
 */
export function getClubIdentity(): ClubIdentity | null {
  if (typeof window === 'undefined' && typeof globalThis.localStorage === 'undefined') return null;

  const data = localStorage.getItem(CLUB_IDENTITY_KEY);
  if (!data) return null;

  try {
    return JSON.parse(data) as ClubIdentity;
  } catch {
    return null;
  }
}

/**
 * Set the club identity in localStorage.
 */
export function setClubIdentity(clubName: string): ClubIdentity {
  const identity: ClubIdentity = {
    clubName,
    clubSlug: slugifyClubName(clubName),
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(CLUB_IDENTITY_KEY, JSON.stringify(identity));
  return identity;
}

/**
 * Clear the club identity from localStorage.
 */
export function clearClubIdentity(): void {
  localStorage.removeItem(CLUB_IDENTITY_KEY);
}

/**
 * Migrate legacy (non-namespaced) data to a namespaced key.
 * - Copies data from the old key to the new key
 * - Old key remains intact (non-destructive)
 * - No-op if old key is empty or new key already has data
 */
export function migrateLegacyData(slug: string): void {
  const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacyData) return;

  const newKey = getStorageKeyForSlug(slug);
  const existingData = localStorage.getItem(newKey);
  if (existingData) return;

  localStorage.setItem(newKey, legacyData);
}
