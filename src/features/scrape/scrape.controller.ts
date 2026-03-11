import { searchMarketPlace } from "./scrape.service.ts";
import { parseScrapeBody } from "./scrape.utils.ts";
import logger from "@/infra/logger/logger.ts";
import type { Request, Response } from "express";

export const ScrapeController = {
  async handleScrape(req: Request, res: Response) {
    logger.info("Request received, kicking off marketplace search...");
    const params = parseScrapeBody(req.body);
    const { listings } = await searchMarketPlace(params, req.user!.id);
    res.success({ listings });
  },
};
