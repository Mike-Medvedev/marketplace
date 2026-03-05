import * as repository from "./searches.repository.ts";
import {
  scheduleSearch,
  cancelSearch,
  rescheduleSearch,
  cancelAll,
  isScheduled,
  getNextRunAt,
} from "@/features/scheduler/scheduler.service.ts";
import type { ActiveSearch, StoredSearch, CreateSearchBody, UpdateSearchBody } from "./searches.types.ts";

function enrichWithScheduleState(search: StoredSearch): ActiveSearch {
  return {
    ...search,
    isScheduled: isScheduled(search.id),
    nextRunAt: getNextRunAt(search.id, search.settings.frequency),
  };
}

export async function getAllSearches(): Promise<ActiveSearch[]> {
  const searches = await repository.getAllSearches();
  return searches.map(enrichWithScheduleState);
}

export async function getSearchById(id: string): Promise<ActiveSearch | null> {
  const search = await repository.getSearchById(id);
  return search ? enrichWithScheduleState(search) : null;
}

export async function createSearch(body: CreateSearchBody): Promise<ActiveSearch> {
  const search = await repository.createSearch(body);
  scheduleSearch(search);
  return enrichWithScheduleState(search);
}

export async function updateSearch(id: string, body: UpdateSearchBody): Promise<ActiveSearch | null> {
  const search = await repository.updateSearch(id, body);
  if (search) {
    rescheduleSearch(search);
    return enrichWithScheduleState(search);
  }
  return null;
}

export async function deleteSearch(id: string): Promise<boolean> {
  const deleted = await repository.deleteSearch(id);
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
