import { SQLiteDatabase } from "expo-sqlite";

export type OutboxStatus = "pending" | "syncing" | "done" | "error";

export interface OutboxRow {
  id: string;
  entity_type: string;
  idempotency_key: string;
  payload: string;
  status: OutboxStatus;
  retry_count: number;
  last_error: string | null;
  created_at: string;
  next_attempt_at: string;
}

export async function enqueueMutation(
  db: SQLiteDatabase,
  opts: {
    id: string;
    entityType: string;
    idempotencyKey: string;
    payload: unknown;
  }
) {
  await db.runAsync(
    `INSERT INTO outbox (id, entity_type, idempotency_key, payload, status, retry_count, created_at, next_attempt_at)
     VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)`,
    [
      opts.id,
      opts.entityType,
      opts.idempotencyKey,
      JSON.stringify(opts.payload),
      new Date().toISOString(),
      new Date().toISOString(),
    ]
  );
}

export async function getPendingItems(
  db: SQLiteDatabase,
  limit = 50
): Promise<OutboxRow[]> {
  return db.getAllAsync<OutboxRow>(
    `SELECT * FROM outbox
     WHERE status IN ('pending','error')
       AND next_attempt_at <= ?
     ORDER BY created_at ASC
     LIMIT ?`,
    [new Date().toISOString(), limit]
  );
}

export async function markSyncing(db: SQLiteDatabase, id: string) {
  await db.runAsync(`UPDATE outbox SET status='syncing' WHERE id=?`, [id]);
}

export async function markDone(db: SQLiteDatabase, id: string) {
  await db.runAsync(`UPDATE outbox SET status='done' WHERE id=?`, [id]);
}

export async function markError(
  db: SQLiteDatabase,
  id: string,
  error: string,
  nextAttemptAt: Date
) {
  await db.runAsync(
    `UPDATE outbox
     SET status='error', last_error=?, retry_count=retry_count+1, next_attempt_at=?
     WHERE id=?`,
    [error, nextAttemptAt.toISOString(), id]
  );
}

export async function countPending(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM outbox WHERE status IN ('pending','syncing','error')`
  );
  return row?.n ?? 0;
}

export async function deleteCompleted(db: SQLiteDatabase) {
  await db.runAsync(`DELETE FROM outbox WHERE status='done'`);
}
