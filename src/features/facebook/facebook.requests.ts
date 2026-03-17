import { getSessionOrThrow } from "./facebook.service.ts";
import {
  REQUEST_SPECIFIC,
  FIXED_HEADERS,
  ANON_BODY_DEFAULTS,
  ANON_SEC_HEADERS,
  DEFAULT_USER_AGENT,
} from "./facebook.constants.ts";
import { DEFAULT_SEARCH_CONFIG, MAX_RADIUS_KM } from "@/features/scrape/scrape.constants.ts";
import { AnonTokenScrapeError } from "@/shared/errors/errors.ts";
import logger from "@/infra/logger/logger.ts";
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
  const minPriceDollars = overrides?.minPrice ?? DEFAULT_SEARCH_CONFIG.minPrice;
  const maxPriceDollars = overrides?.maxPrice ?? DEFAULT_SEARCH_CONFIG.maxPrice;
  return {
    queryEncoded: query,
    locationId: overrides?.locationId ?? DEFAULT_SEARCH_CONFIG.locationId,
    latitude: overrides?.latitude ?? DEFAULT_SEARCH_CONFIG.latitude,
    longitude: overrides?.longitude ?? DEFAULT_SEARCH_CONFIG.longitude,
    radiusKm: Math.min(overrides?.radiusKm ?? DEFAULT_SEARCH_CONFIG.radiusKm, MAX_RADIUS_KM),
    minPriceCents: minPriceDollars * 100,
    maxPriceCents: maxPriceDollars != null ? maxPriceDollars * 100 : null,
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
        filter_price_lower_bound: config.minPriceCents,
        filter_price_upper_bound: config.maxPriceCents ?? 214748364700,
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

// ---------------------------------------------------------------------------
// Anonymous token scraping (logged-out page)
// ---------------------------------------------------------------------------

interface ScrapedTokens {
  lsd: string;
  body: Record<string, string>;
  scrapedAt: number;
}

const TOKEN_TTL_MS = 5 * 60 * 1000;
let cachedTokens: ScrapedTokens | null = null;

function extractToken(html: string, key: string): string | null {
  const patterns = [
    new RegExp(`"${key}":"([^"]+)"`),
    new RegExp(`"${key}","([^"]+)"`),
    new RegExp(`${key}=([^&"\\s]+)`),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return match[1];
  }
  return null;
}

export async function scrapePageTokens(userAgent?: string): Promise<ScrapedTokens> {
  if (cachedTokens && Date.now() - cachedTokens.scrapedAt < TOKEN_TTL_MS) {
    return cachedTokens;
  }

  logger.info("[anon] Scraping Facebook Marketplace page for tokens...");

  const response = await fetch("https://www.facebook.com/marketplace/", {
    headers: {
      "User-Agent": userAgent ?? DEFAULT_USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new AnonTokenScrapeError(
      `Failed to load Facebook Marketplace page: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();

  const lsd = extractToken(html, "LSD");
  if (!lsd) {
    const lsdAlt = extractToken(html, "lsd");
    if (!lsdAlt) {
      throw new AnonTokenScrapeError(
        "Could not extract LSD token from Facebook page. Facebook may be serving a CAPTCHA or blocking the request.",
      );
    }
    return buildTokenResult(lsdAlt, html);
  }

  return buildTokenResult(lsd, html);
}

function buildTokenResult(lsd: string, html: string): ScrapedTokens {
  const body: Record<string, string> = {
    ...ANON_BODY_DEFAULTS,
    lsd,
  };

  const tokenKeys = [
    ["__hs", "haste_session"],
    ["__rev", "client_revision"],
    ["__hsi", "hsi"],
    ["__dyn", null],
    ["__csr", null],
    ["__s", null],
    ["jazoest", null],
    ["__spin_r", "server_revision"],
    ["__spin_t", null],
    ["__crn", null],
  ] as const;

  for (const [bodyKey, altKey] of tokenKeys) {
    const value = extractToken(html, bodyKey) ?? (altKey ? extractToken(html, altKey) : null);
    if (value) body[bodyKey] = value;
  }

  const result: ScrapedTokens = { lsd, body, scrapedAt: Date.now() };
  cachedTokens = result;
  logger.info("[anon] Successfully scraped page tokens");
  return result;
}

/** Clears the cached anonymous tokens (useful for testing or forced refresh). */
export function clearAnonTokenCache(): void {
  cachedTokens = null;
}

// ---------------------------------------------------------------------------
// Authenticated search request
// ---------------------------------------------------------------------------

export async function marketplaceSearchRequestConfig(
  userId: string,
  cursor: string | null = null,
  searchConfig?: Partial<MarketplaceSearchConfig>,
  userAgent?: string,
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
      "User-Agent": userAgent ?? DEFAULT_USER_AGENT,
      "x-fb-friendly-name": REQUEST_SPECIFIC.SEARCH.fb_api_req_friendly_name,
      "x-fb-lsd": parsedSessionBody.lsd ?? "",
      Referer: referer,
      Origin: "https://www.facebook.com",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(finalBodyObj).toString(),
  };
}

// ---------------------------------------------------------------------------
// Anonymous (unauthenticated) search request
// ---------------------------------------------------------------------------

export async function marketplaceAnonSearchRequestConfig(
  cursor: string | null = null,
  searchConfig?: Partial<MarketplaceSearchConfig>,
  userAgent?: string,
) {
  const tokens = await scrapePageTokens(userAgent);
  const config = resolveSearchConfig(searchConfig);

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
        filter_price_lower_bound: config.minPriceCents,
        filter_price_upper_bound: config.maxPriceCents ?? 214748364700,
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
    shouldIncludePopularSearches: true,
    topicPageParams: { location_id: config.locationId, url: null },
  };

  const bodyParams: Record<string, string> = {
    ...tokens.body,
    ...REQUEST_SPECIFIC.SEARCH_ANON,
    variables: JSON.stringify(variables),
    lsd: tokens.lsd,
  };

  const referer = `https://www.facebook.com/marketplace/${config.locationId}/search?query=${config.queryEncoded}`;

  return {
    method: "POST" as const,
    headers: {
      ...FIXED_HEADERS,
      ...ANON_SEC_HEADERS,
      "User-Agent": userAgent ?? DEFAULT_USER_AGENT,
      "x-fb-friendly-name": REQUEST_SPECIFIC.SEARCH_ANON.fb_api_req_friendly_name,
      "x-fb-lsd": tokens.lsd,
      Referer: referer,
      Origin: "https://www.facebook.com",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(bodyParams).toString(),
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
