import express from "express";
import { TypedRouter } from "meebo";
import { successResponse, errorResponse } from "@/utils/api-response.ts";
import {
  signupBodySchema,
  loginBodySchema,
  verifyQuerySchema,
  authTokenResponseSchema,
  meResponseSchema,
  messageResponseSchema,
} from "./auth.types.ts";
import { AuthController } from "./auth.controller.ts";
import { authMiddleware } from "@/middleware/auth.middleware.ts";

const errResponse = errorResponse();

export const authRouter = TypedRouter(express.Router(), {
  tag: "Auth",
  basePath: "/api/v1/auth",
});

authRouter.post(
  "/signup",
  {
    operationId: "signup",
    summary: "Create a new account and send verification email",
    request: signupBodySchema,
    response: successResponse(messageResponseSchema),
    responses: { 409: errResponse },
  },
  AuthController.handleSignup,
);

authRouter.post(
  "/login",
  {
    operationId: "login",
    summary: "Authenticate with email and password",
    request: loginBodySchema,
    response: successResponse(authTokenResponseSchema),
    responses: { 401: errResponse, 403: errResponse },
  },
  AuthController.handleLogin,
);

authRouter.get(
  "/verify",
  {
    operationId: "verifyEmail",
    summary: "Verify email via token from verification link",
    query: verifyQuerySchema,
    response: successResponse(authTokenResponseSchema),
    responses: { 400: errResponse },
  },
  AuthController.handleVerify,
);

authRouter.post(
  "/logout",
  {
    operationId: "logout",
    summary: "Invalidate current session",
    response: successResponse(messageResponseSchema),
    responses: { 401: errResponse },
  },
  AuthController.handleLogout,
);

authRouter.get(
  "/me",
  {
    operationId: "getMe",
    summary: "Get the current authenticated user",
    response: successResponse(meResponseSchema),
    responses: { 401: errResponse },
  },
  authMiddleware,
  AuthController.handleMe,
);
