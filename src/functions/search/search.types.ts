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

export interface SearchMarketPlaceParams {
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
  /** Pages keyed by page1, page2, ... for logging. */
  pages: Record<string, MarketplaceListing[]>;
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
