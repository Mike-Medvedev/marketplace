import express from "express";
import { TypedRouter } from "meebo";
import {
  analysisWebhookRequestSchema,
  analysisWebhookResponseSchema,
} from "@/features/analysis/analysis.types.ts";
import { WebhooksController } from "./webhooks.controller.ts";

export const webhookRouter = TypedRouter(express.Router(), {
  tag: "Webhooks",
  basePath: "/webhook",
});

webhookRouter.post(
  "/analyzed-listings",
  {
    operationId: "webhookAnalyzedListings",
    summary: "Receive analyzed listings from Roboflow",
    skipValidation: true,
  },
  WebhooksController.handleAnalyzedListings,
);

webhookRouter.post(
  "/roboflow-filter",
  {
    operationId: "webhookRoboflowFilter",
    summary: "Receive listings, run them through Roboflow analysis, and return filtered results",
    request: analysisWebhookRequestSchema,
    response: analysisWebhookResponseSchema,
  },
  WebhooksController.handleRoboflowFilter,
);

webhookRouter.post(
  "/refresh",
  {
    operationId: "webhookRefresh",
    summary: "Manually refresh Facebook session data",
    skipValidation: true,
  },
  WebhooksController.handleRefresh,
);
