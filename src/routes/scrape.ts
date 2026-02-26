import { searchMarketPlace } from "@/functions";
import { parseScrapeBody } from "@/scrape/parse-scrape-body";
import logger from "@/logger/logger";
import type { Request, Response } from "express";

/**
 * Fetches facebook marketplace listings. Accepts optional JSON body with search params:
 * query, locationId, latitude, longitude, radiusKm, minPrice, pageCount, pageDelayMs,
 * listingFetchDelayMs, cursor.
 */
export async function handleScrape(req: Request, res: Response): Promise<void> {
  logger.info("Request recieved, kicking off marketplace search...");
  const params = parseScrapeBody(req.body);
  const { listings } = await searchMarketPlace(params);
  res.status(200).json({ listings });
}
