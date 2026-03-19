import { read } from "@/infra/redis/redis.client.ts";
import { SearchNotFoundError } from "@/shared/errors/errors.ts";
import * as repository from "@/features/searches/searches.repository.ts";
import { filterListings } from "./filter.service.ts";
import type { RunIdParams } from "@/features/searches/searches.types.ts";
import type { Request, Response } from "express";

export const FilterController = {
  async handleAiFilter(req: Request<RunIdParams>, res: Response) {
    const { id: searchId, runId } = req.params;
    const { prompt } = req.body;

    const search = await repository.getSearchById(searchId, req.user!.id);
    if (!search) throw new SearchNotFoundError(searchId);

    const run = await repository.getRunById(runId, searchId);
    if (!run) throw new SearchNotFoundError(runId);

    const raw = await read(run.redisResultKey);
    const listings = raw ? JSON.parse(raw) : [];

    const filtered = await filterListings(listings, prompt);

    res.success({ listingIds: filtered.map((l) => l.id) });
  },
};
