import type { MarketplaceListing } from "./search/search.types.ts";

export async function notifyMe(_listings: MarketplaceListing[]): Promise<MarketplaceListing[]> {
  return _listings;
}
