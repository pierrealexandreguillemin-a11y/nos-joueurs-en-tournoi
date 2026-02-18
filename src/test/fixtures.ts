import type { Event, Tournament, Player, StorageData } from '@/types';

export function makePlayer(overrides?: Partial<Player>): Player {
  return {
    name: 'Test Player',
    elo: 1500,
    club: 'Test Club',
    results: [{ round: 1, score: 1 }],
    currentPoints: 1,
    ranking: 1,
    validated: [false],
    ...overrides,
  };
}

export function makeTournament(overrides?: Partial<Tournament>): Tournament {
  return {
    id: 'trn_1',
    name: 'U12',
    url: 'https://echecs.asso.fr/test',
    lastUpdate: '',
    players: [],
    ...overrides,
  };
}

export function makeEvent(id: string, name: string, overrides?: Partial<Event>): Event {
  return {
    id,
    name,
    createdAt: '2024-01-01T00:00:00.000Z',
    tournaments: [],
    ...overrides,
  };
}

export function makeStorageData(overrides?: Partial<StorageData>): StorageData {
  return {
    currentEventId: '',
    events: [],
    validations: {},
    ...overrides,
  };
}
