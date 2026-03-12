export const FB_QUERIES = {
  SEARCH: {
    friendly_name: "CometMarketplaceSearchContentContainerQuery",
    doc_id: "25360896583559734",
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
