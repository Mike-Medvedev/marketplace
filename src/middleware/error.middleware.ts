import {
  FacebookSessionExpiredError,
  FetchListingDescriptionError,
  FetchListingPhotosError,
  NtfyError,
  SearchMarketPlaceError,
  SearchNotFoundError,
  SessionNotLoadedError,
} from "@/errors/errors";
import { sendError } from "@/api-response";
import { APIError } from "openai";
import logger from "@/logger/logger";
import type { ErrorRequestHandler, Request, Response, NextFunction } from "express";

const errorHandler: ErrorRequestHandler = function (
  error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof SearchNotFoundError) {
    logger.warn(error.message);
    sendError(res, 404, "NOT_FOUND", error.message);
    return;
  }
  if (error instanceof SessionNotLoadedError) {
    logger.warn(error.message);
    sendError(res, 503, "SESSION_NOT_LOADED", error.message);
    return;
  }
  if (error instanceof FacebookSessionExpiredError) {
    logger.warn(error.message);
    sendError(res, 401, "FACEBOOK_SESSION_EXPIRED", error.message);
    return;
  }
  if (error instanceof SearchMarketPlaceError) {
    logger.error(error);
    sendError(res, 500, "SEARCH_MARKETPLACE_ERROR", error.message);
    return;
  }
  if (error instanceof FetchListingPhotosError) {
    logger.error(error);
    sendError(res, 500, "FETCH_PHOTOS_ERROR", error.message);
    return;
  }
  if (error instanceof FetchListingDescriptionError) {
    logger.error(error);
    sendError(res, 500, "FETCH_DESCRIPTION_ERROR", error.message);
    return;
  }
  if (error instanceof NtfyError) {
    logger.error(error);
    sendError(res, 500, "NOTIFICATION_ERROR", error.message);
    return;
  }
  if (error instanceof APIError) {
    logger.error(error);
    sendError(res, 500, "OPENAI_ERROR", error.message);
    return;
  }

  logger.error(error);
  const message = error instanceof Error ? error.message : "An unexpected error occurred";
  sendError(res, 500, "INTERNAL_ERROR", message);
};

export default errorHandler;
