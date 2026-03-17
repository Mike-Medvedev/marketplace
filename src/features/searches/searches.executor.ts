import { randomUUID } from "node:crypto";
import { searchMarketPlace } from "@/features/scrape/scrape.service.ts";
import { filterListings } from "@/features/filter/filter.service.ts";
import { write } from "@/infra/redis/redis.client.ts";
import { publishSearchEvent } from "@/infra/redis/redis.pubsub.ts";
import { RESULTS_TTL_SECONDS } from "@/features/scheduler/scheduler.constants.ts";
import { DEFAULT_PAGE_DELAY_MS } from "@/features/scrape/scrape.constants.ts";
import { delay } from "@/features/scrape/scrape.utils.ts";
import { COUNTRY_COVERAGE } from "./searches.constants.ts";
import * as repository from "./searches.repository.ts";
import logger from "@/infra/logger/logger.ts";
import type { StoredSearch, SearchRunResults, FilterStatus } from "./searches.types.ts";
import type { SearchMarketPlaceParams, SearchMarketPlaceResult } from "@/features/scrape/scrape.types.ts";

function toScrapeParams(search: StoredSearch): SearchMarketPlaceParams {
  const params: SearchMarketPlaceParams = {
    query: search.query,
    pageCount: search.listingsPerCheck,
  };
  if (!search.country) params.location = search.location;
  if (search.minPrice != null) params.minPrice = search.minPrice;
  if (search.maxPrice != null) params.maxPrice = search.maxPrice;
  return params;
}

function deduplicateListings(
  listings: SearchMarketPlaceResult["listings"],
): SearchMarketPlaceResult["listings"] {
  const seen = new Set<string>();
  return listings.filter((l) => {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });
}

async function scrapeCountry(
  baseParams: SearchMarketPlaceParams,
  country: string,
  userId: string,
): Promise<SearchMarketPlaceResult["listings"]> {
  const coverage = COUNTRY_COVERAGE[country];
  if (!coverage) throw new Error(`Unsupported country: ${country}`);

  const allListings: SearchMarketPlaceResult["listings"] = [];

  for (let i = 0; i < coverage.centers.length; i++) {
    const center = coverage.centers[i]!;
    logger.info(
      `[scrapeCountry] Searching ${coverage.label} region ${i + 1}/${coverage.centers.length} (lat=${center.lat}, lng=${center.lng})`,
    );

    const params: SearchMarketPlaceParams = {
      ...baseParams,
      latitude: center.lat,
      longitude: center.lng,
    };
    const { listings } = await searchMarketPlace(params, userId);
    allListings.push(...listings);

    if (i < coverage.centers.length - 1) {
      await delay(DEFAULT_PAGE_DELAY_MS);
    }
  }

  return deduplicateListings(allListings);
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
    const isCountrySearch = !!search.country;

    logger.info(
      `[runSearch] Executing "${search.query}" (${search.id}) — ${isCountrySearch ? `country=${search.country}` : `location=${search.location}`}, pageCount=${params.pageCount}`,
    );

    const listings = isCountrySearch
      ? await scrapeCountry(params, search.country!, search.userId)
      : (await searchMarketPlace(params, search.userId)).listings;

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
