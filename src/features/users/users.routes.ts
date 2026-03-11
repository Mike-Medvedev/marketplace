import express from "express";
import { TypedRouter } from "meebo";
import { SuccessSchema, ErrorSchema } from "@/shared/api-response.ts";
import { userSelectSchema, userUpdateSchema } from "./users.types.ts";
import { UsersController } from "./users.controller.ts";

export const usersRouter = TypedRouter(express.Router(), {
  tag: "Users",
  basePath: "/api/v1/users",
});

usersRouter.get(
  "/me",
  {
    operationId: "getMe",
    response: SuccessSchema(userSelectSchema),
    responses: { 404: ErrorSchema },
    summary: "Get the authenticated user's profile",
  },
  UsersController.handleGetMe,
);

usersRouter.patch(
  "/me",
  {
    operationId: "updateMe",
    request: userUpdateSchema,
    response: SuccessSchema(userSelectSchema),
    responses: { 404: ErrorSchema },
    summary: "Update the authenticated user's profile",
  },
  UsersController.handleUpdateMe,
);
