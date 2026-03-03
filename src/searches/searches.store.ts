import { redis } from "@/redis.ts";
import { randomUUID } from "node:crypto";
import type { ActiveSearch, CreateSearchBody, UpdateSearchBody } from "./searches.schema.ts";

const KEY_PREFIX = "search:";
const INDEX_KEY = "searches:index";

function searchKey(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

export async function getAllSearches(): Promise<ActiveSearch[]> {
  const ids = await redis.smembers(INDEX_KEY);
  if (ids.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const id of ids) pipeline.get(searchKey(id));
  const results = await pipeline.exec();
  if (!results) return [];

  const searches: ActiveSearch[] = [];
  for (const [err, val] of results) {
    if (!err && typeof val === "string") {
      searches.push(JSON.parse(val));
    }
  }
  return searches;
}

export async function getSearchById(id: string): Promise<ActiveSearch | null> {
  const raw = await redis.get(searchKey(id));
  return raw ? JSON.parse(raw) : null;
}

export async function createSearch(body: CreateSearchBody): Promise<ActiveSearch> {
  const now = new Date().toISOString();
  const search: ActiveSearch = {
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
): Promise<ActiveSearch | null> {
  const existing = await getSearchById(id);
  if (!existing) return null;

  const updated: ActiveSearch = {
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
