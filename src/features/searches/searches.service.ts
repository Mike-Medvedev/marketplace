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
import { runSearch, isSearchExecuting } from "./searches.executor.ts";
import { SearchNotFoundError, DuplicateSearchError } from "@/shared/errors/errors.ts";
import { COUNTRY_COVERAGE } from "./searches.constants.ts";
import type { ActiveSearch, StoredSearch, CreateSearchBody, UpdateSearchBody, SearchRun, SearchRunResults } from "./searches.types.ts";

async function enrichWithScheduleState(search: StoredSearch): Promise<ActiveSearch> {
  return {
    ...search,
    isScheduled: isScheduled(search.id),
    nextRunAt: getNextRunAt(search.id, search.frequency),
    isExecuting: await isSearchExecuting(search.id),
  };
}

export async function getAllSearches(userId: string): Promise<ActiveSearch[]> {
  const searches = await repository.getAllSearches(userId);
  return Promise.all(searches.map(enrichWithScheduleState));
}

export async function getSearchById(id: string, userId: string): Promise<ActiveSearch | null> {
  const search = await repository.getSearchById(id, userId);
  return search ? await enrichWithScheduleState(search) : null;
}

export async function createSearch(userId: string, body: CreateSearchBody): Promise<ActiveSearch> {
  const location = body.location || COUNTRY_COVERAGE[body.country!]!.label;

  const duplicate = await repository.findDuplicate(userId, {
    query: body.query,
    location,
    country: body.country ?? null,
    minPrice: body.minPrice ?? 0,
    maxPrice: body.maxPrice ?? null,
    dateListed: body.dateListed,
    prompt: body.prompt ?? null,
    webhookFilterUrl: body.webhookFilterUrl ?? null,
  });
  if (duplicate) throw new DuplicateSearchError(body.query, location);

  const normalized = { ...body, location };
  const search = await repository.createSearch(userId, normalized);
  if (search.notificationOptIn) {
    scheduleSearch(search);
  }
  return await enrichWithScheduleState(search);
}

export async function updateSearch(id: string, userId: string, body: UpdateSearchBody): Promise<ActiveSearch | null> {
  const existing = await repository.getSearchById(id, userId);
  if (!existing) return null;

  const country = body.country !== undefined ? body.country : existing.country;
  const location = body.location ?? (country ? COUNTRY_COVERAGE[country]!.label : existing.location);

  const merged = {
    query: body.query ?? existing.query,
    location,
    country: country ?? null,
    minPrice: body.minPrice ?? existing.minPrice,
    maxPrice: body.maxPrice !== undefined ? body.maxPrice : existing.maxPrice,
    dateListed: body.dateListed ?? existing.dateListed,
    prompt: body.prompt !== undefined ? body.prompt : existing.prompt,
    webhookFilterUrl: body.webhookFilterUrl !== undefined ? body.webhookFilterUrl : existing.webhookFilterUrl,
  };

  const duplicate = await repository.findDuplicate(userId, merged, id);
  if (duplicate) throw new DuplicateSearchError(merged.query, merged.location);

  const normalized = { ...body, location, country };
  const search = await repository.updateSearch(id, userId, normalized);
  if (search) {
    rescheduleSearch(search);
    return await enrichWithScheduleState(search);
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

export async function pauseAllSearches(userId?: string): Promise<number> {
  cancelAll();
  return repository.pauseAllSearches(userId);
}

export async function resumeAllSearches(userId?: string): Promise<number> {
  return repository.resumeAllSearches(userId);
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

  let filteredListings = null;
  if (run.filterStatus === "completed" && run.filteredRedisResultKey) {
    const filteredRaw = await read(run.filteredRedisResultKey);
    filteredListings = filteredRaw ? JSON.parse(filteredRaw) : [];
  }

  return {
    runId: run.id,
    executedAt: run.executedAt,
    filterStatus: run.filterStatus,
    listings,
    filteredListings,
  };
}

export async function executeSearch(searchId: string, userId: string): Promise<SearchRunResults> {
  const search = await repository.getSearchById(searchId, userId);
  if (!search) throw new SearchNotFoundError(searchId);
  return runSearch(search);
}
