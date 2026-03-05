import { setSession } from "@/features/facebook/facebook.repository.ts";
import { sendSuccess, sendError } from "@/utils/api-response.ts";
import logger from "@/logger/logger.ts";
import type { Request, Response } from "express";

export const WebhooksController = {
  async handleAnalyzedListings(req: Request, res: Response) {
    logger.info("Recieved analyzed listings in webhook, notifying user");
    logger.info(req.body);
    sendSuccess(res, null);
  },

  async handleContainerStarted(req: Request, res: Response) {
    const { ip, novnc_url } = req.body;
    logger.info(`[container-started] Container started at ${ip}, noVNC: ${novnc_url}`);
    sendSuccess(res, null);
  },

  async handleRefresh(req: Request, res: Response) {
    const { headers, body, capturedAt } = req.body;

    if (!headers || !body) {
      logger.warn("[refresh] Received invalid session data");
      sendError(res, 400, "BAD_REQUEST", "Missing headers or body");
      return;
    }

    await setSession({ headers, body, capturedAt });
    logger.info(`[refresh] Session updated at ${capturedAt}`);
    sendSuccess(res, null);
  },
};
