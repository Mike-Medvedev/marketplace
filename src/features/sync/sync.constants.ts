export const SYNC_TIMEOUT_MS = 10 * 60 * 1000;
export const LOGIN_POLL_INTERVAL_MS = 3_000;
export const SESSION_CAPTURE_TIMEOUT_MS = 300_000;

export const VNC_LOCK_KEY = "sync:vnc_lock";

export function syncUserKey(userId: string): string {
  return `sync:active:${userId}`;
}
