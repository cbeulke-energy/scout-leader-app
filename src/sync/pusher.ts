/**
 * Pusher: drains the outbox by sending queued mutations to the server.
 * Called by the sync engine on reconnect.
 *
 * Conflict strategy: attendance is idempotent upsert — whichever status was
 * recorded last locally will be the status pushed. The server applies it via
 * ON CONFLICT DO UPDATE. Members and activities are server-authoritative:
 * they are never written locally, so there is no push path for them.
 */

import { SQLiteDatabase } from "expo-sqlite";
import {
  getPendingItems,
  markSyncing,
  markDone,
  markError,
  OutboxRow,
} from "@/db/dao/outbox";
import { markServerSynced } from "@/db/dao/attendance";
import { pushAttendanceBatch } from "@/api/sync";
import { nextAttemptDate } from "./backoff";

const BATCH_SIZE = 50;

export async function drainOutbox(db: SQLiteDatabase): Promise<{
  pushed: number;
  failed: number;
}> {
  let pushed = 0;
  let failed = 0;

  const items = await getPendingItems(db, BATCH_SIZE);
  if (items.length === 0) return { pushed, failed };

  // Group by entity_type to batch API calls
  const byType = new Map<string, OutboxRow[]>();
  for (const item of items) {
    const list = byType.get(item.entity_type) ?? [];
    list.push(item);
    byType.set(item.entity_type, list);
  }

  for (const [type, rows] of byType) {
    if (type === "attendance") {
      await pushAttendanceBatch(db, rows, {
        onSuccess: async (row) => {
          await markDone(db, row.id);
          const payload = JSON.parse(row.payload);
          await markServerSynced(db, payload.activityId, payload.memberId);
          pushed++;
        },
        onError: async (row, error) => {
          await markError(db, row.id, error, nextAttemptDate(row.retry_count));
          failed++;
        },
      });
    }
    // Additional entity types would be handled here
  }

  return { pushed, failed };
}
