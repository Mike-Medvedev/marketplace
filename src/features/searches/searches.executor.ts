import { randomUUID } from "node:crypto";
import { searchMarketPlace } from "@/features/scrape/scrape.service.ts";
import { write } from "@/infra/redis/redis.client.ts";
import { publishSearchEvent } from "@/infra/redis/redis.pubsub.ts";
import { RESULTS_TTL_SECONDS } from "@/features/scheduler/scheduler.constants.ts";
import * as repository from "./searches.repository.ts";
import logger from "@/infra/logger/logger.ts";
import type { StoredSearch, SearchRunResults } from "./searches.types.ts";
import type { SearchMarketPlaceParams } from "@/features/scrape/scrape.types.ts";

const DATE_LISTED_TO_DAYS: Record<string, 1 | 7 | 30> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

function searchToScrapeParams(search: StoredSearch): SearchMarketPlaceParams {
  const params: SearchMarketPlaceParams = {
    query: search.query,
    location: search.location,
    pageCount: Math.ceil(search.listingsPerCheck / 24),
  };
  if (search.minPrice != null) params.minPrice = search.minPrice;
  if (search.maxPrice != null) params.maxPrice = search.maxPrice;
  const days = DATE_LISTED_TO_DAYS[search.dateListed];
  if (days) params.dateListedDays = days;
  return params;
}

function resultsKey(searchId: string, runId: string): string {
  return `search:${searchId}:results:${runId}`;
}

/**
 * Runs a search, stores results in Redis + DB, and publishes SSE events.
 * Shared by both the manual execute endpoint and the scheduler.
 */
export async function runSearch(search: StoredSearch): Promise<SearchRunResults> {
  await publishSearchEvent(search.id, { type: "executing", searchId: search.id });

  const params = searchToScrapeParams(search);
  logger.info(`[runSearch] Executing "${search.query}" (${search.id})`);

  const { listings } = await searchMarketPlace(params, search.userId);
  const capped = listings.slice(0, search.listingsPerCheck);

  const runId = randomUUID();
  const redisKey = resultsKey(search.id, runId);
  await write(redisKey, JSON.stringify(capped), RESULTS_TTL_SECONDS);

  await repository.createRun(runId, search.id, redisKey, capped.length);
  await repository.updateLastRun(search.id, new Date());

  logger.info(`[runSearch] "${search.query}" completed — ${capped.length} listings stored`);

  await publishSearchEvent(search.id, {
    type: "completed",
    searchId: search.id,
    runId,
    listingCount: capped.length,
  });

  return {
    runId,
    executedAt: new Date(),
    listings: capped,
  };
}
