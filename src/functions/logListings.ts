import { writeFile } from "node:fs/promises";
import type { MarketplaceListing } from "./searchMarketPlace.ts";

export async function logListings(
  pages: Record<string, MarketplaceListing[]>,
): Promise<MarketplaceListing[]> {
  await writeFile("./log.json", JSON.stringify(pages, null, 2), "utf-8");
  return Object.values(pages).flat();
}
