import express from "express";
import { TypedRouter } from "meebo";
import { z } from "zod";
import { successResponse, errorResponse } from "@/api-response.ts";
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
  (req, res, next) => {
    handleGetSearches(req, res).catch(next);
  },
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
  (req, res, next) => {
    handleGetSearchById(req, res).catch(next);
  },
);

searchesRouter.post(
  "/",
  {
    operationId: "createSearch",
    request: createSearchBodySchema,
    response: successResponse(activeSearchSchema),
    summary: "Create a new saved search",
  },
  (req, res, next) => {
    handleCreateSearch(req, res).catch(next);
  },
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
  (req, res, next) => {
    handleUpdateSearch(req, res).catch(next);
  },
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
  (req, res, next) => {
    handleDeleteSearch(req, res).catch(next);
  },
);
