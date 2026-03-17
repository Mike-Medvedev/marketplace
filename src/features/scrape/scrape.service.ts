import { FB_GRAPHQL_URL } from "@/features/facebook/facebook.constants.ts";
import {
  marketplaceSearchRequestConfig,
  marketplaceAnonSearchRequestConfig,
  marketplaceProductListingPhotosRequestConfig,
  marketplaceProductListingDescriptionRequestConfig,
} from "@/features/facebook/facebook.requests.ts";
import { hasSession } from "@/features/facebook/facebook.service.ts";
import type {
  MarketplaceListing,
  MarketplaceSearchConfig,
  SearchMarketPlaceParams,
  SearchMarketPlaceResult,
  SearchResponseEdge,
  RawListing,
} from "./scrape.types.ts";
import { delay, pickSearchConfig } from "./scrape.utils.ts";
import {
  DEFAULT_LISTING_FETCH_DELAY_MS,
  DEFAULT_PAGE_COUNT,
  DEFAULT_PAGE_DELAY_MS,
} from "./scrape.constants.ts";
import {
  FacebookRateLimitError,
  FacebookSessionExpiredError,
  FetchListingDescriptionError,
  FetchListingPhotosError,
  SearchMarketPlaceError,
} from "@/shared/errors/errors.ts";
import { geocodeCity } from "@/infra/google/google.client.ts";
import logger from "@/infra/logger/logger.ts";

/** Performs a Marketplace search.
 * @param [params={}] - Search options
 * @param [params.cursor] - Pagination cursor from previous response. Omit for first page.
 * @param [params.pageCount] - Fetch exactly this many pages.
 * @param [params.pageDelayMs=2000] - Delay in ms between pagination requests to avoid rate limiting.
 * @param [params.listingFetchDelayMs=1500] - Delay in ms between each listing's photo+description fetch.
 * @param [params.query] - Search query (default "vintage guitars").
 * @param [params.location] - City/state to geocode (e.g. "Stamford, CT"). Falls back to Sacramento.
 * @param [params.minPrice] - Minimum price filter (default 0).
 * @param [params.maxPrice] - Maximum price filter. Omit for no upper limit.
 * @param [params.dateListedDays] - Only listings from the last 1, 7, or 30 days. Omit for all.
 * @param [params.radiusKm] - Search radius in km, max 805 (~500 miles).
 * @param [params.searchFrequency] - How often to repeat this search (e.g. "every_30m").
 */
export async function searchMarketPlace(
  params: SearchMarketPlaceParams = {},
  userId?: string,
): Promise<SearchMarketPlaceResult> {
  const {
    cursor = null,
    pageCount = DEFAULT_PAGE_COUNT,
    pageDelayMs = DEFAULT_PAGE_DELAY_MS,
    listingFetchDelayMs = DEFAULT_LISTING_FETCH_DELAY_MS,
    userAgent,
  } = params;

  let isAuthenticated = userId ? await hasSession(userId) : false;
  let sessionExpired = false;

  logger.info(
    `[searchMarketPlace] Starting search — query="${params.query}", location="${params.location}", minPrice=${params.minPrice}, maxPrice=${params.maxPrice}, dateListedDays=${params.dateListedDays}, pageCount=${pageCount}, mode=${isAuthenticated ? "authenticated" : "anonymous"}`,
  );

  const geocoded = params.location ? await geocodeCity(params.location) : undefined;
  if (geocoded) {
    logger.info(
      `[searchMarketPlace] Geocoded "${params.location}" -> lat=${geocoded.latitude}, lng=${geocoded.longitude}, slug="${geocoded.locationId}"`,
    );
  }
  const searchConfig = pickSearchConfig(params, geocoded);

  if (pageCount == null || pageCount <= 1) {
    logger.info(`[searchMarketPlace] Fetching single page...`);
    try {
      const result = await fetchOnePage(cursor, listingFetchDelayMs, searchConfig, userId, isAuthenticated, userAgent);
      return { ...result, sessionExpired };
    } catch (error) {
      if (isAuthenticated && error instanceof FacebookSessionExpiredError) {
        logger.warn(`[searchMarketPlace] Session expired, falling back to anonymous mode`);
        sessionExpired = true;
        const result = await fetchOnePage(cursor, listingFetchDelayMs, searchConfig, userId, false, userAgent);
        return { ...result, sessionExpired };
      }
      throw error;
    }
  }

  const allListings: Omit<MarketplaceListing, "photos" | "description">[] = [];
  let nextCursor: string | null = cursor;
  let pageNum = 1;

  do {
    try {
      const page = await fetchOnePage(nextCursor, listingFetchDelayMs, searchConfig, userId, isAuthenticated, userAgent);
      allListings.push(...page.listings);
      pageNum++;
      nextCursor = page.nextCursor;
      logger.info("Fetched one page of listings...");
    } catch (error) {
      if (isAuthenticated && error instanceof FacebookSessionExpiredError) {
        logger.warn(`[searchMarketPlace] Session expired mid-pagination, switching to anonymous mode`);
        isAuthenticated = false;
        sessionExpired = true;
        const page = await fetchOnePage(nextCursor, listingFetchDelayMs, searchConfig, userId, false, userAgent);
        allListings.push(...page.listings);
        pageNum++;
        nextCursor = page.nextCursor;
      } else {
        throw error;
      }
    }
    if (nextCursor != null && pageNum <= pageCount && pageDelayMs > 0) {
      logger.info(`Delaying next page to avoid rate limit for ${pageDelayMs}ms`);
      await delay(pageDelayMs);
    }
  } while (nextCursor != null && pageNum <= pageCount);
  logger.info("Successfully completed marketplace search!");

  return {
    listings: allListings,
    nextCursor,
    sessionExpired,
  };
}

