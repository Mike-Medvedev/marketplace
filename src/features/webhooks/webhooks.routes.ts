import express from "express";
import { TypedRouter } from "meebo";
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
  "/status-update",
  {
    operationId: "webhookStatusUpdate",
    summary: "Playwright container sends sync progress updates for SSE clients",
    skipValidation: true,
  },
  WebhooksController.handleStatusUpdate,
);

webhookRouter.post(
  "/container-exited",
  {
    operationId: "webhookContainerExited",
    summary: "Playwright container reports an error or unexpected exit",
    skipValidation: true,
  },
  WebhooksController.handleContainerExited,
);

webhookRouter.post(
  "/refresh",
  {
    operationId: "webhookRefresh",
    summary: "Refresh Facebook session data (includes userId from Playwright or Redis)",
    skipValidation: true,
  },
  WebhooksController.handleRefresh,
);

webhookRouter.get(
  "/sync-context",
  {
    operationId: "getSyncContext",
    summary: "Get the active sync context (userId) for the Playwright container",
    skipValidation: true,
  },
  WebhooksController.handleSyncContext,
);
