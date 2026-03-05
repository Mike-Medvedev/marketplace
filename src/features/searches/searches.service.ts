import * as repository from "./searches.repository.ts";
import {
  scheduleSearch,
  cancelSearch,
  rescheduleSearch,
  cancelAll,
} from "@/features/scheduler/scheduler.service.ts";
import type { ActiveSearch, CreateSearchBody, UpdateSearchBody } from "./searches.types.ts";

export async function getAllSearches(): Promise<ActiveSearch[]> {
  return repository.getAllSearches();
}

export async function getSearchById(id: string): Promise<ActiveSearch | null> {
  return repository.getSearchById(id);
}

export async function createSearch(body: CreateSearchBody): Promise<ActiveSearch> {
  const search = await repository.createSearch(body);
  scheduleSearch(search);
  return search;
}

export async function updateSearch(id: string, body: UpdateSearchBody): Promise<ActiveSearch | null> {
  const search = await repository.updateSearch(id, body);
  if (search) {
    rescheduleSearch(search);
  }
  return search;
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
  const count = await repository.resumeAllSearches();
  const searches = await repository.getAllSearches();
  for (const search of searches) {
    if (search.status === "running") {
      scheduleSearch(search);
    }
  }
  return count;
}
