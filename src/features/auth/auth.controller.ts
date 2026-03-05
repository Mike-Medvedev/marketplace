import type { Request, Response } from "express";
import { AuthService } from "./auth.service.ts";
import { sendSuccess } from "@/utils/api-response.ts";
import { UnauthorizedError } from "@/errors/errors.ts";

export const AuthController = {
  async handleSignup(req: Request, res: Response) {
    const { email, password } = req.body;
    await AuthService.signup(email, password);
    sendSuccess(res, { message: "Verification email sent. Please check your inbox." }, 201);
  },

  async handleLogin(req: Request, res: Response) {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    sendSuccess(res, result);
  },

  async handleVerify(req: Request, res: Response) {
    const { token } = req.query as { token: string };
    const result = await AuthService.verifyEmail(token);
    sendSuccess(res, result);
  },

  async handleLogout(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) throw new UnauthorizedError();

    await AuthService.logout(token);
    sendSuccess(res, { message: "Logged out" });
  },

  async handleMe(req: Request, res: Response) {
    if (!req.user) throw new UnauthorizedError();
    sendSuccess(res, { email: req.user.email });
  },
};
