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
  },
  WebhooksController.handleAnalyzedListings,
);

webhookRouter.post(
  "/needs-login",
  {
    operationId: "webhookNeedsLogin",
    summary: "Playwright container signals that human login is required",
  },
  WebhooksController.handleNeedsLogin,
);

webhookRouter.post(
  "/refresh",
  {
    operationId: "webhookRefresh",
    summary: "Refresh Facebook session data",
  },
  WebhooksController.handleRefresh,
);
