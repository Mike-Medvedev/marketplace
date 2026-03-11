import logger from "@/infra/logger/logger.ts";
import { SearchNotFoundError } from "@/shared/errors/errors.ts";
import * as service from "./searches.service.ts";
import type { IdParams, RunIdParams } from "./searches.types.ts";
import type { Request, Response } from "express";

export const SearchesController = {
  async handleGetSearches(req: Request, res: Response) {
    const searches = await service.getAllSearches(req.user!.id);
    res.success(searches);
  },

  async handleGetSearchById(req: Request<IdParams>, res: Response) {
    const search = await service.getSearchById(req.params.id, req.user!.id);
    if (!search) throw new SearchNotFoundError(req.params.id);
    res.success(search);
  },

  async handleCreateSearch(req: Request, res: Response) {
    const search = await service.createSearch(req.user!.id, req.body);
    logger.info(`Search created & scheduled: ${search.id} — "${search.query}"`);
    res.success(search, 201);
  },

  async handleUpdateSearch(req: Request<IdParams>, res: Response) {
    const search = await service.updateSearch(req.params.id, req.user!.id, req.body);
    if (!search) throw new SearchNotFoundError(req.params.id);
    logger.info(`Search updated & rescheduled: ${search.id} — "${search.query}"`);
    res.success(search);
  },

  async handleDeleteSearch(req: Request<IdParams>, res: Response) {
    const deleted = await service.deleteSearch(req.params.id, req.user!.id);
    if (!deleted) throw new SearchNotFoundError(req.params.id);
    logger.info(`Search deleted & unscheduled: ${req.params.id}`);
    res.success(null);
  },

  async handleGetSearchRuns(req: Request<IdParams>, res: Response) {
    const runs = await service.getSearchRuns(req.params.id, req.user!.id);
    res.success(runs);
  },

  async handleGetSearchRunResults(req: Request<RunIdParams>, res: Response) {
    const results = await service.getSearchRunResults(req.params.id, req.params.runId, req.user!.id);
    if (!results) throw new SearchNotFoundError(req.params.runId);
    res.success(results);
  },
};
