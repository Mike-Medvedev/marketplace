import { searchMarketPlace } from "./scrape.service.ts";
import { parseScrapeBody } from "./scrape.utils.ts";
import { sendSuccess } from "@/shared/api-response.ts";
import logger from "@/infra/logger/logger.ts";
import type { Request, Response } from "express";

export const ScrapeController = {
  async handleScrape(req: Request, res: Response) {
    logger.info("Request recieved, kicking off marketplace search...");
    const params = parseScrapeBody(req.body);
    const { listings } = await searchMarketPlace(params);
    sendSuccess(res, { listings });
  },
};
