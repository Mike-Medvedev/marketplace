import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ListingsModel } from "./filter.types.ts";
import type { MarketplaceListing } from "@/features/scrape/scrape.types.ts";
import logger from "@/infra/logger/logger.ts";

const SYSTEM_PROMPT = `You are a marketplace listing analyst. Your job is to review raw marketplace listings and determine which ones match the user's buying criteria.

This is a high-stakes task — every listing you incorrectly omit is a missed opportunity. Your default should be to INCLUDE a listing unless it clearly fails the criteria. When in doubt, include it.

Guidelines:
- You will receive a JSON array of marketplace listings and the user's filtering criteria.
- Return only the IDs of listings that match the criteria.
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
    model: "gpt-4.1-mini",
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
  const keepIds = new Set(parsed.filtered.map((l) => l.id));
  const result = listings.filter((l) => keepIds.has(l.id));
  logger.info(`[filterListings] AI kept ${result.length} of ${listings.length} listings`);
  return result;
}

// You are filtering Facebook Marketplace guitar listings for Mike, a vintage guitar dealer at gilded-guitars.com.

// You will be given:
// - A listing image (cropped to the instrument)
// - The listing title: "{inputs.metadata.title}"
// - The listing id: "{inputs.metadata.id}"
// - The listing url: "{inputs.metadata.url}"
// - The listing price: "{inputs.metadata.price}"
// - The listing location: "{inputs.metadata.location}"
// - The listing primaryPhotoUri: "{inputs.metadata.primaryPhotoUri}"

// Your job: decide if Mike should SEND AN OFFER based ONLY on the image and title. Ignore price and location entirely — they are irrelevant to your decision.

// If the listing IS of interest, return ONLY this JSON object:
// {
//   "id": "{inputs.metadata.id}",
//   "url": "{inputs.metadata.url}",
//   "price": "{inputs.metadata.price}",
//   "title": "{inputs.metadata.title}",
//   "location": {inputs.metadata.location},
//   "primaryPhotoUri": "{inputs.metadata.primaryPhotoUri}"
// }

// If the listing is NOT of interest, return ONLY:
// null

// No explanation. No extra text. Just the JSON object or null.

// ## Core rule
// Return the listing object ONLY when the image and title together indicate a desirable vintage (or allowed early reissue) instrument with no clear disqualifiers. If you are unsure, return the listing object.

// ## RETURN LISTING when ALL apply
// 1) Instrument type:
// - Electric guitar or electric bass (not acoustic, not classical, not ukulele, not amp/pedals/parts)

// 2) Brand:
// - Fender, Gibson, or Guild
//   - If title says brand but image contradicts (or vice versa), prefer the image.

// 3) Era / model desirability:
// - Primary era: 1954–1982 (most Fender/Gibson/Guild electrics/basses)
// - Extended era allowed ONLY:
//   - Gibson Les Paul Custom (1982–1989 allowed; Alpine White especially good)
//   - Fender American Vintage Reissue (AVRI) allowed ONLY if 1982–1986 (exclude 1987+)

// 4) No explicit disqualifiers (see below)

// ## Fender models to treat as desirable
// Stratocaster, Telecaster, Jaguar, Jazzmaster, Mustang, Duo-Sonic, Musicmaster,
// Jazz Bass, Precision Bass, Tele Custom, Tele Deluxe

// ## Gibson models to treat as desirable
// Les Paul, Les Paul Custom, SG Special, SG Standard, ES series (ES-150, ES-175, ES-175D, ES-335, etc.), Firebird

// ## Guild models to treat as desirable
// Starfire, S-series (e.g., S-100), X-series (e.g., X-100), any Guild that appears 1960s-era

// ## Hard EXCLUDE (return null) if title OR image strongly suggests any of:
// - Year 1990+ (exclude anything 1990 onward)
// - Years 1983–1989 EXCEPT:
//   - Gibson Les Paul Custom (allowed)
//   - Fender AVRI 1982–1986 only (exclude 1987+)
// - Acoustic / hollow acoustic-like listing (unless clearly an ES-style electric hollowbody)
// - "Broken", "neck break", "headstock repair", "crack", "split", "repaired neck/headstock"
// - "Refinished", "refin", "repaint", "overspray"
// - Major structural damage or severe issues clearly visible
// - Not actually a full instrument (just neck/body/parts/case)

// ## Notes
// - Non-original or swapped parts are OK (do NOT exclude for mods alone).
// - If the title is vague ("guitar", "old guitar") but the image clearly shows a desirable Fender/Gibson/Guild electric/bass, return the listing object.
// - If you suspect a copy/tribute/"style of"/"replica"/"Chibson"/"partscaster", return null.

// Return ONLY valid JSON. No markdown, no code fences, no explanation. Just the raw JSON object or null.
