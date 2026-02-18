import { describe, it, expect, beforeEach } from 'vitest';
import { createClubStorage } from '@/lib/storage';
import { slugifyClubName, getStorageKeyForSlug, migrateLegacyData } from '@/lib/club';
import { makeEvent } from './fixtures';

describe('Integration: storage + club namespace', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('workflow complet: slug → save → retrieve → isolation vérifiée', () => {
    const slug = slugifyClubName('Hay Chess');
    const storage = createClubStorage(slug);

    storage.saveEvent(makeEvent('e1', 'Tournoi Hay'));

    // Same slug retrieves the event
    const events = createClubStorage(slug).getAllEvents();
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('Tournoi Hay');

    // Different club doesn't see it
    const otherSlug = slugifyClubName('Lyon Echecs');
    expect(createClubStorage(otherSlug).getAllEvents()).toHaveLength(0);

    // Raw localStorage has the right key
    const key = getStorageKeyForSlug(slug);
    const raw = JSON.parse(localStorage.getItem(key)!);
    expect(raw.events[0].name).toBe('Tournoi Hay');
  });

  it('isolation validations entre clubs', () => {
    const storageA = createClubStorage('club-a');
    const storageB = createClubStorage('club-b');

    storageA.setValidation('trn_1', 'Alice', 1, true);

    expect(storageA.getValidation('trn_1', 'Alice', 1)).toBe(true);
    expect(storageB.getValidation('trn_1', 'Alice', 1)).toBe(false);
  });

  it('export/import préserve l\'isolation', () => {
    const storageA = createClubStorage('club-a');
    const storageB = createClubStorage('club-b');

    storageA.saveEvent(makeEvent('e1', 'Event A'));
    storageB.saveEvent(makeEvent('e2', 'Event B'));

    const exported = JSON.parse(storageA.exportData());
    expect(exported.events).toHaveLength(1);
    expect(exported.events[0].name).toBe('Event A');

    // Import into A doesn't affect B
    storageA.importData(JSON.stringify({
      currentEventId: 'e3',
      events: [makeEvent('e3', 'Imported')],
      validations: {},
    }));

    expect(storageA.getAllEvents()).toHaveLength(1);
    expect(storageA.getAllEvents()[0].name).toBe('Imported');
    expect(storageB.getAllEvents()).toHaveLength(1);
    expect(storageB.getAllEvents()[0].name).toBe('Event B');
  });

  it('migration legacy → namespaced préserve les données', () => {
    // Simulate legacy data
    const legacyData = JSON.stringify({
      currentEventId: 'e1',
      events: [makeEvent('e1', 'Legacy Event')],
      validations: {},
    });
    localStorage.setItem('nos-joueurs-en-tournoi', legacyData);

    // Migrate
    const slug = slugifyClubName('Hay Chess');
    migrateLegacyData(slug);

    // Namespaced storage should now have the data
    const storage = createClubStorage(slug);
    const events = storage.getAllEvents();
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('Legacy Event');

    // Legacy data still intact
    expect(localStorage.getItem('nos-joueurs-en-tournoi')).toBe(legacyData);
  });
});
