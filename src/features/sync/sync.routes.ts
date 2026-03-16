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
    summary: "Start identity sync via SSE — connects to chromium and streams status",
    skipValidation: true,
  },
  SyncController.beginIdentitySync,
);

syncRouter.post(
  "/sync/abort",
  {
    operationId: "abortSync",
    summary: "Abort an in-progress identity sync",
    skipValidation: true,
  },
  SyncController.abortSync,
);
