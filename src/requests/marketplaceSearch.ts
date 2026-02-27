import { getSessionOrThrow } from "@/requests/session.ts";
import { REQUEST_SPECIFIC } from "./constants.ts";
import { DEFAULT_SEARCH_CONFIG, MAX_RADIUS_KM } from "@/functions/search/search.constants";
import type { MarketplaceSearchConfig } from "@/functions/search/search.types";

/**
 * Utility to ensure the session body is an object.
 * Necessary because Playwright's postData() is a raw URL-encoded string.
 */
function parseBody(body: any): Record<string, string> {
  if (typeof body === "string") {
    return Object.fromEntries(new URLSearchParams(body));
  }
  return (body as Record<string, string>) ?? {};
}

function resolveSearchConfig(overrides?: Partial<MarketplaceSearchConfig>) {
  const query = encodeURIComponent(overrides?.query ?? DEFAULT_SEARCH_CONFIG.query);
  return {
    queryEncoded: query,
    locationId: overrides?.locationId ?? DEFAULT_SEARCH_CONFIG.locationId,
    latitude: overrides?.latitude ?? DEFAULT_SEARCH_CONFIG.latitude,
    longitude: overrides?.longitude ?? DEFAULT_SEARCH_CONFIG.longitude,
    radiusKm: Math.min(overrides?.radiusKm ?? DEFAULT_SEARCH_CONFIG.radiusKm, MAX_RADIUS_KM),
    minPrice: overrides?.minPrice ?? DEFAULT_SEARCH_CONFIG.minPrice,
  };
}

const marketplaceSearchParams = (
  cursor: string | null,
  config: ReturnType<typeof resolveSearchConfig>,
  parsedSessionBody: Record<string, string>,
): Record<string, string> => {
  const variables = {
    buyLocation: {
      latitude: config.latitude,
      longitude: config.longitude,
    },
    contextual_data: null,
    count: 24,
    cursor,
    params: {
      bqf: { callsite: "COMMERCE_MKTPLACE_WWW", query: config.queryEncoded },
      browse_request_params: {
        commerce_enable_local_pickup: true,
        commerce_enable_shipping: true,
        commerce_search_and_rp_available: true,
        commerce_search_and_rp_category_id: [],
        commerce_search_and_rp_condition: null,
        commerce_search_and_rp_ctime_days: null,
        filter_location_latitude: config.latitude,
        filter_location_longitude: config.longitude,
        filter_price_lower_bound: config.minPrice,
        filter_price_upper_bound: 214748364700,
        filter_radius_km: config.radiusKm,
      },
      custom_request_params: {
        browse_context: null,
        contextual_filters: [],
        referral_code: null,
        referral_ui_component: null,
        saved_search_strid: null,
        search_vertical: "C2C",
        seo_url: null,
        serp_landing_settings: { virtual_category_id: "" },
        surface: "SEARCH",
        virtual_contextual_filters: [],
      },
    },
    savedSearchID: null,
    savedSearchQuery: config.queryEncoded,
    scale: 2,
    searchPopularSearchesParams: {
      location_id: config.locationId,
      query: config.queryEncoded,
    },
    shouldIncludePopularSearches: false,
    topicPageParams: { location_id: config.locationId, url: null },
  };

  // Construct the body using spread and explicit overrides for TS safety
  const bodyParams: Record<string, string> = {
    ...parsedSessionBody,
    ...REQUEST_SPECIFIC.SEARCH,
    variables: JSON.stringify(variables),
    fb_dtsg: parsedSessionBody.fb_dtsg ?? "",
    lsd: parsedSessionBody.lsd ?? "",
  };

  return bodyParams;
};

export async function marketplaceSearchRequestConfig(
  cursor: string | null = null,
  searchConfig?: Partial<MarketplaceSearchConfig>,
) {
  const session = await getSessionOrThrow();

  // Ensure we have an object version of the body for manipulation
  const parsedSessionBody = parseBody(session.body);
  const config = resolveSearchConfig(searchConfig);
  const referer = `https://www.facebook.com/marketplace/${config.locationId}/search?query=${config.queryEncoded}`;

  // Build the final body object
  const finalBodyObj = marketplaceSearchParams(cursor, config, parsedSessionBody);

  return {
    method: "POST" as const,
    headers: {
      ...session.headers,
      cookie: session.cookie,
      "x-fb-friendly-name": REQUEST_SPECIFIC.SEARCH.fb_api_req_friendly_name,
      "x-fb-lsd": parsedSessionBody.lsd ?? "",
      Referer: referer,
      Origin: "https://www.facebook.com",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(finalBodyObj).toString(),
  };
}
