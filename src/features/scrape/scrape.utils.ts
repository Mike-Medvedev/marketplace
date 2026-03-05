import { SCRAPE_PARAM_KEYS, NUM_KEYS } from "./scrape.constants.ts";
import type { MarketplaceSearchConfig, SearchMarketPlaceParams } from "./scrape.types.ts";

export function parseScrapeBody(body: unknown): SearchMarketPlaceParams {
  if (body == null || typeof body !== "object") return {};
  const raw = body as Record<string, unknown>;
  const params: SearchMarketPlaceParams = {};
  for (const key of SCRAPE_PARAM_KEYS) {
    const v = raw[key];
    if (v === undefined) continue;
    if (NUM_KEYS.includes(key as (typeof NUM_KEYS)[number])) {
      const n = Number(v);
      if (!Number.isNaN(n)) (params as Record<string, number>)[key] = n;
    } else if (key === "cursor") {
      params.cursor = v === null || v === "" ? null : String(v);
    } else {
      (params as Record<string, string>)[key] = String(v);
    }
  }
  return params;
}

interface GeocodedLocation {
  latitude: number;
  longitude: number;
  locationId: string;
}

/**
 * Builds the internal search config for Facebook.
 * Geocoded location (lat/lng/slug) is passed in from the service layer when `params.location` was provided.
 */
export function pickSearchConfig(
  params: SearchMarketPlaceParams,
  geocoded?: GeocodedLocation,
): Partial<MarketplaceSearchConfig> {
  const config: Partial<MarketplaceSearchConfig> = {};
  if (params.query != null) config.query = params.query;
  if (geocoded) {
    config.latitude = geocoded.latitude;
    config.longitude = geocoded.longitude;
    config.locationId = geocoded.locationId;
  }
  if (params.radiusKm != null) config.radiusKm = params.radiusKm;
  if (params.minPrice != null) config.minPrice = params.minPrice;
  if (params.maxPrice != null) config.maxPrice = params.maxPrice;
  if (params.dateListedDays != null) config.dateListedDays = params.dateListedDays;
  return config;
}

/** Delays for a variable duration with optional jitter. */
export function delay(ms: number, jitterPercent = 20): Promise<void> {
  const jitter = (ms * jitterPercent) / 100;
  const min = ms - jitter;
  const max = ms + jitter;
  const actualMs = Math.max(0, min + Math.random() * (max - min));
  return new Promise((resolve) => setTimeout(resolve, actualMs));
}
