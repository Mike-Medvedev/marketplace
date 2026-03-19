import { z } from "zod";

export const ListingsModel = z.object({
  filtered: z.array(
    z.object({
      id: z.string(),
    }),
  ),
});

export const aiFilterRequestSchema = z.object({
  prompt: z.string().min(1),
});

export const aiFilterResponseSchema = z.object({
  listingIds: z.array(z.string()),
});

export type AiFilterRequest = z.infer<typeof aiFilterRequestSchema>;
export type AiFilterResponse = z.infer<typeof aiFilterResponseSchema>;
