import type { Request, Response, NextFunction } from "express";
import { verifyUser } from "@/infra/auth/auth.service";
import { MissingTokenError } from "@/shared/errors/errors";
export async function validateUser(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let jwt: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    jwt = authHeader.split(" ")[1];
  } else if (typeof req.query.token === "string") {
    jwt = req.query.token;
  }

  if (!jwt) {
    return next(new MissingTokenError("Missing or invalid Authorization header"));
  }

  const user = await verifyUser(jwt);
  req.user = user;
  next();
}
