import { SQLiteDatabase } from "expo-sqlite";

export interface MemberRow {
  id: string;
  troop_id: string;
  team_id: string | null;
  name: string;
  dob: string;
  role: "scout" | "leader";
  emergency_contact: string;
  server_updated_at: string;
}

export async function upsertMembers(
  db: SQLiteDatabase,
  members: Array<{
    id: string;
    troopId: string;
    teamId: string | null;
    name: string;
    dob: string;
    role: string;
    emergencyContact: string;
    updatedAt: string;
  }>
) {
  for (const m of members) {
    await db.runAsync(
      `INSERT INTO members (id, troop_id, team_id, name, dob, role, emergency_contact, server_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         team_id=excluded.team_id,
         name=excluded.name,
         dob=excluded.dob,
         role=excluded.role,
         emergency_contact=excluded.emergency_contact,
         server_updated_at=excluded.server_updated_at`,
      [m.id, m.troopId, m.teamId ?? null, m.name, m.dob, m.role, m.emergencyContact, m.updatedAt]
    );
  }
}

export async function getAllMembers(db: SQLiteDatabase): Promise<MemberRow[]> {
  return db.getAllAsync<MemberRow>(
    `SELECT * FROM members ORDER BY name`
  );
}

export async function getMemberById(
  db: SQLiteDatabase,
  id: string
): Promise<MemberRow | null> {
  return db.getFirstAsync<MemberRow>(
    `SELECT * FROM members WHERE id=?`,
    [id]
  );
}
