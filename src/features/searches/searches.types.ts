import { z } from "zod";

export const dateListedOptionSchema = z.enum(["24h", "7d", "30d"]);

export const notificationMethodSchema = z.enum(["email", "sms", "webhook"]);

export const searchStatusSchema = z.enum(["running", "refresh", "error"]);

export const searchCriteriaSchema = z.object({
  query: z.string(),
  location: z.string(),
  minPrice: z.string(),
  maxPrice: z.string(),
  dateListed: dateListedOptionSchema,
});

export const monitoringSettingsSchema = z.object({
  frequency: z.string(),
  listingsPerCheck: z.number().int().min(1),
  notifications: z.array(notificationMethodSchema),
});

export const activeSearchSchema = z.object({
  id: z.string().uuid(),
  criteria: searchCriteriaSchema,
  settings: monitoringSettingsSchema,
  status: searchStatusSchema,
  lastRun: z.string().datetime().nullable(),
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
  id: z.string().uuid(),
});

export type ActiveSearch = z.infer<typeof activeSearchSchema>;
export type CreateSearchBody = z.infer<typeof createSearchBodySchema>;
export type UpdateSearchBody = z.infer<typeof updateSearchBodySchema>;

export type IdParams = { id: string };
