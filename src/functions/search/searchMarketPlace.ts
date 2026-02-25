import {
  FB_GRAPHQL_URL,
  marketplaceSearchRequestConfig,
  marketplaceProductListingPhotosRequestConfig,
  marketplaceProductListingDescriptionRequestConfig,
} from "@/requests";
import type {
  MarketplaceListing,
  MarketplaceSearchConfig,
  SearchMarketPlaceParams,
  SearchMarketPlaceResult,
  SearchResponseEdge,
  RawListing,
} from "./search.types";
import { delay, pickSearchConfig } from "./search.utils";
import {
  DEFAULT_LISTING_FETCH_DELAY_MS,
  DEFAULT_PAGE_COUNT,
  DEFAULT_PAGE_DELAY_MS,
} from "./search.constants";
import {
  FetchListingDescriptionError,
  FetchListingPhotosError,
  SearchMarketPlaceError,
} from "@/errors/errors";
import logger from "@/logger/logger";

/** Performs a Marketplace search.
 * @param [params={}] - Search options
 * @param [params.cursor] - Pagination cursor from previous response. Omit for first page.
 * @param [params.pageCount] - Fetch exactly this many pages.
 * @param [params.pageDelayMs=5000] - Delay in ms between pagination requests to avoid rate limiting.
 * @param [params.listingFetchDelayMs=1500] - Delay in ms between each listing's photo+description fetch.
 * @param [params.query] - Search query (default "vintage guitars").
 * @param [params.locationId] - Facebook location slug (default "sac").
 * @param [params.minPrice] - Minimum price filter (default 0).
 * @param [params.radiusKm] - Search radius in km, max 805 (~500 miles).
 * @example
 * // Custom search
 * const { listings } = await searchMarketPlace({
 *   pageCount: 2,
 *   query: "vintage stratocaster",
 *   locationId: "sf",
 *   minPrice: 500,
 *   radiusKm: 400, // optional, defaults to 805
 * });
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

  const searchConfig = pickSearchConfig(params);

  if (pageCount == null || pageCount <= 1) {
    logger.info(
      `Page count set to 1, fetching a single page with delay of ${listingFetchDelayMs}ms...`,
    );
    return fetchOnePage(cursor, listingFetchDelayMs, searchConfig);
  }

  const allListings: MarketplaceListing[] = [];
  let nextCursor: string | null = cursor;
  let pageNum = 1;

  /**
   * Main loop that searches marketplace until we have searched the desired pages
   * Delay added between loops to avoid rate-limiting and anti-bot
   */
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

/** Fetches a single page of search results using Relay's Cursor from prev response. */
async function fetchOnePage(
  cursor: string | null,
  listingFetchDelayMs: number = DEFAULT_LISTING_FETCH_DELAY_MS,
  searchConfig?: Partial<MarketplaceSearchConfig>,
): Promise<SearchMarketPlaceResult> {
  const response = await fetch(
    FB_GRAPHQL_URL,
    marketplaceSearchRequestConfig(cursor, searchConfig),
  );

  if (!response.ok) {
    throw new SearchMarketPlaceError(
      `Search request failed: ${response.status} ${response.statusText}`,
    );
  }

  const json = (await response.json()) as {
    data?: {
      marketplace_search?: {
        feed_units?: {
          edges?: SearchResponseEdge[];
          page_info?: { end_cursor: string | null };
        };
      };
    };
  };
  const feedUnits = json.data?.marketplace_search?.feed_units;
  if (!feedUnits?.edges) {
    return { listings: [], nextCursor: null };
  }
  logger.info(`------fetched ${feedUnits.edges.length} listings from marketplace`);
  const rawListings = feedUnits.edges.map((edge) => edge.node.listing);
  const listings = await addPhotosAndDescriptions(rawListings, listingFetchDelayMs);
  const nextCursor = feedUnits.page_info?.end_cursor ?? null;

  return { listings, nextCursor };
}

// --- Helpers ---

function extractListingDetails(
  listing: RawListing,
): Omit<MarketplaceListing, "photos" | "description"> {
  return {
    id: listing.id,
    url: `https://www.facebook.com/marketplace/item/${listing.id}/`,
    price: listing.listing_price.amount,
    title: listing.marketplace_listing_title,
    location: listing.location.reverse_geocode,
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
    /** Make sure not to call these at the same time to avoid anti-scraping */
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
    marketplaceProductListingPhotosRequestConfig(listingId),
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
    "https://www.facebook.com/api/graphql/",
    marketplaceProductListingDescriptionRequestConfig(listingId),
  );

  if (!response.ok) {
    throw new FetchListingDescriptionError(
      `Fetch failed for Listing photos for listing id: ${listingId}`,
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
