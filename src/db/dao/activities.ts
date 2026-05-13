import { SQLiteDatabase } from "expo-sqlite";

export interface ActivityRow {
  id: string;
  troop_id: string;
  type: "meeting" | "camp" | "hajk";
  title: string;
  start_at: string;
  end_at: string;
  location: string;
  description: string | null;
  server_updated_at: string;
}

export async function upsertActivities(
  db: SQLiteDatabase,
  activities: Array<{
    id: string;
    troopId: string;
    type: string;
    title: string;
    startAt: string;
    endAt: string;
    location: string;
    description: string | null;
    updatedAt: string;
  }>
) {
  for (const a of activities) {
    await db.runAsync(
      `INSERT INTO activities (id, troop_id, type, title, start_at, end_at, location, description, server_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         type=excluded.type,
         title=excluded.title,
         start_at=excluded.start_at,
         end_at=excluded.end_at,
         location=excluded.location,
         description=excluded.description,
         server_updated_at=excluded.server_updated_at`,
      [a.id, a.troopId, a.type, a.title, a.startAt, a.endAt, a.location, a.description ?? null, a.updatedAt]
    );
  }
}

export async function getAllActivities(db: SQLiteDatabase): Promise<ActivityRow[]> {
  return db.getAllAsync<ActivityRow>(
    `SELECT * FROM activities ORDER BY start_at DESC`
  );
}

export async function getActivityById(
  db: SQLiteDatabase,
  id: string
): Promise<ActivityRow | null> {
  return db.getFirstAsync<ActivityRow>(
    `SELECT * FROM activities WHERE id=?`,
    [id]
  );
}

export async function getUpcomingActivities(
  db: SQLiteDatabase,
  limit = 10
): Promise<ActivityRow[]> {
  return db.getAllAsync<ActivityRow>(
    `SELECT * FROM activities WHERE start_at >= ? ORDER BY start_at ASC LIMIT ?`,
    [new Date().toISOString(), limit]
  );
}
