import type { SearchMarketPlaceParams } from "./scrape.types.ts";

export const DEFAULT_PAGE_DELAY_MS = 5_000;
export const DEFAULT_LISTING_FETCH_DELAY_MS = 7_000;
export const DEFAULT_PAGE_COUNT = 1;

/** ~500 miles in km. Max radius Facebook supports. */
export const MAX_RADIUS_KM = 805;

export const DEFAULT_SEARCH_CONFIG = {
  query: "vintage guitars",
  locationId: "sac",
  latitude: 38.577,
  longitude: -121.4947,
  radiusKm: MAX_RADIUS_KM,
  minPrice: 0,
  maxPrice: null,
  dateListedDays: null,
} as const;

export const SCRAPE_PARAM_KEYS: (keyof SearchMarketPlaceParams)[] = [
  "query",
  "location",
  "radiusKm",
  "minPrice",
  "maxPrice",
  "dateListedDays",
  "cursor",
  "pageCount",
  "pageDelayMs",
  "listingFetchDelayMs",
  "searchFrequency",
];

export const NUM_KEYS = [
  "radiusKm",
  "minPrice",
  "maxPrice",
  "dateListedDays",
  "pageCount",
  "pageDelayMs",
  "listingFetchDelayMs",
] as const;
