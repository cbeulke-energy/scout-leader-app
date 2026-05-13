import { SQLiteDatabase } from "expo-sqlite";
import client from "./client";
import { OutboxRow } from "@/db/dao/outbox";

// ─── Members ───────────────────────────────────────────────

export async function fetchMembers(since: string | null) {
  const params: Record<string, string> = {};
  if (since) params.since = since;

  const { data } = await client.get<{
    members: Array<{
      id: string;
      troopId: string;
      teamId: string | null;
      name: string;
      dob: string;
      role: string;
      emergencyContact: string;
      updatedAt: string;
    }>;
    cursor: string | null;
  }>("/api/v1/sync/members", { params });

  return data;
}

// ─── Activities ─────────────────────────────────────────────

export async function fetchActivities(since: string | null) {
  const params: Record<string, string> = {};
  if (since) params.since = since;

  const { data } = await client.get<{
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
    }>;
    cursor: string | null;
  }>("/api/v1/sync/activities", { params });

  return data;
}

// ─── Attendance push ────────────────────────────────────────

interface BatchCallbacks {
  onSuccess: (row: OutboxRow) => Promise<void>;
  onError: (row: OutboxRow, error: string) => Promise<void>;
}

export async function pushAttendanceBatch(
  _db: SQLiteDatabase,
  rows: OutboxRow[],
  callbacks: BatchCallbacks
) {
  const records = rows.map((r) => ({
    idempotencyKey: r.idempotency_key,
    ...JSON.parse(r.payload),
  }));

  try {
    const { data } = await client.post<{
      results: Array<{
        idempotencyKey: string;
        result: "created" | "updated" | "error";
        error?: string;
      }>;
    }>("/api/v1/sync/attendance", { records });

    const resultMap = new Map(data.results.map((r) => [r.idempotencyKey, r]));

    for (const row of rows) {
      const result = resultMap.get(row.idempotency_key);
      if (result?.result === "error") {
        await callbacks.onError(row, result.error ?? "server error");
      } else {
        await callbacks.onSuccess(row);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "network error";
    for (const row of rows) {
      await callbacks.onError(row, message);
    }
  }
}

// ─── Auth ───────────────────────────────────────────────────

export async function mobileLogin(email: string, password: string) {
  const { data } = await client.post<{
    accessToken: string;
    refreshToken: string;
  }>("/api/v1/auth/login", { email, password });
  return data;
}
