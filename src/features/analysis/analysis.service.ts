import { env } from "@/configs/env.ts";
import logger from "@/infra/logger/logger.ts";
import type { listingSchema } from "@/features/searches/searches.types.ts";
import type { z } from "zod";

type Listing = z.infer<typeof listingSchema>;

const ROBOFLOW_URL =
  "https://serverless.roboflow.com/gilded-6esmg/workflows/custom-workflow-4";
const ROBOFLOW_TIMEOUT_MS = 30_000;

async function analyzeSingleListing(listing: Listing): Promise<boolean> {
  const response = await fetch(ROBOFLOW_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: env.ROBOFLOW_API_KEY,
      inputs: {
        image: { type: "url", value: listing.primaryPhotoUri },
        metadata: { id: listing.id, title: listing.title, url: listing.url },
      },
    }),
    signal: AbortSignal.timeout(ROBOFLOW_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `Roboflow returned ${response.status} ${response.statusText} for listing ${listing.id}`,
    );
  }

  const raw = (await response.json()) as { outputs?: { keep?: boolean }[] };
  const keep = raw?.outputs?.[0]?.keep;

  if (typeof keep !== "boolean") {
    logger.warn(
      `[roboflow] Unexpected response shape for listing ${listing.id}. Raw: ${JSON.stringify(raw).slice(0, 500)}`,
    );
    return false;
  }

  return keep;
}

export async function filterListingsViaRoboflow(
  listings: Listing[],
): Promise<Listing[]> {
  const kept: Listing[] = [];

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i]!;
    try {
      logger.info(
        `[roboflow] Analyzing listing ${i + 1}/${listings.length}: "${listing.title}" (${listing.id})`,
      );
      const shouldKeep = await analyzeSingleListing(listing);
      if (shouldKeep) {
        kept.push(listing);
        logger.info(`[roboflow] KEEP — "${listing.title}"`);
      } else {
        logger.info(`[roboflow] SKIP — "${listing.title}"`);
      }
    } catch (error) {
      logger.error(`[roboflow] Failed to analyze listing ${listing.id}:`, error);
    }
  }

  logger.info(`[roboflow] Analysis complete — ${kept.length}/${listings.length} kept`);
  return kept;
}
