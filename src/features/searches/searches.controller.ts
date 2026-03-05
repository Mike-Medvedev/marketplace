import logger from "@/logger/logger.ts";
import { SearchNotFoundError } from "@/errors/errors.ts";
import { sendSuccess } from "@/utils/api-response.ts";
import * as repository from "./searches.repository.ts";
import type { IdParams } from "./searches.types.ts";
import type { Request, Response } from "express";

export const SearchesController = {
  async handleGetSearches(_req: Request, res: Response) {
    const searches = await repository.getAllSearches();
    sendSuccess(res, searches);
  },

  async handleGetSearchById(req: Request<IdParams>, res: Response) {
    const search = await repository.getSearchById(req.params.id);
    if (!search) throw new SearchNotFoundError(req.params.id);
    sendSuccess(res, search);
  },

  async handleCreateSearch(req: Request, res: Response) {
    const search = await repository.createSearch(req.body);
    logger.info(`Search created: ${search.id} — "${search.criteria.query}"`);
    sendSuccess(res, search, 201);
  },

  async handleUpdateSearch(req: Request<IdParams>, res: Response) {
    const search = await repository.updateSearch(req.params.id, req.body);
    if (!search) throw new SearchNotFoundError(req.params.id);
    logger.info(`Search updated: ${search.id} — "${search.criteria.query}"`);
    sendSuccess(res, search);
  },

  async handleDeleteSearch(req: Request<IdParams>, res: Response) {
    const deleted = await repository.deleteSearch(req.params.id);
    if (!deleted) throw new SearchNotFoundError(req.params.id);
    logger.info(`Search deleted: ${req.params.id}`);
    sendSuccess(res, null);
  },
};
