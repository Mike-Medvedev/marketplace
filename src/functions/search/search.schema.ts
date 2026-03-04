import { z } from "zod";

/** Zod schema for POST /scrape request body. All fields optional. No body or empty body defaults to {}. */
export const searchMarketPlaceParamsSchema = z
  .object({
    query: z.string().optional(),
    locationId: z.string().optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    radiusKm: z.coerce.number().optional(),
    minPrice: z.coerce.number().optional(),
    pageCount: z.coerce.number().optional(),
    pageDelayMs: z.coerce.number().optional(),
    listingFetchDelayMs: z.coerce.number().optional(),
  })
  .optional()
  .default({});

/** Listing shape returned by search (no photos/description). location = Facebook's reverse_geocode object (e.g. { city, state, city_page }). */
const scrapeListingSchema = z.object({
  id: z.string(),
  url: z.string(),
  price: z.string(),
  title: z.string(),
  location: z.record(z.string(), z.unknown()),
  primaryPhotoUri: z.string(),
});

/** Zod schema for POST /scrape response body. */
export const searchMarketPlaceResultSchema = z.object({
  listings: z.array(scrapeListingSchema),
});

export type SearchMarketPlaceParamsInput = z.infer<typeof searchMarketPlaceParamsSchema>;
export type SearchMarketPlaceResultOutput = z.infer<typeof searchMarketPlaceResultSchema>;
