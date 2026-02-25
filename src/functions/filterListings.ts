import type { MarketplaceListing } from "./searchMarketPlace.ts";

export async function filterListings(
  listings: MarketplaceListing[],
): Promise<MarketplaceListing[]> {
  return listings;
}
