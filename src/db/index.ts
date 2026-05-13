import * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from "./schema";

const DB_NAME = "scout_leader.db";

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync(CREATE_TABLES_SQL);
  await runMigrations(_db);
  return _db;
}

async function runMigrations(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ version: number }>(
    "SELECT MAX(version) as version FROM schema_migrations"
  );
  const current = row?.version ?? 0;

  for (let v = current + 1; v <= SCHEMA_VERSION; v++) {
    const migration = MIGRATIONS[v];
    if (migration) {
      await db.execAsync(migration);
    }
    await db.runAsync(
      "INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)",
      [v, new Date().toISOString()]
    );
  }
}

// Future migrations go here, keyed by version number
const MIGRATIONS: Record<number, string> = {
  // Version 1 is the initial schema applied via CREATE_TABLES_SQL
  // Version 2+ would go here, e.g.:
  // 2: "ALTER TABLE members ADD COLUMN photo_url TEXT;",
};
