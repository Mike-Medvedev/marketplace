import {
  FetchListingDescriptionError,
  FetchListingPhotosError,
  SearchMarketPlaceError,
} from "@/errors/errors";
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
  }
  if (error instanceof FetchListingPhotosError) {
    logger.error(error);
    res.sendStatus(500);
  }
  if (error instanceof FetchListingDescriptionError) {
    logger.error(error);
    res.sendStatus(500);
  } else {
    logger.error(error);
    res.sendStatus(500);
  }
};

export default errorHandler;
