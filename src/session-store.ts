import logger from "@/logger/logger";
import { read, write } from "@/redis.ts";

export interface FacebookSession {
  headers: Record<string, string>;
  body: string;
  capturedAt: string;
}

const SESSION_KEY = "facebook:session";

/**
 * Load the Facebook session from Redis. Returns null if none stored or Redis read fails.
 */
export async function getSession(): Promise<FacebookSession | null> {
  try {
    const raw = await read(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FacebookSession;
  } catch (err) {
    logger.warn("[session-store] Failed to read session from Redis:", err);
    return null;
  }
}

/**
 * Persist the Facebook session to Redis. Overwrites any existing session.
 */
export async function setSession(session: FacebookSession): Promise<void> {
  await write(SESSION_KEY, JSON.stringify(session));
}
