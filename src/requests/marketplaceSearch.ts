import { SESSION } from "@/requests/session.ts";
import { REQUEST_SPECIFIC } from "./constants.ts";

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
  method: "POST" as const,
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
