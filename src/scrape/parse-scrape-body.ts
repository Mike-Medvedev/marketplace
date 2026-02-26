import type { SearchMarketPlaceParams } from "@/functions/search/search.types";

const SCRAPE_PARAM_KEYS: (keyof SearchMarketPlaceParams)[] = [
  "query",
  "locationId",
  "latitude",
  "longitude",
  "radiusKm",
  "minPrice",
  "cursor",
  "pageCount",
  "pageDelayMs",
  "listingFetchDelayMs",
];

const NUM_KEYS = [
  "latitude",
  "longitude",
  "radiusKm",
  "minPrice",
  "pageCount",
  "pageDelayMs",
  "listingFetchDelayMs",
] as const;

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
