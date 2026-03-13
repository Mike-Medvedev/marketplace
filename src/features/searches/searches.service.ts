import * as repository from "./searches.repository.ts";
import { read } from "@/infra/redis/redis.client.ts";
import {
  scheduleSearch,
  cancelSearch,
  rescheduleSearch,
  cancelAll,
  isScheduled,
  getNextRunAt,
} from "@/features/scheduler/scheduler.service.ts";
import { runSearch } from "./searches.executor.ts";
import { SearchNotFoundError, DuplicateSearchError } from "@/shared/errors/errors.ts";
import type { ActiveSearch, StoredSearch, CreateSearchBody, UpdateSearchBody, SearchRun, SearchRunResults } from "./searches.types.ts";

function enrichWithScheduleState(search: StoredSearch): ActiveSearch {
  return {
    ...search,
    isScheduled: isScheduled(search.id),
    nextRunAt: getNextRunAt(search.id, search.frequency),
  };
}

export async function getAllSearches(userId: string): Promise<ActiveSearch[]> {
  const searches = await repository.getAllSearches(userId);
  return searches.map(enrichWithScheduleState);
}

export async function getSearchById(id: string, userId: string): Promise<ActiveSearch | null> {
  const search = await repository.getSearchById(id, userId);
  return search ? enrichWithScheduleState(search) : null;
}

export async function createSearch(userId: string, body: CreateSearchBody): Promise<ActiveSearch> {
  const duplicate = await repository.findDuplicate(userId, {
    query: body.query,
    location: body.location,
    minPrice: body.minPrice ?? 0,
    maxPrice: body.maxPrice ?? null,
    dateListed: body.dateListed,
    prompt: body.prompt ?? null,
  });
  if (duplicate) throw new DuplicateSearchError(body.query, body.location);

  const search = await repository.createSearch(userId, body);
  scheduleSearch(search);
  return enrichWithScheduleState(search);
}

export async function updateSearch(id: string, userId: string, body: UpdateSearchBody): Promise<ActiveSearch | null> {
  const existing = await repository.getSearchById(id, userId);
  if (!existing) return null;

  const merged = {
    query: body.query ?? existing.query,
    location: body.location ?? existing.location,
    minPrice: body.minPrice ?? existing.minPrice,
    maxPrice: body.maxPrice !== undefined ? body.maxPrice : existing.maxPrice,
    dateListed: body.dateListed ?? existing.dateListed,
    prompt: body.prompt !== undefined ? body.prompt : existing.prompt,
  };

  const duplicate = await repository.findDuplicate(userId, merged, id);
  if (duplicate) throw new DuplicateSearchError(merged.query, merged.location);

  const search = await repository.updateSearch(id, userId, body);
  if (search) {
    rescheduleSearch(search);
    return enrichWithScheduleState(search);
  }
  return null;
}

export async function deleteSearch(id: string, userId: string): Promise<boolean> {
  const deleted = await repository.deleteSearch(id, userId);
  if (deleted) {
    cancelSearch(id);
  }
  return deleted;
}

export async function pauseAllSearches(): Promise<number> {
  cancelAll();
  return repository.pauseAllSearches();
}

export async function resumeAllSearches(): Promise<number> {
  return repository.resumeAllSearches();
}

export async function getSearchRuns(searchId: string, userId: string): Promise<SearchRun[]> {
  const search = await repository.getSearchById(searchId, userId);
  if (!search) throw new SearchNotFoundError(searchId);
  return repository.getRunsBySearchId(searchId);
}

export async function getSearchRunResults(
  searchId: string,
  runId: string,
  userId: string,
): Promise<SearchRunResults | null> {
  const search = await repository.getSearchById(searchId, userId);
  if (!search) throw new SearchNotFoundError(searchId);

  const run = await repository.getRunById(runId, searchId);
  if (!run) return null;

  const raw = await read(run.redisResultKey);
  const listings = raw ? JSON.parse(raw) : [];

  return {
    runId: run.id,
    executedAt: run.executedAt,
    listings,
  };
}

export async function executeSearch(searchId: string, userId: string): Promise<SearchRunResults> {
  const search = await repository.getSearchById(searchId, userId);
  if (!search) throw new SearchNotFoundError(searchId);
  return runSearch(search);
}
