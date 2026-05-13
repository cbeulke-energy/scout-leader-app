/**
 * Puller: fetches server-side changes incremental via ?since= cursors.
 * Members and activities are server-authoritative — the puller overwrites
 * local state without conflict checks (server wins).
 */

import { SQLiteDatabase } from "expo-sqlite";
import { upsertMembers } from "@/db/dao/members";
import { upsertActivities } from "@/db/dao/activities";
import { fetchMembers, fetchActivities } from "@/api/sync";

async function getCursor(
  db: SQLiteDatabase,
  entityType: string
): Promise<string | null> {
  const row = await db.getFirstAsync<{ cursor: string }>(
    `SELECT cursor FROM sync_cursors WHERE entity_type=?`,
    [entityType]
  );
  return row?.cursor ?? null;
}

async function setCursor(
  db: SQLiteDatabase,
  entityType: string,
  cursor: string
) {
  await db.runAsync(
    `INSERT INTO sync_cursors (entity_type, cursor) VALUES (?, ?)
     ON CONFLICT(entity_type) DO UPDATE SET cursor=excluded.cursor`,
    [entityType, cursor]
  );
}

export async function pullMembers(db: SQLiteDatabase) {
  const since = await getCursor(db, "members");
  const { members, cursor } = await fetchMembers(since);
  if (members.length > 0) {
    await upsertMembers(db, members);
  }
  if (cursor) {
    await setCursor(db, "members", cursor);
  }
  return members.length;
}

export async function pullActivities(db: SQLiteDatabase) {
  const since = await getCursor(db, "activities");
  const { activities, cursor } = await fetchActivities(since);
  if (activities.length > 0) {
    await upsertActivities(db, activities);
  }
  if (cursor) {
    await setCursor(db, "activities", cursor);
  }
  return activities.length;
}
