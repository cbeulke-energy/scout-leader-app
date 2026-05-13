const BASE_MS = 1_000;
const CAP_MS = 300_000; // 5 minutes

/**
 * Returns the next retry delay in milliseconds using exponential backoff
 * with full jitter to avoid thundering herd.
 */
export function nextRetryDelay(retryCount: number): number {
  const ceiling = Math.min(CAP_MS, BASE_MS * Math.pow(2, retryCount));
  return Math.floor(Math.random() * ceiling);
}

export function nextAttemptDate(retryCount: number): Date {
  return new Date(Date.now() + nextRetryDelay(retryCount));
}
