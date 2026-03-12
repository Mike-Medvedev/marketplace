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

function toScrapeParams(search: StoredSearch): SearchMarketPlaceParams {
  const params: SearchMarketPlaceParams = {
    query: search.query,
    location: search.location,
    pageCount: search.listingsPerCheck,
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
 * Calls searchMarketPlace (the same scrape logic used everywhere),
 * stores every listing it returns in Redis + DB, publishes SSE events.
 */
export async function runSearch(search: StoredSearch): Promise<SearchRunResults> {
  publishSearchEvent(search.id, { type: "executing", searchId: search.id })
    .catch((e) => logger.error(`[runSearch] Failed to publish executing event:`, e));

  const params = toScrapeParams(search);
  logger.info(`[runSearch] Executing "${search.query}" (${search.id}) — pageCount=${params.pageCount}`);

  const { listings } = await searchMarketPlace(params, search.userId);

  const runId = randomUUID();
  const redisKey = resultsKey(search.id, runId);
  await write(redisKey, JSON.stringify(listings), RESULTS_TTL_SECONDS);

  await repository.createRun(runId, search.id, redisKey, listings.length);
  await repository.updateLastRun(search.id, new Date());

  logger.info(`[runSearch] "${search.query}" completed — ${listings.length} listings stored`);

  publishSearchEvent(search.id, {
    type: "completed",
    searchId: search.id,
    runId,
    listingCount: listings.length,
  }).catch((e) => logger.error(`[runSearch] Failed to publish completed event:`, e));

  return { runId, executedAt: new Date(), listings };
}