type FetchOnePageResult = Omit<SearchMarketPlaceResult, "sessionExpired">;

async function fetchOnePage(
  cursor: string | null,
  listingFetchDelayMs: number = DEFAULT_LISTING_FETCH_DELAY_MS,
  searchConfig?: Partial<MarketplaceSearchConfig>,
  userId?: string,
  isAuthenticated: boolean = true,
  userAgent?: string,
): Promise<FetchOnePageResult> {
  const mode = isAuthenticated ? "authenticated" : "anonymous";
  logger.info(`[fetchOnePage] Requesting Facebook GraphQL [${mode}] (cursor=${cursor ? "yes" : "none"})`);

  const requestConfig = isAuthenticated
    ? await marketplaceSearchRequestConfig(userId!, cursor, searchConfig, userAgent)
    : await marketplaceAnonSearchRequestConfig(cursor, searchConfig, userAgent);

  const response = await fetch(FB_GRAPHQL_URL, requestConfig);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "(could not read body)");
    logger.error(
      `[fetchOnePage] Non-OK response body (first 500 chars): ${errorBody.slice(0, 500)}`,
    );
    throw new SearchMarketPlaceError(
      `Search request failed: ${response.status} ${response.statusText}`,
    );
  }
  const rawText = await response.text();
  let json: {
    data?: {
      marketplace_search?: {
        feed_units?: { edges?: SearchResponseEdge[]; page_info?: { end_cursor: string | null } };
      };
    };
  };
  try {
    const jsonText = rawText.startsWith("for (;;);") ? rawText.slice(9) : rawText;
    json = JSON.parse(jsonText);
  } catch (error) {
    logger.error(
      `[searchMarketPlace] Failed to parse Facebook response. First 500 chars: ${rawText.slice(0, 500)}`,
    );
    throw error;
  }
  const fbErrors = (json as { errors?: { message: string; code: number }[] }).errors;
  if (fbErrors?.length) {
    const first = fbErrors[0]!;
    logger.error(
      `[fetchOnePage] Facebook GraphQL error: code=${first.code}, message="${first.message}"`,
    );
    if (first.code === 1675004) {
      throw new FacebookRateLimitError(first.code);
    }
    throw new SearchMarketPlaceError(
      `Facebook GraphQL error (code ${first.code}): ${first.message}`,
    );
  }

  const fbResponse = json as { error?: number; errorSummary?: string; errorDescription?: string };
  if (fbResponse.error != null) {
    const msg =
      fbResponse.errorDescription ?? fbResponse.errorSummary ?? "Facebook returned an error.";
    logger.error(`[fetchOnePage] Facebook error ${fbResponse.error}: ${msg}`);
    if (isAuthenticated) {
      throw new FacebookSessionExpiredError(msg, fbResponse.error, fbResponse.errorSummary);
    }
    throw new SearchMarketPlaceError(
      `Facebook anonymous request failed (error ${fbResponse.error}): ${msg}`,
    );
  }

  if (!json.data) {
    logger.error(
      `[fetchOnePage] Facebook response has no "data" field. First 1000 chars: ${JSON.stringify(json).slice(0, 1000)}`,
    );
    throw new SearchMarketPlaceError(
      "Facebook returned an unexpected response (no data field).",
    );
  }

  if (!json.data.marketplace_search) {
    logger.error(
      `[fetchOnePage] Facebook response missing "marketplace_search". Keys: ${Object.keys(json.data).join(", ")}. First 1000 chars: ${JSON.stringify(json.data).slice(0, 1000)}`,
    );
    throw new SearchMarketPlaceError(
      "Facebook returned an unexpected response (no marketplace_search). Request may be malformed.",
    );
  }

  const feedUnits = json.data.marketplace_search.feed_units;
  if (!feedUnits?.edges || feedUnits.edges.length === 0) {
    logger.warn(
      `[fetchOnePage] Facebook returned 0 listings. feed_units present: ${!!feedUnits}, edges present: ${!!feedUnits?.edges}, edges length: ${feedUnits?.edges?.length ?? 0}`,
    );
    return { listings: [], nextCursor: null };
  }

  const rawListings = feedUnits.edges
    .map((edge) => edge.node.listing)
    .filter((listing): listing is RawListing => listing != null)
    .filter((listing) => listing.primary_listing_photo != null);
  logger.info(
    `[fetchOnePage] Fetched ${rawListings.length} listings (with photos) from ${feedUnits.edges.length} edges`,
  );
  const listings = rawListings.map(extractListingDetails);
  const nextCursor = feedUnits.page_info?.end_cursor ?? null;

  return { listings, nextCursor };
}

