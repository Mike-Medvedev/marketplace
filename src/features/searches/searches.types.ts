import { z } from "zod";
import { createSelectSchema, createInsertSchema, createUpdateSchema } from "drizzle-zod";
import {
  searches,
  searchRuns,
  searchStatusEnum,
  searchFrequencyEnum,
  notificationMethodEnum,
  dateListedOptionEnum,
} from "@/infra/db/schema.ts";

export const searchStatusSchema = createSelectSchema(searchStatusEnum);
export const searchFrequencySchema = createSelectSchema(searchFrequencyEnum);
export const notificationMethodSchema = createSelectSchema(notificationMethodEnum);
export const dateListedOptionSchema = createSelectSchema(dateListedOptionEnum);

export const storedSearchSchema = createSelectSchema(searches);

export const activeSearchSchema = storedSearchSchema.extend({
  isScheduled: z.boolean(),
  nextRunAt: z.string().nullable(),
});

export const createSearchBodySchema = createInsertSchema(searches, {
  query: (schema) => schema.min(1),
  location: (schema) => schema.min(1),
  notificationTarget: (schema) => schema.min(1),
  listingsPerCheck: (schema) => schema.min(1),
}).pick({
  query: true,
  location: true,
  minPrice: true,
  maxPrice: true,
  dateListed: true,
  frequency: true,
  listingsPerCheck: true,
  notificationType: true,
  notificationTarget: true,
  prompt: true,
});

export const updateSearchBodySchema = createUpdateSchema(searches).pick({
  query: true,
  location: true,
  minPrice: true,
  maxPrice: true,
  dateListed: true,
  frequency: true,
  listingsPerCheck: true,
  notificationType: true,
  notificationTarget: true,
  prompt: true,
  status: true,
});

export const searchIdParamsSchema = z.object({
  id: z.uuid(),
});

export const searchRunParamsSchema = z.object({
  id: z.uuid(),
  runId: z.uuid(),
});

export const searchRunSchema = createSelectSchema(searchRuns).omit({
  redisResultKey: true,
});

const listingSchema = z.object({
  id: z.string(),
  url: z.string(),
  price: z.string(),
  title: z.string(),
  location: z.record(z.string(), z.unknown()).nullable(),
  primaryPhotoUri: z.string(),
});

export const searchRunResultsSchema = z.object({
  runId: z.string().uuid(),
  executedAt: z.union([z.string(), z.date()]),
  listings: z.array(listingSchema),
});

export type SearchFrequency = z.infer<typeof searchFrequencySchema>;
export type NotificationMethod = z.infer<typeof notificationMethodSchema>;
export type StoredSearch = z.infer<typeof storedSearchSchema>;
export type ActiveSearch = z.infer<typeof activeSearchSchema>;
export type CreateSearchBody = z.infer<typeof createSearchBodySchema>;
export type UpdateSearchBody = z.infer<typeof updateSearchBodySchema>;
export type SearchRun = z.infer<typeof searchRunSchema>;
export type SearchRunResults = z.infer<typeof searchRunResultsSchema>;
export type SearchEvent =
  | { type: "executing"; searchId: string }
  | { type: "completed"; searchId: string; runId: string; listingCount: number }
  | { type: "failed"; searchId: string; error: string; errorName: string };

export type IdParams = { id: string };
export type RunIdParams = { id: string; runId: string };
