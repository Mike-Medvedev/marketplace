import type { MarketplaceListing } from "./search/search.types.ts";

export async function analyzeListings(
  listings: MarketplaceListing[],
): Promise<MarketplaceListing[]> {
  return listings;
}
