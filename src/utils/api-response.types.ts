import { z } from "zod";

/**
 * Every API response follows one of two shapes:
 *
 *   Success → { success: true,  data: T }
 *   Error   → { success: false, error: { code: string, message: string, details?: unknown } }
 *
 * The `success` discriminant lets the frontend narrow the type instantly.
 */

export const apiErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export function successResponse<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  });
}

export function errorResponse() {
  return z.object({
    success: z.literal(false),
    error: apiErrorBodySchema,
  });
}
