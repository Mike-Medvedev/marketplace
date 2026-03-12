import { db } from "@/infra/db/db.ts";
import { searches, searchRuns } from "@/infra/db/schema.ts";
import { eq, and, desc } from "drizzle-orm";
import type { StoredSearch, CreateSearchBody, UpdateSearchBody } from "./searches.types.ts";

export async function getAllSearches(userId: string): Promise<StoredSearch[]> {
  return db.select().from(searches).where(eq(searches.userId, userId));
}

export async function getSearchById(id: string, userId?: string): Promise<StoredSearch | null> {
  const conditions = userId
    ? and(eq(searches.id, id), eq(searches.userId, userId))
    : eq(searches.id, id);

  const [search] = await db.select().from(searches).where(conditions).limit(1);
  return search ?? null;
}

export async function createSearch(userId: string, body: CreateSearchBody): Promise<StoredSearch> {
  const [search] = await db
    .insert(searches)
    .values({ ...body, userId })
    .returning();
  return search!;
}

export async function updateSearch(
  id: string,
  userId: string,
  body: UpdateSearchBody,
): Promise<StoredSearch | null> {
  const [updated] = await db
    .update(searches)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(searches.id, id), eq(searches.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteSearch(id: string, userId: string): Promise<boolean> {
  const [deleted] = await db
    .delete(searches)
    .where(and(eq(searches.id, id), eq(searches.userId, userId)))
    .returning({ id: searches.id });
  return !!deleted;
}

export async function updateLastRun(id: string, timestamp: Date): Promise<void> {
  await db
    .update(searches)
    .set({ lastRun: timestamp, updatedAt: new Date() })
    .where(eq(searches.id, id));
}

export async function pauseAllSearches(userId?: string): Promise<number> {
  const conditions = userId
    ? and(eq(searches.status, "running"), eq(searches.userId, userId))
    : eq(searches.status, "running");

  const updated = await db
    .update(searches)
    .set({ status: "needs_attention", updatedAt: new Date() })
    .where(conditions)
    .returning({ id: searches.id });

  return updated.length;
}

export async function resumeAllSearches(userId?: string): Promise<number> {
  const conditions = userId
    ? and(eq(searches.status, "needs_attention"), eq(searches.userId, userId))
    : eq(searches.status, "needs_attention");

  const updated = await db
    .update(searches)
    .set({ status: "running", updatedAt: new Date() })
    .where(conditions)
    .returning({ id: searches.id });

  return updated.length;
}

export async function getRunsBySearchId(searchId: string) {
  return db
    .select({
      id: searchRuns.id,
      searchId: searchRuns.searchId,
      listingCount: searchRuns.listingCount,
      executedAt: searchRuns.executedAt,
    })
    .from(searchRuns)
    .where(eq(searchRuns.searchId, searchId))
    .orderBy(desc(searchRuns.executedAt));
}

export async function getRunById(runId: string, searchId: string) {
  const [run] = await db
    .select()
    .from(searchRuns)
    .where(and(eq(searchRuns.id, runId), eq(searchRuns.searchId, searchId)))
    .limit(1);
  return run ?? null;
}

export async function createRun(
  runId: string,
  searchId: string,
  redisResultKey: string,
  listingCount: number,
) {
  const [run] = await db
    .insert(searchRuns)
    .values({ id: runId, searchId, redisResultKey, listingCount })
    .returning();
  return run!;
}
