import { writeFile } from "node:fs/promises";
import type { MarketplaceListing } from "./search/search.types.ts";
import logger from "@/logger/logger.ts";

export async function logListings(
  listings: MarketplaceListing[],
): Promise<MarketplaceListing[]> {
  await writeFile("./log.json", JSON.stringify(listings, null, 2), "utf-8");
  logger.info("Listings successfully logged to ./log.json");
  return listings;
}
