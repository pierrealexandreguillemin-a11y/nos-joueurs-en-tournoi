// Core types for Nos Joueurs en Tournoi

export interface Event {
  id: string;
  name: string;
  clubName?: string;           // nom du club sélectionné
  availableClubs?: ClubInfo[]; // clubs détectés depuis Stats
  createdAt: string;
  tournaments: Tournament[];
}

export interface ClubInfo {
  name: string;
  playerCount: number;
}

export interface Tournament {
  id: string;
  name: string; // "U12", "U14", etc.
  url: string;  // URL page résultats FFE
  lastUpdate: string;
  players: Player[];
}

export interface Player {
  name: string;
  elo: number;
  club: string;
  results: Result[]; // Par ronde
  currentPoints: number;
  tiebreak?: number;    // Tr. (Tronqué) - FFE tiebreaker
  buchholz?: number;    // Buchholz score
  performance?: number; // Performance rating
  ranking: number;      // Classement tournoi complet
  validated: boolean[]; // Une par ronde
}

export interface Result {
  round: number;
  score: 0 | 0.5 | 1;
  opponent?: string;
}

export interface ValidationState {
  [tournamentId: string]: {
    [playerName: string]: {
      [roundKey: string]: boolean; // "round_1": true, "round_2": false, etc.
    };
  };
}

export interface StorageData {
  currentEventId: string;
  events: Event[];
  validations: ValidationState;
}

// FFE HTML Parsing types
export interface FFEPlayerRow {
  rank: number;
  name: string;
  elo: number;
  club: string;
  roundResults: (0 | 0.5 | 1)[];
  points: number;
  buchholz?: number;
  performance?: number;
}

export interface ParsedFFEData {
  players: FFEPlayerRow[];
  currentRound: number;
  totalRounds: number;
}

// Club Identity (namespace isolation)
export interface ClubIdentity {
  clubName: string;    // "Hay Chess"
  clubSlug: string;    // "hay-chess"
  createdAt: string;
}

// Club Stats
export interface ClubStats {
  round: number;
  totalPoints: number;
  playerCount: number;
  averagePoints: number;
}
