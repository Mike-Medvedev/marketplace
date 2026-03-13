import { randomUUID } from "node:crypto";
import { searchMarketPlace } from "@/features/scrape/scrape.service.ts";
import { filterListings } from "@/features/filter/filter.service.ts";
import { write } from "@/infra/redis/redis.client.ts";
import { publishSearchEvent } from "@/infra/redis/redis.pubsub.ts";
import { RESULTS_TTL_SECONDS } from "@/features/scheduler/scheduler.constants.ts";
import * as repository from "./searches.repository.ts";
import logger from "@/infra/logger/logger.ts";
import type { StoredSearch, SearchRunResults } from "./searches.types.ts";
import type { SearchMarketPlaceParams } from "@/features/scrape/scrape.types.ts";

function toScrapeParams(search: StoredSearch): SearchMarketPlaceParams {
  const params: SearchMarketPlaceParams = {
    query: search.query,
    location: search.location,
    pageCount: search.listingsPerCheck,
  };
  if (search.minPrice != null) params.minPrice = search.minPrice;
  if (search.maxPrice != null) params.maxPrice = search.maxPrice;
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
  publishSearchEvent(search.id, { type: "executing", searchId: search.id }).catch((e) =>
    logger.error(`[runSearch] Failed to publish executing event:`, e),
  );

  try {
    const params = toScrapeParams(search);
    logger.info(
      `[runSearch] Executing "${search.query}" (${search.id}) — pageCount=${params.pageCount}`,
    );

    const { listings } = await searchMarketPlace(params, search.userId);

    const finalListings = search.prompt
      ? await filterListings(listings, search.prompt)
      : listings;

    const runId = randomUUID();
    const redisKey = resultsKey(search.id, runId);
    await write(redisKey, JSON.stringify(finalListings), RESULTS_TTL_SECONDS);

    await repository.createRun(runId, search.id, redisKey, finalListings.length);
    await repository.updateLastRun(search.id, new Date());

    logger.info(`[runSearch] "${search.query}" completed — ${finalListings.length} listings stored (${listings.length} scraped)`);

    publishSearchEvent(search.id, {
      type: "completed",
      searchId: search.id,
      runId,
      listingCount: finalListings.length,
    }).catch((e) => logger.error(`[runSearch] Failed to publish completed event:`, e));

    return { runId, executedAt: new Date(), listings: finalListings };
  } catch (error) {
    publishSearchEvent(search.id, {
      type: "failed",
      searchId: search.id,
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "UnknownError",
    }).catch((e) => logger.error(`[runSearch] Failed to publish failed event:`, e));

    throw error;
  }
}
