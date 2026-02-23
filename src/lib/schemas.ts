import { z } from 'zod';
import { SLUG_REGEX } from './validation';

export const clubSlugSchema = z.string().regex(SLUG_REGEX);

export const resultSchema = z.object({
  round: z.number().int(),
  score: z.union([z.literal(0), z.literal(0.5), z.literal(1)]),
  opponent: z.string().optional(),
});

export const playerSchema = z.object({
  name: z.string().min(1),
  elo: z.number().int().nonnegative(),
  club: z.string(),
  results: z.array(resultSchema),
  currentPoints: z.number().nonnegative(),
  tiebreak: z.number().optional(),
  buchholz: z.number().optional(),
  performance: z.number().optional(),
  ranking: z.number().int().positive(),
  validated: z.array(z.boolean()),
});

export const pairingSchema = z.object({
  board: z.number().int().positive(),
  whitePlayer: z.string().min(1),
  blackPlayer: z.string().min(1),
  whiteElo: z.number().int().nonnegative(),
  blackElo: z.number().int().nonnegative(),
  result: z.string(),
  whitePoints: z.number().nonnegative(),
  blackPoints: z.number().nonnegative(),
  isExempt: z.boolean(),
});

export const tournamentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  lastUpdate: z.string(),
  players: z.array(playerSchema),
  pairings: z.array(pairingSchema).optional(),
  pairingsRound: z.number().int().positive().optional(),
});

export const eventSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(3),
  clubName: z.string().optional(),
  availableClubs: z.array(z.object({ name: z.string(), playerCount: z.number() })).optional(),
  createdAt: z.string(),
  tournaments: z.array(tournamentSchema),
});

export const syncBodySchema = z.object({
  clubSlug: clubSlugSchema,
  events: z.array(eventSchema),
  validations: z.record(z.string(), z.record(z.string(), z.record(z.string(), z.boolean()))),
  currentEventId: z.string().optional(),
});
