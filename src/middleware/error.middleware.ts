import {
  DatabaseResourceNotFoundError,
  EmailNotVerifiedError,
  FacebookRateLimitError,
  FacebookSessionExpiredError,
  FetchListingDescriptionError,
  FetchListingPhotosError,
  GeocodingError,
  InvalidCredentialsError,
  NotificationError,
  SchedulerError,
  SearchMarketPlaceError,
  SearchNotFoundError,
  SessionNotLoadedError,
  UnauthorizedDatabaseRequestError,
  UnauthorizedError,
  UserAlreadyExistsError,
  VerificationTokenExpiredError,
} from "@/shared/errors/errors";
import { triggerAutoResync } from "@/features/sync/sync.service.ts";
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
    req.log.error(error);
    return res.error(404, error);
  }
  if (error instanceof UnauthorizedDatabaseRequestError) {
    req.log.error(error);
    return res.error(403, error);
  }
  if (error instanceof UnauthorizedError) {
    logger.warn(error.message);
    return res.error(401, error);
  }
  if (error instanceof InvalidCredentialsError) {
    logger.warn(error.message);
    return res.error(401, error);
  }
  if (error instanceof UserAlreadyExistsError) {
    logger.warn(error.message);
    return res.error(409, error);
  }
  if (error instanceof EmailNotVerifiedError) {
    logger.warn(error.message);
    return res.error(403, error);
  }
  if (error instanceof VerificationTokenExpiredError) {
    logger.warn(error.message);
    return res.error(400, error);
  }
  if (error instanceof GeocodingError) {
    logger.warn(error.message);
    return res.error(400, error);
  }
  if (error instanceof SearchNotFoundError) {
    logger.warn(error.message);
    return res.error(404, error);
  }
  if (error instanceof SessionNotLoadedError) {
    logger.warn(error.message);
    return res.error(503, error);
  }
  if (error instanceof FacebookRateLimitError) {
    logger.warn(`[rate-limit] Facebook error code ${error.facebookErrorCode}: ${error.message}`);
    return res.error(429, error);
  }
  if (error instanceof FacebookSessionExpiredError) {
    logger.warn(error.message);
    triggerAutoResync().catch((err) => {
      logger.error("[error-middleware] Auto-resync failed:", err);
    });
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

  logger.error(error);
  const message = error instanceof Error ? error.message : "An unexpected error occurred";
  return res.error(500, new Error(message));
};

export default errorHandler;
