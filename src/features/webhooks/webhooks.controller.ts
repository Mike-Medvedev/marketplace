import { setSession } from "@/features/facebook/facebook.repository.ts";
import { publishSyncEvent } from "@/infra/redis/redis.pubsub.ts";
import { read } from "@/infra/redis/redis.client.ts";
import { SYNC_USER_KEY } from "@/features/sync/sync.constants.ts";
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

    const resolvedUserId = userId ?? (await read(SYNC_USER_KEY));
    if (!resolvedUserId) {
      logger.warn("[refresh] No userId in payload or Redis");
      res.error(400, new Error("Cannot determine userId for session"));
      return;
    }

    await setSession(resolvedUserId, { headers, body, capturedAt });
    logger.info(`[refresh] Session updated for user ${resolvedUserId} at ${capturedAt}`);
    await publishSyncEvent({ type: "session_refreshed" });
    res.success(null);
  },
};
