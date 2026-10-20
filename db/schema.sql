-- Postgres schema (Neon) for club sync storage.
-- Applied once in the Neon SQL editor (Vercel dashboard > Storage > nos-joueurs-en-tournoi-db > Query).
-- Idempotent: safe to run again.
--
-- Mirrors the former Redis layout, one club per slug:
--   nos-joueurs:{slug}:events       (hash eventId -> JSON)  -> club_events
--   nos-joueurs:{slug}:validations  (JSON)                  -> club_state.validations
--   nos-joueurs:{slug}:settings     ({ currentEventId })    -> club_state.current_event_id

CREATE TABLE IF NOT EXISTS club_events (
  club_slug  text        NOT NULL,
  event_id   text        NOT NULL,
  data       jsonb       NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_slug, event_id)
);

CREATE TABLE IF NOT EXISTS club_state (
  club_slug        text        PRIMARY KEY,
  validations      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  current_event_id text        NOT NULL DEFAULT '',
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- 2026-10-20 — auto-sync light (docs/superpowers/specs/2026-10-20-auto-sync-light-design.md)
-- Tombstones: a deleted event keeps its row with deleted_at set; upserts never revive it.
ALTER TABLE club_events ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- One row per validation tick, so two phones ticking different players never overwrite each other.
CREATE TABLE IF NOT EXISTS club_validations (
  club_slug     text        NOT NULL,
  tournament_id text        NOT NULL,
  player_name   text        NOT NULL,
  round         int         NOT NULL,
  value         boolean     NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_slug, tournament_id, player_name, round)
);

-- club_state (validations, current_event_id) is no longer read nor written since 2026-10-20:
-- validations moved to club_validations, the current event is local to each phone. Kept, unused.
