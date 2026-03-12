import { isSessionValid } from "./facebook.service.ts";
import type { Request, Response } from "express";

export const FacebookController = {
  async handleSessionStatus(req: Request, res: Response) {
    const valid = await isSessionValid(req.user!.id);
    res.success({ valid });
  },
};
