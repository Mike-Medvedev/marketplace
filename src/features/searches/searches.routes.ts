import express from "express";
import { TypedRouter } from "meebo";
import { z } from "zod";
import { successResponse, errorResponse } from "@/shared/api-response.ts";
import {
  activeSearchSchema,
  createSearchBodySchema,
  updateSearchBodySchema,
  searchIdParamsSchema,
} from "./searches.types.ts";
import { SearchesController } from "./searches.controller.ts";

const errResponse = errorResponse();

export const searchesRouter = TypedRouter(express.Router(), {
  tag: "Searches",
  basePath: "/api/v1/searches",
});

searchesRouter.get(
  "/",
  {
    operationId: "getSearches",
    response: successResponse(z.array(activeSearchSchema)),
    responses: { 500: errResponse },
    summary: "List all saved searches",
  },
  SearchesController.handleGetSearches,
);

searchesRouter.get(
  "/:id",
  {
    operationId: "getSearchById",
    params: searchIdParamsSchema,
    response: successResponse(activeSearchSchema),
    responses: { 404: errResponse },
    summary: "Get a saved search by ID",
  },
  SearchesController.handleGetSearchById,
);

searchesRouter.post(
  "/",
  {
    operationId: "createSearch",
    request: createSearchBodySchema,
    response: successResponse(activeSearchSchema),
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
    response: successResponse(activeSearchSchema),
    responses: { 404: errResponse },
    summary: "Update a saved search",
  },
  SearchesController.handleUpdateSearch,
);

searchesRouter.delete(
  "/:id",
  {
    operationId: "deleteSearch",
    params: searchIdParamsSchema,
    response: successResponse(z.null()),
    responses: { 404: errResponse },
    summary: "Delete a saved search",
  },
  SearchesController.handleDeleteSearch,
);
