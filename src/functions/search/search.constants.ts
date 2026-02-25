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
} as const;
