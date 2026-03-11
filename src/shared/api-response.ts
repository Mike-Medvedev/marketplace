import z from "zod";

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  statusCode: number;
  name: string;
  message: string;
  detail?: unknown;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export const SuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export const ErrorSchema = z.object({
  success: z.literal(false),
  statusCode: z.number(),
  name: z.string(),
  message: z.string(),
  detail: z.any().optional(),
});

export function SuccessApiResponse<T>(data: T): ApiSuccess<T> {
  return {
    success: true,
    data,
  };
}

export function ErrorApiResponse(statusCode: number, error: Error, detail?: unknown): ApiError {
  return {
    success: false,
    statusCode,
    name: error.name,
    message: error.message,
    ...(detail !== undefined && { detail }),
  };
}

// import type { Response } from "express";

// export { apiErrorBodySchema, successResponse, errorResponse } from "./api-response.types.ts";

// export function sendSuccess<T>(res: Response, data: T, status = 200): void {
//   res.status(status).json({ success: true, data });
// }

// export function sendError(
//   res: Response,
//   status: number,
//   code: string,
//   message: string,
//   details?: unknown,
// ): void {
//   res.status(status).json({
//     success: false,
//     error: { code, message, ...(details !== undefined && { details }) },
//   });
// }
