/**
 * SQLite table definitions for the Scout Leader App.
 * All tables use WAL mode (set in db/index.ts).
 */

export const CREATE_TABLES_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ────────────────────────────────────────────────────────────
-- Server-authoritative tables (pulled from API, never mutated
-- locally except by the puller applying server data)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS members (
  id               TEXT PRIMARY KEY,
  troop_id         TEXT NOT NULL,
  team_id          TEXT,
  name             TEXT NOT NULL,
  dob              TEXT NOT NULL,
  role             TEXT NOT NULL CHECK(role IN ('scout','leader')),
  emergency_contact TEXT NOT NULL,
  server_updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
  id          TEXT PRIMARY KEY,
  troop_id    TEXT NOT NULL,
  type        TEXT NOT NULL CHECK(type IN ('meeting','camp','hajk')),
  title       TEXT NOT NULL,
  start_at    TEXT NOT NULL,
  end_at      TEXT NOT NULL,
  location    TEXT NOT NULL,
  description TEXT,
  server_updated_at TEXT NOT NULL
);

-- ────────────────────────────────────────────────────────────
-- Attendance: local-write, server-synced via outbox
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS attendance (
  id           TEXT PRIMARY KEY,
  activity_id  TEXT NOT NULL REFERENCES activities(id),
  member_id    TEXT NOT NULL REFERENCES members(id),
  status       TEXT NOT NULL CHECK(status IN ('present','absent','excused')),
  recorded_at  TEXT NOT NULL,
  server_synced INTEGER NOT NULL DEFAULT 0,
  UNIQUE(activity_id, member_id)
);

-- ────────────────────────────────────────────────────────────
-- Outbox: write-ahead queue for offline mutations
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS outbox (
  id              TEXT PRIMARY KEY,
  entity_type     TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','syncing','done','error')),
  retry_count     INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  created_at      TEXT NOT NULL,
  next_attempt_at TEXT NOT NULL
);

-- ────────────────────────────────────────────────────────────
-- Sync cursors: tracks ?since= position per entity type
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sync_cursors (
  entity_type TEXT PRIMARY KEY,
  cursor      TEXT NOT NULL
);

-- ────────────────────────────────────────────────────────────
-- Schema version tracking for forward migrations
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
`;

export const SCHEMA_VERSION = 1;
