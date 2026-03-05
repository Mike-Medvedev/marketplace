import { z } from "zod";

export const dateListedOptionSchema = z.enum(["24h", "7d", "30d"]);

export const notificationMethodSchema = z.enum(["email", "sms", "webhook"]);

export const searchFrequencySchema = z.enum([
  "every_1h",
  "every_2h",
  "every_6h",
  "every_12h",
  "every_24h",
]);

export const searchStatusSchema = z.enum(["running", "refresh", "error", "needs_attention"]);

export const searchCriteriaSchema = z.object({
  query: z.string(),
  location: z.string(),
  minPrice: z.string(),
  maxPrice: z.string(),
  dateListed: dateListedOptionSchema,
});

export const monitoringSettingsSchema = z.object({
  frequency: searchFrequencySchema,
  listingsPerCheck: z.number().int().min(1),
  notificationType: notificationMethodSchema,
  notificationTarget: z.string().min(1),
});

export const storedSearchSchema = z.object({
  id: z.uuid(),
  criteria: searchCriteriaSchema,
  settings: monitoringSettingsSchema,
  status: searchStatusSchema,
  lastRun: z.iso.datetime().nullable(),
});

export const activeSearchSchema = storedSearchSchema.extend({
  isScheduled: z.boolean(),
  nextRunAt: z.iso.datetime().nullable(),
});

export const createSearchBodySchema = z.object({
  criteria: searchCriteriaSchema,
  settings: monitoringSettingsSchema,
});

export const updateSearchBodySchema = z.object({
  criteria: searchCriteriaSchema,
  settings: monitoringSettingsSchema,
});

export const searchIdParamsSchema = z.object({
  id: z.uuid(),
});

export type SearchFrequency = z.infer<typeof searchFrequencySchema>;
export type NotificationMethod = z.infer<typeof notificationMethodSchema>;
export type StoredSearch = z.infer<typeof storedSearchSchema>;
export type ActiveSearch = z.infer<typeof activeSearchSchema>;
export type CreateSearchBody = z.infer<typeof createSearchBodySchema>;
export type UpdateSearchBody = z.infer<typeof updateSearchBodySchema>;

export type IdParams = { id: string };
