import {
  EmailError,
  FetchListingDescriptionError,
  FetchListingPhotosError,
  SearchMarketPlaceError,
  SessionNotLoadedError,
} from "@/errors/errors";
import { APIError } from "openai";
import logger from "@/logger/logger";
import type { ErrorRequestHandler, Request, Response, NextFunction } from "express";
const errorHandler: ErrorRequestHandler = function (
  error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof SearchMarketPlaceError) {
    logger.error(error);
    res.sendStatus(500);
    return;
  }
  if (error instanceof FetchListingPhotosError) {
    logger.error(error);
    res.sendStatus(500);
    return;
  }
  if (error instanceof FetchListingDescriptionError) {
    logger.error(error);
    res.sendStatus(500);
    return;
  }
  if (error instanceof EmailError) {
    logger.error(error);
    res.sendStatus(500);
    return;
  }
  if (error instanceof SessionNotLoadedError) {
    logger.warn(error.message);
    res.status(503).json({
      error: error.message,
      hint: "POST session data to /webhook/refresh first.",
    });
    return;
  }
  if (error instanceof APIError) {
    logger.error(error);
    res.sendStatus(500);
    return;
  }

  logger.error(error);
  res.sendStatus(500);
};

export default errorHandler;
