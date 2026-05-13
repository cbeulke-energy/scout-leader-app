/**
 * Sync engine: coordinates push + pull on reconnect.
 *
 * Conflict resolution documented here:
 *  - Attendance:  local-write, outbox-queued, server-upsert via idempotency key.
 *                 Status = last local write at push time (last-write-wins per record).
 *  - Members:     server-authoritative. Local rows overwritten on every pull.
 *  - Activities:  server-authoritative. Local rows overwritten on every pull.
 *
 * Retry: exponential backoff, base 1 s, cap 5 min, full jitter.
 */

import { SQLiteDatabase } from "expo-sqlite";
import { drainOutbox } from "./pusher";
import { pullMembers, pullActivities } from "./puller";
import { countPending, deleteCompleted } from "@/db/dao/outbox";

export type SyncStatus = "idle" | "syncing" | "pending" | "error";

type StatusListener = (status: SyncStatus) => void;

class SyncEngine {
  private db: SQLiteDatabase | null = null;
  private running = false;
  private status: SyncStatus = "idle";
  private listeners = new Set<StatusListener>();
  private lastError: string | null = null;

  init(db: SQLiteDatabase) {
    this.db = db;
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  private emit(status: SyncStatus) {
    this.status = status;
    for (const l of this.listeners) l(status);
  }

  async syncNow(): Promise<void> {
    if (!this.db || this.running) return;
    this.running = true;
    this.emit("syncing");

    try {
      // Push outbox first so server has the latest local mutations before we pull
      const { pushed, failed } = await drainOutbox(this.db);

      // Pull incremental server changes
      await Promise.all([pullMembers(this.db), pullActivities(this.db)]);

      // Housekeeping: remove done outbox entries
      await deleteCompleted(this.db);

      const remaining = await countPending(this.db);
      this.lastError = null;
      this.emit(remaining > 0 || failed > 0 ? "pending" : "idle");
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      this.emit("error");
    } finally {
      this.running = false;
    }
  }

  async refreshStatus(): Promise<void> {
    if (!this.db || this.running) return;
    const n = await countPending(this.db);
    this.emit(n > 0 ? "pending" : "idle");
  }
}

export const syncEngine = new SyncEngine();
