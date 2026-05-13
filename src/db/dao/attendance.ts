import { SQLiteDatabase } from "expo-sqlite";

export interface AttendanceRow {
  id: string;
  activity_id: string;
  member_id: string;
  status: "present" | "absent" | "excused";
  recorded_at: string;
  server_synced: number;
}

export async function upsertAttendance(
  db: SQLiteDatabase,
  row: Omit<AttendanceRow, "server_synced">
) {
  await db.runAsync(
    `INSERT INTO attendance (id, activity_id, member_id, status, recorded_at, server_synced)
     VALUES (?, ?, ?, ?, ?, 0)
     ON CONFLICT(activity_id, member_id) DO UPDATE SET
       status=excluded.status,
       recorded_at=excluded.recorded_at,
       server_synced=0`,
    [row.id, row.activity_id, row.member_id, row.status, row.recorded_at]
  );
}

export async function markServerSynced(
  db: SQLiteDatabase,
  activityId: string,
  memberId: string
) {
  await db.runAsync(
    `UPDATE attendance SET server_synced=1
     WHERE activity_id=? AND member_id=?`,
    [activityId, memberId]
  );
}

export async function getAttendanceForActivity(
  db: SQLiteDatabase,
  activityId: string
): Promise<AttendanceRow[]> {
  return db.getAllAsync<AttendanceRow>(
    `SELECT * FROM attendance WHERE activity_id=? ORDER BY member_id`,
    [activityId]
  );
}

export async function applyServerAttendance(
  db: SQLiteDatabase,
  records: Array<{ activityId: string; memberId: string; status: string; id: string; updatedAt: string }>
) {
  for (const r of records) {
    await db.runAsync(
      `INSERT INTO attendance (id, activity_id, member_id, status, recorded_at, server_synced)
       VALUES (?, ?, ?, ?, ?, 1)
       ON CONFLICT(activity_id, member_id) DO UPDATE SET
         status=excluded.status,
         recorded_at=excluded.recorded_at,
         server_synced=1`,
      [r.id, r.activityId, r.memberId, r.status, r.updatedAt]
    );
  }
}
