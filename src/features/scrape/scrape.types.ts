import { z } from "zod";

export interface MarketplaceListing {
  id: string;
  url: string;
  price: string;
  title: string;
  /** Facebook reverse_geocode object (e.g. { city, state, city_page }). Null when seller did not set location. */
  location: Record<string, unknown> | null;
  primaryPhotoUri: string;
  photos: { uri: string }[];
  description: string;
}

/** Search filters for Marketplace (query, location, price, radius, recency). */
export interface MarketplaceSearchConfig {
  /** Search query (e.g. "vintage guitars"). Default "vintage guitars". */
  query?: string;
  /** Facebook location slug (e.g. "sac", "sf"). Default "sac". */
  locationId?: string;
  /** Latitude for geo filter. Default 38.577 (Sacramento). */
  latitude?: number;
  /** Longitude for geo filter. Default -121.4947 (Sacramento). */
  longitude?: number;
  /** Search radius in km. Default 805 (~500 miles). Max 805. */
  radiusKm?: number;
  /** Minimum price filter. Default 0. */
  minPrice?: number;
  /** Maximum price filter in cents. Omit or null for no upper limit. */
  maxPrice?: number;
  /** Only show listings created within the last N days (1, 7, or 30). Omit for all listings. */
  dateListedDays?: 1 | 7 | 30;
}

export interface SearchMarketPlaceParams {
  /** City/state string for geocoding (e.g. "Stamford, CT"). Resolved to lat/lng on the backend. */
  location?: string;
  /** Search query (e.g. "vintage guitars"). */
  query?: string;
  /** Search radius in km. Default 805 (~500 miles). Max 805. */
  radiusKm?: number;
  /** Minimum price filter. Default 0. */
  minPrice?: number;
  /** Maximum price filter in cents. Omit or null for no upper limit. */
  maxPrice?: number;
  /** Only show listings created within the last N days (1, 7, or 30). Omit for all listings. */
  dateListedDays?: 1 | 7 | 30;
  /** Pagination cursor from previous response. Omit for first page. */
  cursor?: string | null;
  /** Fetch exactly this many pages (e.g. 5 for page1..page5). */
  pageCount?: number;
  /** Delay in ms between pagination requests to avoid rate limiting (default 5000). */
  pageDelayMs?: number;
  /** Delay in ms between each listing's photo+description fetch to avoid rate limiting (default 1500). */
  listingFetchDelayMs?: number;
  /** How often to repeat this search (e.g. "every_30m", "every_1h", "every_6h", "every_24h"). */
  searchFrequency?: string;
}

export interface SearchMarketPlaceResult {
  listings: Omit<MarketplaceListing, "photos" | "description">[];
  /** Cursor for next page. Use in next call to continue pagination. */
  nextCursor: string | null;
}

export interface SearchResponseEdge {
  node: { listing: RawListing };
}

export interface RawListing {
  id: string;
  listing_price: { amount: string };
  marketplace_listing_title: string;
  location: { reverse_geocode: Record<string, unknown> };
  primary_listing_photo: { image: { uri: string } };
}

/** Zod schema for POST /scrape request body. All fields optional. No body or empty body defaults to {}. */
export const searchMarketPlaceParamsSchema = z
  .object({
    query: z.string().optional(),
    location: z.string().optional(),
    radiusKm: z.coerce.number().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    dateListedDays: z.coerce.number().pipe(z.union([z.literal(1), z.literal(7), z.literal(30)])).optional(),
    pageCount: z.coerce.number().optional(),
    pageDelayMs: z.coerce.number().optional(),
    listingFetchDelayMs: z.coerce.number().optional(),
    searchFrequency: z.string().optional(),
  })
  .optional()
  .default({});

/** Listing shape returned by search (no photos/description). Facebook may return location: null for some listings. */
const scrapeListingSchema = z.object({
  id: z.string(),
  url: z.string(),
  price: z.string(),
  title: z.string(),
  location: z.record(z.string(), z.unknown()).nullable(),
  primaryPhotoUri: z.string(),
});

/** Zod schema for POST /scrape response body. */
export const searchMarketPlaceResultSchema = z.object({
  listings: z.array(scrapeListingSchema),
});

export type SearchMarketPlaceParamsInput = z.infer<typeof searchMarketPlaceParamsSchema>;
export type SearchMarketPlaceResultOutput = z.infer<typeof searchMarketPlaceResultSchema>;
