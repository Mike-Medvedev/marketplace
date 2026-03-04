import logger from "@/logger/logger.ts";
import { SearchNotFoundError } from "@/errors/errors.ts";
import { sendSuccess } from "@/api-response.ts";
import * as store from "./searches.store.ts";
import type { Request, Response } from "express";

type IdParams = { id: string };

export async function handleGetSearches(_req: Request, res: Response): Promise<void> {
  const searches = await store.getAllSearches();
  sendSuccess(res, searches);
}

export async function handleGetSearchById(req: Request<IdParams>, res: Response): Promise<void> {
  const search = await store.getSearchById(req.params.id);
  if (!search) throw new SearchNotFoundError(req.params.id);
  sendSuccess(res, search);
}

export async function handleCreateSearch(req: Request, res: Response): Promise<void> {
  const search = await store.createSearch(req.body);
  logger.info(`Search created: ${search.id} — "${search.criteria.query}"`);
  sendSuccess(res, search, 201);
}

export async function handleUpdateSearch(req: Request<IdParams>, res: Response): Promise<void> {
  const search = await store.updateSearch(req.params.id, req.body);
  if (!search) throw new SearchNotFoundError(req.params.id);
  logger.info(`Search updated: ${search.id} — "${search.criteria.query}"`);
  sendSuccess(res, search);
}

export async function handleDeleteSearch(req: Request<IdParams>, res: Response): Promise<void> {
  const deleted = await store.deleteSearch(req.params.id);
  if (!deleted) throw new SearchNotFoundError(req.params.id);
  logger.info(`Search deleted: ${req.params.id}`);
  sendSuccess(res, null);
}
