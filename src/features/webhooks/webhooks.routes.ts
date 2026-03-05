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
  "/needs-login",
  {
    operationId: "webhookNeedsLogin",
    summary: "Playwright container signals that human login is required",
    skipValidation: true,
  },
  WebhooksController.handleNeedsLogin,
);

webhookRouter.post(
  "/refresh",
  {
    operationId: "webhookRefresh",
    summary: "Refresh Facebook session data",
    skipValidation: true,
  },
  WebhooksController.handleRefresh,
);
