export interface MarketplaceListing {
  id: string;
  url: string;
  price: string;
  title: string;
  location: string;
  primaryPhotoUri: string;
  photos: { uri: string }[];
  description: string;
}

/** Search filters for Marketplace (query, location, price, radius). */
export interface MarketplaceSearchConfig {
  /** Search query (e.g. "vintage guitars"). Default "vintage guitars". */
  query?: string;
  /** Facebook location slug (e.g. "sac", "sf"). Default "sac". */
  locationId?: string;
  /** Latitude for geo filter. Default 38.577 (Sacramento). */
  latitude?: number;
  /** Longitude for geo filter. Default -121.4947 (Sacramento). */
  longitude?: number;
  /** Search radius in km. Default 805 (~500 miles). Max 805. */
  radiusKm?: number;
  /** Minimum price filter. Default 0. */
  minPrice?: number;
}

export interface SearchMarketPlaceParams extends MarketplaceSearchConfig {
  /** Pagination cursor from previous response. Omit for first page. */
  cursor?: string | null;
  /** Fetch exactly this many pages (e.g. 5 for page1..page5). */
  pageCount?: number;
  /** Delay in ms between pagination requests to avoid rate limiting (default 5000). */
  pageDelayMs?: number;
  /** Delay in ms between each listing's photo+description fetch to avoid rate limiting (default 1500). */
  listingFetchDelayMs?: number;
}

export interface SearchMarketPlaceResult {
  listings: MarketplaceListing[];
  /** Cursor for next page. Use in next call to continue pagination. */
  nextCursor: string | null;
}

export interface SearchResponseEdge {
  node: { listing: RawListing };
}

export interface RawListing {
  id: string;
  listing_price: { amount: string };
  marketplace_listing_title: string;
  location: { reverse_geocode: string };
  primary_listing_photo: { image: { uri: string } };
}
