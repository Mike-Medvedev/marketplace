import { randomUUID } from "node:crypto";
import { searchMarketPlace } from "@/features/scrape/scrape.service.ts";
import { filterListings } from "@/features/filter/filter.service.ts";
import { write } from "@/infra/redis/redis.client.ts";
import { publishSearchEvent } from "@/infra/redis/redis.pubsub.ts";
import { RESULTS_TTL_SECONDS } from "@/features/scheduler/scheduler.constants.ts";
import * as repository from "./searches.repository.ts";
import logger from "@/infra/logger/logger.ts";
import type { StoredSearch, SearchRunResults, FilterStatus } from "./searches.types.ts";
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
  return `search:${searchId}:results:${runId}:all`;
}

function filteredResultsKey(searchId: string, runId: string): string {
  return `search:${searchId}:results:${runId}:filtered`;
}

/**
 * Phase 2: runs AI filtering in the background after unfiltered results
 * have already been returned. Stores filtered results and publishes SSE.
 */
async function runFilterPhase(
  search: StoredSearch,
  runId: string,
  listings: SearchRunResults["listings"],
): Promise<void> {
  try {
    logger.info(`[runSearch] Starting AI filter for "${search.query}" (run ${runId})`);
    const filtered = await filterListings(listings, search.prompt!);

    const redisKey = filteredResultsKey(search.id, runId);
    await write(redisKey, JSON.stringify(filtered), RESULTS_TTL_SECONDS);
    await repository.updateRunFilterResults(runId, redisKey, filtered.length, "completed");

    logger.info(`[runSearch] AI filter done — ${filtered.length}/${listings.length} kept`);

    publishSearchEvent(search.id, {
      type: "filter_completed",
      searchId: search.id,
      runId,
      filteredListingCount: filtered.length,
    }).catch((e) => logger.error(`[runSearch] Failed to publish filter_completed:`, e));
  } catch (error) {
    logger.error(`[runSearch] AI filter failed for run ${runId}:`, error);
    await repository.updateRunFilterResults(runId, "", 0, "failed").catch(() => {});

    publishSearchEvent(search.id, {
      type: "filter_failed",
      searchId: search.id,
      runId,
      error: error instanceof Error ? error.message : String(error),
    }).catch((e) => logger.error(`[runSearch] Failed to publish filter_failed:`, e));
  }
}

/**
 * Scrapes listings and stores unfiltered results immediately.
 * If the search has a prompt, kicks off AI filtering asynchronously
 * and publishes SSE events when it completes or fails.
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

    const runId = randomUUID();
    const redisKey = resultsKey(search.id, runId);
    await write(redisKey, JSON.stringify(listings), RESULTS_TTL_SECONDS);

    const filterStatus: FilterStatus = search.prompt ? "pending" : "none";
    await repository.createRun(runId, search.id, redisKey, listings.length, filterStatus);
    await repository.updateLastRun(search.id, new Date());

    logger.info(`[runSearch] "${search.query}" scraped — ${listings.length} listings stored`);

    publishSearchEvent(search.id, {
      type: "completed",
      searchId: search.id,
      runId,
      listingCount: listings.length,
    }).catch((e) => logger.error(`[runSearch] Failed to publish completed event:`, e));

    if (search.prompt) {
      runFilterPhase(search, runId, listings);
    }

    return {
      runId,
      executedAt: new Date(),
      filterStatus,
      listings,
      filteredListings: null,
    };
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
