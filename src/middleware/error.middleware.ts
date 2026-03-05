import {
  EmailNotVerifiedError,
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
  UnauthorizedError,
  UserAlreadyExistsError,
  VerificationTokenExpiredError,
} from "@/errors/errors.ts";
import { sendError } from "@/utils/api-response.ts";
import { triggerAutoResync } from "@/features/sync/sync.service.ts";
import { APIError } from "openai";
import logger from "@/logger/logger.ts";
import type { ErrorRequestHandler, Request, Response, NextFunction } from "express";

const errorHandler: ErrorRequestHandler = function (
  error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof UnauthorizedError) {
    logger.warn(error.message);
    sendError(res, 401, "UNAUTHORIZED", error.message);
    return;
  }
  if (error instanceof InvalidCredentialsError) {
    logger.warn(error.message);
    sendError(res, 401, "INVALID_CREDENTIALS", error.message);
    return;
  }
  if (error instanceof UserAlreadyExistsError) {
    logger.warn(error.message);
    sendError(res, 409, "USER_ALREADY_EXISTS", error.message);
    return;
  }
  if (error instanceof EmailNotVerifiedError) {
    logger.warn(error.message);
    sendError(res, 403, "EMAIL_NOT_VERIFIED", error.message);
    return;
  }
  if (error instanceof VerificationTokenExpiredError) {
    logger.warn(error.message);
    sendError(res, 400, "VERIFICATION_TOKEN_EXPIRED", error.message);
    return;
  }
  if (error instanceof GeocodingError) {
    logger.warn(error.message);
    sendError(res, 400, "GEOCODING_ERROR", error.message);
    return;
  }
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
    triggerAutoResync().catch((err) => {
      logger.error("[error-middleware] Auto-resync failed:", err);
    });
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
  if (error instanceof SchedulerError) {
    logger.error(error);
    sendError(res, 500, "SCHEDULER_ERROR", error.message);
    return;
  }
  if (error instanceof NotificationError) {
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
