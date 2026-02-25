import {
  FB_GRAPHQL_URL,
  marketplaceSearchRequestConfig,
  marketplaceProductListingPhotosRequestConfig,
  marketplaceProductListingDescriptionRequestConfig,
} from "@/requests";

// --- Types ---

export interface MarketplaceListing {
  id: string;
  url: string;
  price: string;
  title: string;
  location: string;
  primaryPhotoUri: string;
  photos: { uri: string }[];
  description: string;
}

export interface SearchMarketPlaceParams {
  /** Pagination cursor from previous response. Omit for first page. */
  cursor?: string | null;
  /** Fetch exactly this many pages (e.g. 5 for page1..page5). */
  pageCount?: number;
  /** Fetch pages until we have this many listings (e.g. 500). Omit for single page. */
  desiredCount?: number;
  /** Delay in ms between pagination requests to avoid rate limiting (default 5000). */
  pageDelayMs?: number;
  /** Delay in ms between each listing's photo+description fetch to avoid rate limiting (default 1500). */
  listingFetchDelayMs?: number;
}

export interface SearchMarketPlaceResult {
  listings: MarketplaceListing[];
  /** Pages keyed by page1, page2, ... for logging. */
  pages: Record<string, MarketplaceListing[]>;
  /** Cursor for next page. Use in next call to continue pagination. */
  nextCursor: string | null;
}

interface SearchResponseEdge {
  node: { listing: RawListing };
}

interface RawListing {
  id: string;
  listing_price: { amount: string };
  marketplace_listing_title: string;
  location: { reverse_geocode: string };
  primary_listing_photo: { image: { uri: string } };
}

// --- Main ---

const DEFAULT_PAGE_DELAY_MS = 5_000;
const DEFAULT_LISTING_FETCH_DELAY_MS = 1_500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function searchMarketPlace(
  params: SearchMarketPlaceParams = {},
): Promise<SearchMarketPlaceResult> {
  const {
    cursor = null,
    pageCount,
    desiredCount,
    pageDelayMs = DEFAULT_PAGE_DELAY_MS,
    listingFetchDelayMs = DEFAULT_LISTING_FETCH_DELAY_MS,
  } = params;

  if (pageCount == null && desiredCount == null) {
    return fetchOnePage(cursor, listingFetchDelayMs);
  }

  const pages: Record<string, MarketplaceListing[]> = {};
  let nextCursor: string | null = cursor;
  let pageNum = 1;

  const shouldContinue = () => {
    if (pageCount != null) return pageNum <= pageCount;
    return Object.values(pages).flat().length < (desiredCount ?? 0);
  };

  do {
    const page = await fetchOnePage(nextCursor, listingFetchDelayMs);
    pages[`page${pageNum}`] = page.listings;
    pageNum++;
    nextCursor = page.nextCursor;

    if (nextCursor != null && shouldContinue() && pageDelayMs > 0) {
      await delay(pageDelayMs);
    }
  } while (nextCursor != null && shouldContinue());

  const listings = Object.values(pages).flat();
  return {
    listings,
    pages,
    nextCursor,
  };
}

/** Fetches a single page of search results (~24 listings). */
async function fetchOnePage(
  cursor: string | null,
  listingFetchDelayMs: number = DEFAULT_LISTING_FETCH_DELAY_MS,
): Promise<SearchMarketPlaceResult> {
  const response = await fetch(FB_GRAPHQL_URL, marketplaceSearchRequestConfig(cursor));

  if (!response.ok) {
    throw new Error(`Search request failed: ${response.status} ${response.statusText}`);
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
    return { listings: [], pages: {}, nextCursor: null };
  }

  const rawListings = feedUnits.edges.map((edge) => edge.node.listing);
  const listings = await addPhotosAndDescriptions(rawListings, listingFetchDelayMs);
  const nextCursor = feedUnits.page_info?.end_cursor ?? null;

  return { listings, pages: { page1: listings }, nextCursor };
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
    const [photos, description] = await Promise.all([
      fetchListingPhotos(listing.id),
      fetchListingDescription(listing.id),
    ]);
    results.push({ ...details, photos, description });
    if (i < rawListings.length - 1 && delayMs > 0) {
      await delay(delayMs);
    }
  }
  return results;
}

async function fetchListingPhotos(listingId: string): Promise<{ uri: string }[]> {
  const response = await fetch(
    FB_GRAPHQL_URL,
    marketplaceProductListingPhotosRequestConfig(listingId),
  );

  if (!response.ok) {
    return [];
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
  const res = await fetch(
    "https://www.facebook.com/api/graphql/",
    marketplaceProductListingDescriptionRequestConfig(listingId),
  );
  const json = (await res.json()) as {
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
