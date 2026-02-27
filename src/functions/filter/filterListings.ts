import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { FILTER_PROMPT } from "@/functions/filter/filter.prompt.ts";
import { z } from "zod";
import type { MarketplaceListing } from "@/functions/search/search.types.ts";
import logger from "@/logger/logger";

// const ListingsModel = z.object({
//   filtered: z.array(
//     z.object({
//       id: z.string(),
//       url: z.string(),
//       price: z.string(),
//       title: z.string(),
//       location: z.string(),
//       primaryPhotoUri: z.string(),
//       description: z.string(),
//       photos: z.array(z.object({ uri: z.string() })),
//     }),
//   ),
// });
const ListingsModel = z.object({
  filtered: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      price: z.string(),
      title: z.string(),
      location: z.string(),
      primaryPhotoUri: z.string(),
    }),
  ),
});

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
  return parsed.filtered;
}
