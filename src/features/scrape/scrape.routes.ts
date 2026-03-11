import express from "express";
import { TypedRouter } from "meebo";
import { successResponse } from "@/shared/api-response.ts";
import { searchMarketPlaceParamsSchema, searchMarketPlaceResultSchema } from "./scrape.types.ts";
import { ScrapeController } from "./scrape.controller.ts";

export const scrapeRouter = TypedRouter(express.Router(), {
  tag: "Scrape",
  basePath: "/api/v1",
});

scrapeRouter.post(
  "/scrape",
  {
    operationId: "postScrape",
    request: searchMarketPlaceParamsSchema,
    response: successResponse(searchMarketPlaceResultSchema),
    summary: "Searches Marketplace and returns listings",
  },
  ScrapeController.handleScrape,
);
