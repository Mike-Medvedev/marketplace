import { z } from "zod";
import type { Response } from "express";

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

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  res.status(status).json({
    success: false,
    error: { code, message, ...(details !== undefined && { details }) },
  });
}
