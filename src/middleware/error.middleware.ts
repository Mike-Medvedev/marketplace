import {
  AnonTokenScrapeError,
  DatabaseResourceNotFoundError,
  DuplicateSearchError,
  FacebookRateLimitError,
  FacebookSessionExpiredError,
  FetchListingDescriptionError,
  FetchListingPhotosError,
  GeocodingError,
  MissingTokenError,
  NoActiveSyncError,
  NotificationError,
  SchedulerError,
  SearchMarketPlaceError,
  SearchNotFoundError,
  SessionNotLoadedError,
  UnauthorizedDatabaseRequestError,
} from "@/shared/errors/errors";
import { triggerAutoResync } from "@/features/sync/sync.service.ts";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { APIError } from "openai";
import logger from "@/infra/logger/logger";
import type { ErrorRequestHandler, Request, Response, NextFunction } from "express";

const errorHandler: ErrorRequestHandler = function (
  error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof DatabaseResourceNotFoundError) {
    logger.warn(error.message);
    return res.error(404, error);
  }
  if (error instanceof UnauthorizedDatabaseRequestError) {
    logger.warn(error.message);
    return res.error(403, error);
  }
  if (error instanceof MissingTokenError) {
    logger.warn(error.message);
    return res.error(401, error);
  }
  if (error instanceof GeocodingError) {
    logger.warn(error.message);
    return res.error(400, error);
  }
  if (error instanceof SearchNotFoundError) {
    logger.warn(error.message);
    return res.error(404, error);
  }
  if (error instanceof DuplicateSearchError) {
    logger.warn(error.message);
    return res.error(409, error);
  }
  if (error instanceof SessionNotLoadedError) {
    logger.warn(error.message);
    return res.error(503, error);
  }
  if (error instanceof NoActiveSyncError) {
    logger.warn(error.message);
    return res.error(409, error);
  }
  if (error instanceof AnonTokenScrapeError) {
    logger.warn(`[anon] ${error.message}`);
    return res.error(502, error);
  }
  if (error instanceof FacebookRateLimitError) {
    logger.warn(`[rate-limit] Facebook error code ${error.facebookErrorCode}: ${error.message}`);
    return res.error(429, error);
  }
  if (error instanceof FacebookSessionExpiredError) {
    logger.warn(error.message);
    const userId = req.user?.id;
    if (userId) {
      triggerAutoResync(userId).catch((err) => {
        logger.error("[error-middleware] Auto-resync failed:", err);
      });
    }
    return res.error(401, error);
  }
  if (error instanceof SearchMarketPlaceError) {
    logger.error(error);
    return res.error(500, error);
  }
  if (error instanceof FetchListingPhotosError) {
    logger.error(error);
    return res.error(500, error);
  }
  if (error instanceof FetchListingDescriptionError) {
    logger.error(error);
    return res.error(500, error);
  }
  if (error instanceof SchedulerError) {
    logger.error(error);
    return res.error(500, error);
  }
  if (error instanceof NotificationError) {
    logger.error(error);
    return res.error(500, error);
  }
  if (error instanceof APIError) {
    logger.error(error);
    return res.error(500, error);
  }
  if (error instanceof DrizzleQueryError) {
    logger.error("Database query failed", {
      query: error.query,
      params: error.params,
      cause: error.cause,
    });
    return res.error(500, new Error("A database error occurred. Please try again later."));
  }

  logger.error(error);
  return res.error(500, new Error("An unexpected error occurred"));
};

export default errorHandler;
