import express from "express";
import { TypedRouter } from "meebo";
import { z } from "zod";
import { SuccessSchema, ErrorSchema } from "@/shared/api-response.ts";
import {
  activeSearchSchema,
  createSearchBodySchema,
  updateSearchBodySchema,
  searchIdParamsSchema,
  searchRunParamsSchema,
  searchRunSchema,
  searchRunResultsSchema,
} from "./searches.types.ts";
import { SearchesController } from "./searches.controller.ts";

export const searchesRouter = TypedRouter(express.Router(), {
  tag: "Searches",
  basePath: "/api/v1/searches",
});

searchesRouter.get(
  "/",
  {
    operationId: "getSearches",
    response: SuccessSchema(z.array(activeSearchSchema)),
    responses: { 500: ErrorSchema },
    summary: "List all saved searches for the authenticated user",
  },
  SearchesController.handleGetSearches,
);

searchesRouter.get(
  "/:id",
  {
    operationId: "getSearchById",
    params: searchIdParamsSchema,
    response: SuccessSchema(activeSearchSchema),
    responses: { 404: ErrorSchema },
    summary: "Get a saved search by ID",
  },
  SearchesController.handleGetSearchById,
);

searchesRouter.post(
  "/",
  {
    operationId: "createSearch",
    request: createSearchBodySchema,
    response: SuccessSchema(activeSearchSchema),
    summary: "Create a new saved search",
  },
  SearchesController.handleCreateSearch,
);

searchesRouter.put(
  "/:id",
  {
    operationId: "updateSearch",
    params: searchIdParamsSchema,
    request: updateSearchBodySchema,
    response: SuccessSchema(activeSearchSchema),
    responses: { 404: ErrorSchema },
    summary: "Update a saved search",
  },
  SearchesController.handleUpdateSearch,
);

searchesRouter.delete(
  "/:id",
  {
    operationId: "deleteSearch",
    params: searchIdParamsSchema,
    response: SuccessSchema(z.null()),
    responses: { 404: ErrorSchema },
    summary: "Delete a saved search",
  },
  SearchesController.handleDeleteSearch,
);

searchesRouter.post(
  "/:id/execute",
  {
    operationId: "executeSearch",
    params: searchIdParamsSchema,
    response: SuccessSchema(searchRunResultsSchema),
    responses: { 404: ErrorSchema },
    summary: "Manually execute a saved search, creating a run with stored results",
  },
  SearchesController.handleExecuteSearch,
);

searchesRouter.get(
  "/:id/events",
  {
    operationId: "getSearchEvents",
    params: searchIdParamsSchema,
    responses: { 404: ErrorSchema },
    summary: "SSE stream of real-time search execution events (executing, completed, failed)",
  },
  SearchesController.handleSearchEvents,
);

searchesRouter.get(
  "/:id/runs",
  {
    operationId: "getSearchRuns",
    params: searchIdParamsSchema,
    response: SuccessSchema(z.array(searchRunSchema)),
    responses: { 404: ErrorSchema },
    summary: "List all runs for a saved search, ordered by most recent first",
  },
  SearchesController.handleGetSearchRuns,
);

searchesRouter.get(
  "/:id/runs/:runId/results",
  {
    operationId: "getSearchRunResults",
    params: searchRunParamsSchema,
    response: SuccessSchema(searchRunResultsSchema),
    responses: { 404: ErrorSchema },
    summary: "Get the listing results for a specific search run (from cache)",
  },
  SearchesController.handleGetSearchRunResults,
);
