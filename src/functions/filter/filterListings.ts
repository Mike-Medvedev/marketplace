import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { FILTER_PROMPT } from "@/functions/filter/filter.prompt.ts";
import { z } from "zod";
import type { MarketplaceListing } from "@/functions/search/search.types.ts";

const ListingsModel = z.array(
  z.object({
    id: z.string(),
    url: z.string(),
    price: z.string(),
    title: z.string(),
    location: z.string(),
    primaryPhotoUri: z.string(),
    description: z.string(),
    photos: z.array(z.object({ uri: z.string() })),
  }),
);

export async function filterListings(
  listings: MarketplaceListing[],
): Promise<MarketplaceListing[]> {
  const client = new OpenAI();
  const { output_text, error } = await client.responses.create({
    model: "gpt-5.2",
    instructions: FILTER_PROMPT,
    input: listings,
    text: {
      format: zodTextFormat(ListingsModel, "listings"),
    },
  });
  if (error) {
    throw error;
  }
  const parsed = ListingsModel.parse(JSON.parse(output_text));
  return parsed;
}
