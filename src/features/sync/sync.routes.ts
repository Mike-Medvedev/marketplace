import express from "express";
import { TypedRouter } from "meebo";
import { SyncController } from "./sync.controller.ts";

export const syncRouter = TypedRouter(express.Router(), {
  tag: "Sync",
  basePath: "/api/v1",
});

syncRouter.get(
  "/sync",
  {
    operationId: "beginIdentitySync",
    summary: "Start identity sync via SSE — spins up ACI Playwright container and streams status",
    skipValidation: true,
  },
  SyncController.beginIdentitySync,
);

syncRouter.post(
  "/sync/abort",
  {
    operationId: "abortSync",
    summary: "Abort an in-progress identity sync — stops the ACI container and cleans up",
    skipValidation: true,
  },
  SyncController.abortSync,
);
