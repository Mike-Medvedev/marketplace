import type { MarketplaceListing } from "../search/search.types.ts";

export async function filterListings(
  listings: MarketplaceListing[],
): Promise<MarketplaceListing[]> {
  return listings;
}
