import type { MarketplaceListing } from "./searchMarketPlace.ts";

export async function notifyMe(_listings: MarketplaceListing[]): Promise<MarketplaceListing[]> {
  return _listings;
}
