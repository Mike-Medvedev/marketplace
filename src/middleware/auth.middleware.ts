import type { Request, Response, NextFunction } from "express";
import { AuthRepository } from "@/features/auth/auth.repository.ts";
import { UnauthorizedError } from "@/errors/errors.ts";

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token =
    (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null) ??
    (typeof req.query.token === "string" ? req.query.token : null);

  if (!token) throw new UnauthorizedError();

  const email = await AuthRepository.getSession(token);
  if (!email) throw new UnauthorizedError("Session expired or invalid");

  req.user = { email };
  next();
}
