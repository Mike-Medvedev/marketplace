import { db } from "@/infra/db/db.ts";
import { facebookSessions } from "@/infra/db/schema.ts";
import { eq } from "drizzle-orm";
import logger from "@/infra/logger/logger.ts";
import type { FacebookSession } from "./facebook.types.ts";

export async function getSession(userId: string): Promise<FacebookSession | null> {
  try {
    const [session] = await db
      .select()
      .from(facebookSessions)
      .where(eq(facebookSessions.userId, userId))
      .limit(1);
    return session ?? null;
  } catch (err) {
    logger.warn("[session-store] Failed to read session from DB:", err);
    return null;
  }
}

/** Returns true if the user has ever synced (has a row in facebook_sessions), regardless of whether the session is still valid. */
export async function hasSessionRow(userId: string): Promise<boolean> {
  try {
    const [row] = await db
      .select({ id: facebookSessions.userId })
      .from(facebookSessions)
      .where(eq(facebookSessions.userId, userId))
      .limit(1);
    return row != null;
  } catch (err) {
    logger.warn("[session-store] Failed to check session row:", err);
    return false;
  }
}

export async function setSession(
  userId: string,
  data: { headers: Record<string, string>; body: string; capturedAt: string },
): Promise<void> {
  await db
    .insert(facebookSessions)
    .values({
      userId,
      headers: data.headers,
      body: data.body,
      capturedAt: new Date(data.capturedAt),
    })
    .onConflictDoUpdate({
      target: facebookSessions.userId,
      set: {
        headers: data.headers,
        body: data.body,
        capturedAt: new Date(data.capturedAt),
        updatedAt: new Date(),
      },
    });
}
