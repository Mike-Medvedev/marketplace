export const FB_QUERIES = {
  SEARCH: {
    friendly_name: "CometMarketplaceSearchContentContainerQuery",
    doc_id: "25360896583559734",
  },
  SEARCH_ANON: {
    friendly_name: "CometMarketplaceSearchContentContainerQuery",
    doc_id: "26543821838555115",
  },
  PHOTOS: {
    friendly_name: "MarketplacePDPC2CMediaViewerWithImagesQuery",
    doc_id: "10059604367394414",
  },
  DESCRIPTION: {
    friendly_name: "MarketplacePDPContainerQuery",
    doc_id: "34344688261796183",
  },
  ROOT_QUERY: {
    friendly_name: "CometMarketplaceRootQuery",
    doc_id: "24278083268459479",
  },
} as const;

export const REQUEST_SPECIFIC = {
  SEARCH: {
    __req: "t",
    fb_api_req_friendly_name: FB_QUERIES.SEARCH.friendly_name,
    doc_id: FB_QUERIES.SEARCH.doc_id,
  },
  SEARCH_ANON: {
    __req: "10",
    fb_api_caller_class: "RelayModern",
    fb_api_req_friendly_name: FB_QUERIES.SEARCH_ANON.friendly_name,
    doc_id: FB_QUERIES.SEARCH_ANON.doc_id,
    server_timestamps: "true",
  },
  PHOTOS: {
    __req: "1u",
    fb_api_req_friendly_name: FB_QUERIES.PHOTOS.friendly_name,
    doc_id: FB_QUERIES.PHOTOS.doc_id,
  },
  DESCRIPTION: {
    __req: "1v",
    fb_api_req_friendly_name: FB_QUERIES.DESCRIPTION.friendly_name,
    doc_id: FB_QUERIES.DESCRIPTION.doc_id,
  },
  ROOT_QUERY: {
    __req: "1r",
    fb_api_req_friendly_name: FB_QUERIES.ROOT_QUERY.friendly_name,
    doc_id: FB_QUERIES.ROOT_QUERY.doc_id,
  },
} as const;

export const FB_GRAPHQL_URL = "https://www.facebook.com/api/graphql/";

export const SESSION_KEY = "facebook:session";

export const FIXED_HEADERS: Record<string, string> = {
  accept: "*/*",
  "cache-control": "no-cache",
  "content-type": "application/x-www-form-urlencoded",
  pragma: "no-cache",
  priority: "u=1, i",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
};

export const BODY_DEFAULTS: Record<string, string> = {
  __aaid: "0",
  __a: "1",
  dpr: "2",
  __ccg: "EXCELLENT",
  __spin_b: "trunk",
};

export const ANON_BODY_DEFAULTS: Record<string, string> = {
  av: "0",
  __aaid: "0",
  __user: "0",
  __a: "1",
  dpr: "2",
  __ccg: "EXCELLENT",
  __comet_req: "15",
  __spin_b: "trunk",
};

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const ANON_SEC_HEADERS: Record<string, string> = {
  "sec-ch-prefers-color-scheme": "dark",
  "sec-ch-ua": '"Chromium";v="131", "Google Chrome";v="131", "Not:A-Brand";v="99"',
  "sec-ch-ua-full-version-list":
    '"Chromium";v="131.0.0.0", "Google Chrome";v="131.0.0.0", "Not:A-Brand";v="99.0.0.0"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-model": '""',
  "sec-ch-ua-platform": '"Windows"',
  "sec-ch-ua-platform-version": '"15.0.0"',
};
