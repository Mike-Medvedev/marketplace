import {
  FB_GRAPHQL_URL,
} from "@/features/facebook/facebook.constants.ts";
import {
  marketplaceSearchRequestConfig,
  marketplaceProductListingPhotosRequestConfig,
  marketplaceProductListingDescriptionRequestConfig,
} from "@/features/facebook/facebook.requests.ts";
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
  FacebookSessionExpiredError,
  FetchListingDescriptionError,
  FetchListingPhotosError,
  SearchMarketPlaceError,
} from "@/errors/errors.ts";
import { geocodeCity } from "@/infra/google/google.client.ts";
import logger from "@/logger/logger.ts";

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
): Promise<SearchMarketPlaceResult> {
  const {
    cursor = null,
    pageCount = DEFAULT_PAGE_COUNT,
    pageDelayMs = DEFAULT_PAGE_DELAY_MS,
    listingFetchDelayMs = DEFAULT_LISTING_FETCH_DELAY_MS,
  } = params;

  const geocoded = params.location ? await geocodeCity(params.location) : undefined;
  const searchConfig = pickSearchConfig(params, geocoded);

  if (pageCount == null || pageCount <= 1) {
    logger.info(
      `Page count set to 1, fetching a single page with delay of ${listingFetchDelayMs}ms...`,
    );
    return fetchOnePage(cursor, listingFetchDelayMs, searchConfig);
  }

  const allListings: Omit<MarketplaceListing, "photos" | "description">[] = [];
  let nextCursor: string | null = cursor;
  let pageNum = 1;

  do {
    const page = await fetchOnePage(nextCursor, listingFetchDelayMs, searchConfig);
    allListings.push(...page.listings);
    pageNum++;
    nextCursor = page.nextCursor;
    logger.info("Fetched one page of listings...");
    if (nextCursor != null && pageNum <= pageCount && pageDelayMs > 0) {
      logger.info(`Delaying next page to avoid rate limit for ${pageDelayMs}ms`);
      await delay(pageDelayMs);
    }
  } while (nextCursor != null && pageNum <= pageCount);
  logger.info("Successfully completed marketplace search!");

  return {
    listings: allListings,
    nextCursor,
  };
}

async function fetchOnePage(
  cursor: string | null,
  listingFetchDelayMs: number = DEFAULT_LISTING_FETCH_DELAY_MS,
  searchConfig?: Partial<MarketplaceSearchConfig>,
): Promise<SearchMarketPlaceResult> {
  const response = await fetch(
    FB_GRAPHQL_URL,
    await marketplaceSearchRequestConfig(cursor, searchConfig),
  );

  if (!response.ok) {
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
  const fbResponse = json as { error?: number; errorSummary?: string; errorDescription?: string };
  if (fbResponse.error != null) {
    const msg =
      fbResponse.errorDescription ?? fbResponse.errorSummary ?? "Facebook returned an error.";
    throw new FacebookSessionExpiredError(msg, fbResponse.error, fbResponse.errorSummary);
  }
  const feedUnits = json.data?.marketplace_search?.feed_units;
  if (!feedUnits?.edges) {
    return { listings: [], nextCursor: null };
  }
  logger.info(`------fetched ${feedUnits.edges.length} listings from marketplace`);
  const rawListings = feedUnits.edges.map((edge) => edge.node.listing);
  const listings = rawListings.map(extractListingDetails);
  // const listings = await addPhotosAndDescriptions(rawListings, listingFetchDelayMs);
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
    primaryPhotoUri: listing.primary_listing_photo.image.uri,
  };
}

async function addPhotosAndDescriptions(
  rawListings: RawListing[],
  delayMs: number = DEFAULT_LISTING_FETCH_DELAY_MS,
): Promise<MarketplaceListing[]> {
  const results: MarketplaceListing[] = [];
  for (let i = 0; i < rawListings.length; i++) {
    const listing = rawListings[i]!;
    const details = extractListingDetails(listing);
    logger.info(`fetching photos and description for listing with title: ${details.title}`);
    const photos = await fetchListingPhotos(listing.id);
    logger.info(`fetched photos, delaying for ${delayMs}ms until fetching description`);
    await delay(delayMs);
    const description = await fetchListingDescription(listing.id);
    logger.info(`fetched description, delaying for ${delayMs}ms until fetching next listing`);
    await delay(delayMs);

    results.push({ ...details, photos, description });
  }
  return results;
}

async function fetchListingPhotos(listingId: string): Promise<{ uri: string }[]> {
  const response = await fetch(
    FB_GRAPHQL_URL,
    await marketplaceProductListingPhotosRequestConfig(listingId),
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

async function fetchListingDescription(listingId: string): Promise<string> {
  const response = await fetch(
    FB_GRAPHQL_URL,
    await marketplaceProductListingDescriptionRequestConfig(listingId),
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
