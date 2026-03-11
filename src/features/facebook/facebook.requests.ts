import { getSessionOrThrow } from "./facebook.service.ts";
import { REQUEST_SPECIFIC } from "./facebook.constants.ts";
import { DEFAULT_SEARCH_CONFIG, MAX_RADIUS_KM } from "@/features/scrape/scrape.constants.ts";
import type { MarketplaceSearchConfig } from "@/features/scrape/scrape.types.ts";

/** Ensures the session body is an object (Playwright's postData() is a raw URL-encoded string). */
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
    maxPrice: overrides?.maxPrice ?? DEFAULT_SEARCH_CONFIG.maxPrice,
    dateListedDays: overrides?.dateListedDays ?? DEFAULT_SEARCH_CONFIG.dateListedDays,
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
        commerce_search_and_rp_ctime_days: config.dateListedDays,
        filter_location_latitude: config.latitude,
        filter_location_longitude: config.longitude,
        filter_price_lower_bound: config.minPrice,
        filter_price_upper_bound: config.maxPrice ?? 214748364700,
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
  userId: string,
  cursor: string | null = null,
  searchConfig?: Partial<MarketplaceSearchConfig>,
) {
  const session = await getSessionOrThrow(userId);

  const parsedSessionBody = parseBody(session.body);
  const config = resolveSearchConfig(searchConfig);
  const referer = `https://www.facebook.com/marketplace/${config.locationId}/search?query=${config.queryEncoded}`;

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

export async function marketplaceProductListingPhotosRequestConfig(userId: string, targetId: string) {
  const session = await getSessionOrThrow(userId);
  const marketplaceProductListingPhotosParams = (
    tId: string,
    sessionBody: Record<string, string>,
  ): Record<string, string> => {
    const bodyParams = {
      ...sessionBody,
      ...REQUEST_SPECIFIC.PHOTOS,
      variables: JSON.stringify({ targetId: tId }),
    };
    return bodyParams as Record<string, string>;
  };

  return {
    method: "POST" as const,
    headers: {
      ...session.headers,
      cookie: session.cookie,
      "x-fb-friendly-name": REQUEST_SPECIFIC.PHOTOS.fb_api_req_friendly_name,
      "x-fb-lsd": session.body.lsd,
    },
    body: new URLSearchParams(
      marketplaceProductListingPhotosParams(targetId, session.body),
    ).toString(),
  };
}

export async function marketplaceProductListingDescriptionRequestConfig(userId: string, targetId: string) {
  const session = await getSessionOrThrow(userId);
  const marketplaceProductListingDescriptionParams = (
    tId: string,
    sessionBody: Record<string, string>,
  ): Record<string, string> => {
    const variables = {
      enableJobEmployerActionBar: true,
      enableJobSeekerActionBar: true,
      feedbackSource: 56,
      feedLocation: "MARKETPLACE_MEGAMALL",
      referralCode: "null",
      scale: 2,
      targetId: tId,
      useDefaultActor: false,
      __relay_internal__pv__ShouldUpdateMarketplaceBoostListingBoostedStatusrelayprovider: false,
      __relay_internal__pv__CometUFISingleLineUFIrelayprovider: false,
      __relay_internal__pv__CometUFIShareActionMigrationrelayprovider: true,
      __relay_internal__pv__CometUFIReactionsEnableShortNamerelayprovider: false,
      __relay_internal__pv__CometUFICommentAvatarStickerAnimatedImagerelayprovider: false,
      __relay_internal__pv__CometUFICommentActionLinksRewriteEnabledrelayprovider: false,
      __relay_internal__pv__IsWorkUserrelayprovider: false,
      __relay_internal__pv__GHLShouldChangeSponsoredDataFieldNamerelayprovider: true,
      __relay_internal__pv__GHLShouldChangeAdIdFieldNamerelayprovider: true,
      __relay_internal__pv__CometUFI_dedicated_comment_routable_dialog_gkrelayprovider: false,
    };
    const bodyParams = {
      ...sessionBody,
      ...REQUEST_SPECIFIC.DESCRIPTION,
      variables: JSON.stringify(variables),
    };
    return bodyParams as Record<string, string>;
  };

  return {
    method: "POST" as const,
    headers: {
      ...session.headers,
      cookie: session.cookie,
      "x-fb-friendly-name": REQUEST_SPECIFIC.DESCRIPTION.fb_api_req_friendly_name,
      "x-fb-lsd": session.body.lsd,
    },
    body: new URLSearchParams(
      marketplaceProductListingDescriptionParams(targetId, session.body),
    ).toString(),
  };
}
