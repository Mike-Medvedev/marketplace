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
} as const;

export const FB_GRAPHQL_URL = "https://www.facebook.com/api/graphql/";
