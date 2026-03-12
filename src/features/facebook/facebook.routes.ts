import express from "express";
import { TypedRouter } from "meebo";
import { FacebookController } from "./facebook.controller.ts";

export const facebookRouter = TypedRouter(express.Router(), {
  tag: "Facebook",
  basePath: "/api/v1",
});

facebookRouter.get(
  "/session/status",
  {
    operationId: "getSessionStatus",
    summary: "Check whether the stored Facebook session is still valid",
    skipValidation: true,
  },
  FacebookController.handleSessionStatus,
);
