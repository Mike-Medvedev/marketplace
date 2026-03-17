import { z } from "zod";
import { listingSchema } from "@/features/searches/searches.types.ts";

export const analysisWebhookRequestSchema = z.object({
  searchId: z.uuid(),
  runId: z.uuid(),
  listings: z.array(listingSchema).min(1),
});

export const analysisWebhookResponseSchema = z.object({
  listings: z.array(listingSchema),
});

export type AnalysisWebhookRequest = z.infer<typeof analysisWebhookRequestSchema>;
export type AnalysisWebhookResponse = z.infer<typeof analysisWebhookResponseSchema>;
