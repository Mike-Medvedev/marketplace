import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ListingsModel } from "./filter.types.ts";
import type { MarketplaceListing } from "@/features/scrape/scrape.types.ts";
import logger from "@/infra/logger/logger.ts";

const SYSTEM_PROMPT = `You are a marketplace listing analyst. Your job is to review raw marketplace listings and determine which ones match the user's buying criteria.

This is a high-stakes task — every listing you incorrectly omit is a missed opportunity. Your default should be to INCLUDE a listing unless it clearly fails the criteria. When in doubt, include it.

Guidelines:
- You will receive a JSON array of marketplace listings and the user's filtering criteria.
- Return only the listings that match the criteria, preserving their exact JSON structure.
- ALWAYS err on the side of inclusion. Only exclude a listing if the title or available data makes it obvious the item does not meet the criteria.
- Ambiguous listings (e.g. missing year, unclear model) should be INCLUDED — let the buyer decide.
- Price alone is not a reason to exclude unless the criteria explicitly set a price threshold.
- Your output must be valid JSON matching the required schema.`;

export async function filterListings(
  listings: Omit<MarketplaceListing, "photos" | "description">[],
  prompt: string,
): Promise<Omit<MarketplaceListing, "photos" | "description">[]> {
  logger.info(`[filterListings] Filtering ${listings.length} listings with AI prompt`);
  const client = new OpenAI();
  const { output_text, error } = await client.responses.create({
    model: "gpt-5.2",
    instructions: SYSTEM_PROMPT,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `## Filtering Criteria\n\n${prompt}\n\n## Listings\n\n${JSON.stringify(listings)}`,
          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(ListingsModel, "listings"),
    },
  });
  if (error) {
    throw error;
  }

  const parsed = ListingsModel.parse(JSON.parse(output_text ?? "{}"));
  logger.info(`[filterListings] AI returned ${parsed.filtered.length} of ${listings.length} listings`);
  return parsed.filtered as unknown as Omit<MarketplaceListing, "photos" | "description">[];
}
