import { setSession } from "@/features/facebook/facebook.repository.ts";
import { publishSyncEvent } from "@/infra/redis/redis.pubsub.ts";
import logger from "@/infra/logger/logger.ts";
import type { Request, Response } from "express";

export const WebhooksController = {
  async handleAnalyzedListings(req: Request, res: Response) {
    logger.info("Received analyzed listings in webhook, notifying user");
    logger.info(req.body);
    res.success(null);
  },

  async handleRefresh(req: Request, res: Response) {
    const { userId, headers, body, capturedAt } = req.body;

    if (!headers || !body) {
      logger.warn("[refresh] Received invalid session data");
      res.error(400, new Error("Missing headers or body"));
      return;
    }

    if (!userId) {
      logger.warn("[refresh] No userId in payload");
      res.error(400, new Error("Missing userId in refresh payload"));
      return;
    }

    await setSession(userId, { headers, body, capturedAt });
    logger.info(`[refresh] Session updated for user ${userId} at ${capturedAt}`);
    await publishSyncEvent({ type: "session_refreshed" });
    res.success(null);
  },
};
