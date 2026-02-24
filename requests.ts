import { env } from "./env.ts";

const FB_FRIENDLY_NAME = {
  SEARCH: "CometMarketplaceSearchContentContainerQuery",
  PHOTOS: "MarketplacePDPC2CMediaViewerWithImagesQuery",
  DESCRIPTION: "MarketplacePDPContainerQuery",
} as const;

function getSession() {
  return {
    cookie: env.FB_COOKIE,
    headers: {
      accept: "*/*",
      "accept-language": env.FB_ACCEPT_LANGUAGE,
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-prefers-color-scheme": env.FB_SEC_CH_PREFERS_COLOR_SCHEME,
      "sec-ch-ua": env.FB_SEC_CH_UA,
      "sec-ch-ua-full-version-list": env.FB_SEC_CH_UA_FULL_VERSION_LIST,
      "sec-ch-ua-mobile": env.FB_SEC_CH_UA_MOBILE,
      "sec-ch-ua-model": env.FB_SEC_CH_UA_MODEL,
      "sec-ch-ua-platform": env.FB_SEC_CH_UA_PLATFORM,
      "sec-ch-ua-platform-version": env.FB_SEC_CH_UA_PLATFORM_VERSION,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-asbd-id": env.FB_X_ASBD_ID,
      Referer:
        "https://www.facebook.com/marketplace/sac/search?query=vintage%20guitar",
    },
    body: {
      av: env.FB_USER_ID,
      __aaid: "0",
      __user: env.FB_USER_ID,
      __a: "1",
      __hs: env.FB_HS,
      dpr: "2",
      __ccg: "EXCELLENT",
      __rev: env.FB_REV,
      __s: env.FB_S,
      __hsi: env.FB_HSI,
      __dyn: env.FB_DYN,
      __csr: env.FB_CSR,
      __hsdp: env.FB_HSDP,
      __hblp: env.FB_HBLP,
      __sjsp: env.FB_SJSP,
      __comet_req: env.FB_COMET_REQ,
      fb_dtsg: env.FB_DTSG,
      jazoest: env.FB_JAZOEST,
      lsd: env.FB_LSD,
      __spin_r: env.FB_SPIN_R,
      __spin_b: "trunk",
      __spin_t: env.FB_SPIN_T,
      __crn: "comet.fbweb.CometMarketplaceSearchRoute",
      fb_api_caller_class: "RelayModern",
      server_timestamps: "true",
    },
  };
}

const SESSION = getSession();

const REQUEST_SPECIFIC = {
  SEARCH: {
    __req: "t",
    fb_api_req_friendly_name: FB_FRIENDLY_NAME.SEARCH,
    doc_id: "25360896583559734",
  },
  PHOTOS: {
    __req: "1u",
    fb_api_req_friendly_name: FB_FRIENDLY_NAME.PHOTOS,
    doc_id: "10059604367394414",
  },
  DESCRIPTION: {
    __req: "1v",
    fb_api_req_friendly_name: FB_FRIENDLY_NAME.DESCRIPTION,
    doc_id: "34344688261796183",
  },
} as const;

const marketplaceSearchParams = (
  cursor: string | null,
): Record<string, string> => {
  const variables = {
    buyLocation: { latitude: 38.577, longitude: -121.4947 },
    contextual_data: null,
    count: 24,
    cursor,
    params: {
      bqf: { callsite: "COMMERCE_MKTPLACE_WWW", query: "vintage%20guitars" },
      browse_request_params: {
        commerce_enable_local_pickup: true,
        commerce_enable_shipping: true,
        commerce_search_and_rp_available: true,
        commerce_search_and_rp_category_id: [],
        commerce_search_and_rp_condition: null,
        commerce_search_and_rp_ctime_days: null,
        filter_location_latitude: 38.577,
        filter_location_longitude: -121.4947,
        filter_price_lower_bound: 0,
        filter_price_upper_bound: 214748364700,
        filter_radius_km: 805,
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
    savedSearchQuery: "vintage%20guitars",
    scale: 2,
    searchPopularSearchesParams: {
      location_id: "sac",
      query: "vintage%20guitars",
    },
    shouldIncludePopularSearches: false,
    topicPageParams: { location_id: "sac", url: null },
  };

  const bodyParams = {
    ...SESSION.body,
    ...REQUEST_SPECIFIC.SEARCH,
    variables: JSON.stringify(variables),
  };
  return bodyParams as Record<string, string>;
};

export const marketplaceSearchRequestConfig = (
  cursor: string | null = null,
) => ({
  method: "POST",
  headers: {
    ...SESSION.headers,
    cookie: SESSION.cookie,
    "x-fb-friendly-name": REQUEST_SPECIFIC.SEARCH.fb_api_req_friendly_name,
    "x-fb-lsd": SESSION.body.lsd,
  },
  cookie: SESSION.cookie,
  referer: SESSION.headers.Referer,
  body: new URLSearchParams(marketplaceSearchParams(cursor)).toString(),
});

const marketplaceProductListingPhotosParams = (
  targetId: string,
): Record<string, string> => {
  const bodyParams = {
    ...SESSION.body,
    ...REQUEST_SPECIFIC.PHOTOS,
    variables: JSON.stringify({ targetId }),
  };
  return bodyParams as Record<string, string>;
};
export const marketplaceProductListingPhotosRequestConfig = (
  targetId: string,
) => ({
  method: "POST",
  headers: {
    ...SESSION.headers,
    cookie: SESSION.cookie,
    "x-fb-friendly-name": REQUEST_SPECIFIC.PHOTOS.fb_api_req_friendly_name,
    "x-fb-lsd": SESSION.body.lsd,
  },
  body: new URLSearchParams(
    marketplaceProductListingPhotosParams(targetId),
  ).toString(),
});
const marketplaceProductListingDescriptionParams = (
  targetId: string,
): Record<string, string> => {
  const variables = {
    enableJobEmployerActionBar: true,
    enableJobSeekerActionBar: true,
    feedbackSource: 56,
    feedLocation: "MARKETPLACE_MEGAMALL",
    referralCode: "null",
    scale: 2,
    targetId,
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
    ...SESSION.body,
    ...REQUEST_SPECIFIC.DESCRIPTION,
    variables: JSON.stringify(variables),
  };
  return bodyParams as Record<string, string>;
};

export const marketplaceProductListingDescriptionRequestConfig = (
  targetId: string,
) => ({
  method: "POST",
  headers: {
    ...SESSION.headers,
    cookie: SESSION.cookie,
    "x-fb-friendly-name": REQUEST_SPECIFIC.DESCRIPTION.fb_api_req_friendly_name,
    "x-fb-lsd": SESSION.body.lsd,
  },
  body: new URLSearchParams(
    marketplaceProductListingDescriptionParams(targetId),
  ).toString(),
});
