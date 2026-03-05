import { env } from "@/configs/env.ts";
import type { MarketplaceListing } from "@/features/scrape/scrape.types.ts";
import logger from "@/logger/logger.ts";

export async function analyzeListings(
  listings: Omit<MarketplaceListing, "photos" | "description">[],
): Promise<MarketplaceListing[]> {
  const analyzed: MarketplaceListing[] = [];
  logger.info("Submitting listings for analysis!!");
  for (const listing of listings) {
    logger.info(`Analyzing ${listing.title}...`);
    try {
      const response = await fetch(
        "https://serverless.roboflow.com/gilded-6esmg/workflows/custom-workflow-4",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: env.ROBOFLOW_API_KEY,
            inputs: {
              image: { type: "url", value: listing.primaryPhotoUri },
              metedata: { id: listing.id, title: listing.title, url: listing.url },
            },
          }),
        },
      );

      const result = (await response.json()) as MarketplaceListing;
      analyzed.push(result);
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }
  logger.info("analysis complete!");
  return analyzed;
}
