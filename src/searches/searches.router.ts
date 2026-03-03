import express from "express";
import { TypedRouter } from "meebo";
import { z } from "zod";
import {
  activeSearchSchema,
  createSearchBodySchema,
  updateSearchBodySchema,
  searchIdParamsSchema,
} from "./searches.schema.ts";
import {
  handleGetSearches,
  handleGetSearchById,
  handleCreateSearch,
  handleUpdateSearch,
  handleDeleteSearch,
} from "./searches.routes.ts";

const notFoundSchema = z.object({ error: z.string() });

export const searchesRouter = TypedRouter(express.Router(), {
  tag: "Searches",
  basePath: "/searches",
});

searchesRouter.get(
  "/",
  {
    response: z.array(activeSearchSchema),
    summary: "List all saved searches",
  },
  (req, res, next) => {
    handleGetSearches(req, res).catch(next);
  },
);

searchesRouter.get(
  "/:id",
  {
    params: searchIdParamsSchema,
    response: activeSearchSchema,
    responses: { 404: notFoundSchema },
    summary: "Get a saved search by ID",
  },
  (req, res, next) => {
    handleGetSearchById(req, res).catch(next);
  },
);

searchesRouter.post(
  "/",
  {
    request: createSearchBodySchema,
    response: activeSearchSchema,
    summary: "Create a new saved search",
  },
  (req, res, next) => {
    handleCreateSearch(req, res).catch(next);
  },
);

searchesRouter.put(
  "/:id",
  {
    params: searchIdParamsSchema,
    request: updateSearchBodySchema,
    response: activeSearchSchema,
    responses: { 404: notFoundSchema },
    summary: "Update a saved search",
  },
  (req, res, next) => {
    handleUpdateSearch(req, res).catch(next);
  },
);

searchesRouter.delete(
  "/:id",
  {
    params: searchIdParamsSchema,
    response: z.object({}),
    responses: { 404: notFoundSchema },
    summary: "Delete a saved search",
  },
  (req, res, next) => {
    handleDeleteSearch(req, res).catch(next);
  },
);
