import type {
  MarketplaceSearchConfig,
  SearchMarketPlaceParams,
} from "./search.types";

/** Extracts search config (query, location, price, radius) from full params. */
export function pickSearchConfig(
  params: SearchMarketPlaceParams,
): Partial<MarketplaceSearchConfig> {
  const config: Partial<MarketplaceSearchConfig> = {};
  if (params.query != null) config.query = params.query;
  if (params.locationId != null) config.locationId = params.locationId;
  if (params.latitude != null) config.latitude = params.latitude;
  if (params.longitude != null) config.longitude = params.longitude;
  if (params.radiusKm != null) config.radiusKm = params.radiusKm;
  if (params.minPrice != null) config.minPrice = params.minPrice;
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
