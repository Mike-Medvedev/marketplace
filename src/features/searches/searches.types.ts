import { z } from "zod";
import { createSelectSchema, createInsertSchema, createUpdateSchema } from "drizzle-zod";
import {
  searches,
  searchRuns,
  searchStatusEnum,
  searchFrequencyEnum,
  notificationMethodEnum,
  dateListedOptionEnum,
  filterStatusEnum,
} from "@/infra/db/schema.ts";
import { SUPPORTED_COUNTRIES } from "./searches.constants.ts";

export const searchStatusSchema = createSelectSchema(searchStatusEnum);
export const searchFrequencySchema = createSelectSchema(searchFrequencyEnum);
export const notificationMethodSchema = createSelectSchema(notificationMethodEnum);
export const dateListedOptionSchema = createSelectSchema(dateListedOptionEnum);

export const storedSearchSchema = createSelectSchema(searches);

export const activeSearchSchema = storedSearchSchema.extend({
  isScheduled: z.boolean(),
  nextRunAt: z.string().nullable(),
});

const countrySchema = z.enum(SUPPORTED_COUNTRIES as [string, ...string[]]);

export const createSearchBodySchema = createInsertSchema(searches, {
  query: (schema) => schema.min(1),
  location: (schema) => schema.min(1).optional(),
  notificationTarget: (schema) => schema.min(1),
  listingsPerCheck: (schema) => schema.min(1).max(20),
  country: () => countrySchema.nullable().optional(),
  webhookFilterUrl: (schema) => schema.url().nullable().optional(),
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
  webhookFilterUrl: true,
  country: true,
}).refine(
  (data) => data.location || data.country,
  { message: "Either location or country is required", path: ["location"] },
).refine(
  (data) => !(data.prompt && data.webhookFilterUrl),
  { message: "Cannot set both prompt and webhookFilterUrl — choose one filter method", path: ["webhookFilterUrl"] },
);

export const updateSearchBodySchema = createUpdateSchema(searches, {
  listingsPerCheck: (schema) => schema.max(20),
  country: () => countrySchema.nullable().optional(),
  webhookFilterUrl: (schema) => schema.url().nullable().optional(),
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
  webhookFilterUrl: true,
  status: true,
  country: true,
}).refine(
  (data) => !(data.prompt && data.webhookFilterUrl),
  { message: "Cannot set both prompt and webhookFilterUrl — choose one filter method", path: ["webhookFilterUrl"] },
);

export const searchIdParamsSchema = z.object({
  id: z.uuid(),
});

export const searchRunParamsSchema = z.object({
  id: z.uuid(),
  runId: z.uuid(),
});

export const filterStatusSchema = createSelectSchema(filterStatusEnum);

export const searchRunSchema = createSelectSchema(searchRuns).omit({
  redisResultKey: true,
  filteredRedisResultKey: true,
});

export const listingSchema = z.object({
  id: z.string(),
  url: z.string(),
  price: z.string(),
  title: z.string(),
  location: z.record(z.string(), z.unknown()).nullable(),
  primaryPhotoUri: z.string(),
});

export const searchRunResultsSchema = z.object({
  runId: z.uuid(),
  executedAt: z.union([z.string(), z.date()]),
  filterStatus: filterStatusSchema,
  listings: z.array(listingSchema),
  filteredListings: z.array(listingSchema).nullable(),
  sessionExpired: z.boolean(),
});

export type FilterStatus = z.infer<typeof filterStatusSchema>;
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
  | { type: "completed"; searchId: string; runId: string; listingCount: number; sessionExpired: boolean }
  | { type: "filter_completed"; searchId: string; runId: string; filteredListingCount: number }
  | { type: "filter_failed"; searchId: string; runId: string; error: string }
  | { type: "failed"; searchId: string; error: string; errorName: string };

export type IdParams = { id: string };
export type RunIdParams = { id: string; runId: string };
