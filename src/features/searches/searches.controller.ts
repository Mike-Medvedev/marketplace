import logger from "@/logger/logger.ts";
import { SearchNotFoundError } from "@/errors/errors.ts";
import { sendSuccess } from "@/utils/api-response.ts";
import * as service from "./searches.service.ts";
import type { IdParams } from "./searches.types.ts";
import type { Request, Response } from "express";

export const SearchesController = {
  async handleGetSearches(_req: Request, res: Response) {
    const searches = await service.getAllSearches();
    sendSuccess(res, searches);
  },

  async handleGetSearchById(req: Request<IdParams>, res: Response) {
    const search = await service.getSearchById(req.params.id);
    if (!search) throw new SearchNotFoundError(req.params.id);
    sendSuccess(res, search);
  },

  async handleCreateSearch(req: Request, res: Response) {
    const search = await service.createSearch(req.body);
    logger.info(`Search created & scheduled: ${search.id} — "${search.criteria.query}"`);
    sendSuccess(res, search, 201);
  },

  async handleUpdateSearch(req: Request<IdParams>, res: Response) {
    const search = await service.updateSearch(req.params.id, req.body);
    if (!search) throw new SearchNotFoundError(req.params.id);
    logger.info(`Search updated & rescheduled: ${search.id} — "${search.criteria.query}"`);
    sendSuccess(res, search);
  },

  async handleDeleteSearch(req: Request<IdParams>, res: Response) {
    const deleted = await service.deleteSearch(req.params.id);
    if (!deleted) throw new SearchNotFoundError(req.params.id);
    logger.info(`Search deleted & unscheduled: ${req.params.id}`);
    sendSuccess(res, null);
  },
};
