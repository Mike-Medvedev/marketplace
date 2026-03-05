import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { FILTER_PROMPT } from "./filter.constants.ts";
import { ListingsModel } from "./filter.types.ts";
import type { MarketplaceListing } from "@/features/scrape/scrape.types.ts";
import logger from "@/logger/logger.ts";

export async function filterListings(
  listings: Omit<MarketplaceListing, "photos" | "description">[],
): Promise<Omit<MarketplaceListing, "photos" | "description">[]> {
  logger.info("Filtering marketplace listings...");
  const client = new OpenAI();
  const { output_text, error } = await client.responses.create({
    model: "gpt-5.2",
    instructions: FILTER_PROMPT,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify(listings),
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

  logger.info("Successfully filtered listings!!");
  const parsed = ListingsModel.parse(JSON.parse(output_text ?? "{}"));
  return parsed.filtered as unknown as Omit<MarketplaceListing, "photos" | "description">[];
}
