import { DatabaseResourceNotFoundError } from "@/shared/errors/errors.ts";
import * as repository from "./users.repository.ts";
import type { Request, Response } from "express";

export const UsersController = {
  async handleGetMe(req: Request, res: Response) {
    const user = await repository.getUserById(req.user!.id);
    if (!user) throw new DatabaseResourceNotFoundError();
    res.success(user);
  },

  async handleUpdateMe(req: Request, res: Response) {
    const user = await repository.updateUser(req.user!.id, req.body);
    if (!user) throw new DatabaseResourceNotFoundError();
    res.success(user);
  },
};