function extractListingDetails(
  listing: RawListing,
): Omit<MarketplaceListing, "photos" | "description"> {
  return {
    id: listing.id,
    url: `https://www.facebook.com/marketplace/item/${listing.id}/`,
    price: listing.listing_price.amount,
    title: listing.marketplace_listing_title,
    location: listing.location?.reverse_geocode ?? null,
    primaryPhotoUri: listing.primary_listing_photo!.image.uri,
  };
}

async function addPhotosAndDescriptions(
  userId: string,
  rawListings: RawListing[],
  delayMs: number = DEFAULT_LISTING_FETCH_DELAY_MS,
): Promise<MarketplaceListing[]> {
  const results: MarketplaceListing[] = [];
  for (let i = 0; i < rawListings.length; i++) {
    const listing = rawListings[i]!;
    const details = extractListingDetails(listing);
    logger.info(`fetching photos and description for listing with title: ${details.title}`);
    const photos = await fetchListingPhotos(userId, listing.id);
    logger.info(`fetched photos, delaying for ${delayMs}ms until fetching description`);
    await delay(delayMs);
    const description = await fetchListingDescription(userId, listing.id);
    logger.info(`fetched description, delaying for ${delayMs}ms until fetching next listing`);
    await delay(delayMs);

    results.push({ ...details, photos, description });
  }
  return results;
}

async function fetchListingPhotos(userId: string, listingId: string): Promise<{ uri: string }[]> {
  const response = await fetch(
    FB_GRAPHQL_URL,
    await marketplaceProductListingPhotosRequestConfig(userId, listingId),
  );

  if (!response.ok) {
    throw new FetchListingPhotosError(
      `Fetch failed for Listing photos for listing id: ${listingId}`,
    );
  }

  const json = (await response.json()) as {
    data?: {
      viewer?: {
        marketplace_product_details_page?: {
          target?: { listing_photos?: { image: { uri: string } }[] };
        };
      };
    };
  };

  const photos = json.data?.viewer?.marketplace_product_details_page?.target?.listing_photos;
  return (photos ?? []).map((p) => p.image);
}

async function fetchListingDescription(userId: string, listingId: string): Promise<string> {
  const response = await fetch(
    FB_GRAPHQL_URL,
    await marketplaceProductListingDescriptionRequestConfig(userId, listingId),
  );

  if (!response.ok) {
    throw new FetchListingDescriptionError(
      `Fetch failed for Listing description for listing id: ${listingId}`,
    );
  }

  const json = (await response.json()) as {
    data?: {
      viewer?: {
        marketplace_product_details_page?: {
          target?: { redacted_description?: { text?: string } };
        };
      };
    };
  };

  const pdp = json.data?.viewer?.marketplace_product_details_page;
  if (!pdp) return "";

  const target = pdp.target;
  return target?.redacted_description?.text ?? "";
}
