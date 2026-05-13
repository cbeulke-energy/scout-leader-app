import { useEffect, useState } from "react";
import { syncEngine, SyncStatus } from "@/sync/engine";

export function useSyncStatus(): { status: SyncStatus; lastError: string | null } {
  const [status, setStatus] = useState<SyncStatus>(syncEngine.getStatus());
  const [lastError, setLastError] = useState<string | null>(
    syncEngine.getLastError()
  );

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((s) => {
      setStatus(s);
      setLastError(syncEngine.getLastError());
    });
    return unsubscribe;
  }, []);

  return { status, lastError };
}
