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
