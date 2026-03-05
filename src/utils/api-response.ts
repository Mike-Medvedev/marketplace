import type { Response } from "express";

export { apiErrorBodySchema, successResponse, errorResponse } from "./api-response.types.ts";

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
