import { redis } from "@/infra/redis/redis.client.ts";
import { randomUUID } from "node:crypto";
import { KEY_PREFIX, INDEX_KEY } from "./searches.constants.ts";
import type { StoredSearch, CreateSearchBody, UpdateSearchBody } from "./searches.types.ts";

function searchKey(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

export async function getAllSearches(): Promise<StoredSearch[]> {
  const ids = await redis.smembers(INDEX_KEY);
  if (ids.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const id of ids) pipeline.get(searchKey(id));
  const results = await pipeline.exec();
  if (!results) return [];

  const searches: StoredSearch[] = [];
  for (const [err, val] of results) {
    if (!err && typeof val === "string") {
      searches.push(JSON.parse(val));
    }
  }
  return searches;
}

export async function getSearchById(id: string): Promise<StoredSearch | null> {
  const raw = await redis.get(searchKey(id));
  return raw ? JSON.parse(raw) : null;
}

export async function createSearch(body: CreateSearchBody): Promise<StoredSearch> {
  const search: StoredSearch = {
    id: randomUUID(),
    criteria: body.criteria,
    settings: body.settings,
    status: "running",
    lastRun: null,
  };

  await redis
    .pipeline()
    .set(searchKey(search.id), JSON.stringify(search))
    .sadd(INDEX_KEY, search.id)
    .exec();

  return search;
}

export async function updateSearch(
  id: string,
  body: UpdateSearchBody,
): Promise<StoredSearch | null> {
  const existing = await getSearchById(id);
  if (!existing) return null;

  const updated: StoredSearch = {
    ...existing,
    criteria: body.criteria,
    settings: body.settings,
  };

  await redis.set(searchKey(id), JSON.stringify(updated));
  return updated;
}

export async function deleteSearch(id: string): Promise<boolean> {
  const existed = await redis.get(searchKey(id));
  if (!existed) return false;

  await redis
    .pipeline()
    .del(searchKey(id))
    .srem(INDEX_KEY, id)
    .exec();

  return true;
}

export async function updateLastRun(id: string, isoTimestamp: string): Promise<void> {
  const existing = await getSearchById(id);
  if (!existing) return;
  const updated: StoredSearch = { ...existing, lastRun: isoTimestamp };
  await redis.set(searchKey(id), JSON.stringify(updated));
}

export async function pauseAllSearches(): Promise<number> {
  const searches = await getAllSearches();
  const running = searches.filter((s) => s.status === "running");
  if (running.length === 0) return 0;

  const pipeline = redis.pipeline();
  for (const search of running) {
    const updated: StoredSearch = { ...search, status: "needs_attention" };
    pipeline.set(searchKey(search.id), JSON.stringify(updated));
  }
  await pipeline.exec();
  return running.length;
}

export async function resumeAllSearches(): Promise<number> {
  const searches = await getAllSearches();
  const paused = searches.filter((s) => s.status === "needs_attention");
  if (paused.length === 0) return 0;

  const pipeline = redis.pipeline();
  for (const search of paused) {
    const updated: StoredSearch = { ...search, status: "running" };
    pipeline.set(searchKey(search.id), JSON.stringify(updated));
  }
  await pipeline.exec();
  return paused.length;
}
