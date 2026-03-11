import { setSession } from "@/features/facebook/facebook.repository.ts";
import { publishSyncEvent } from "@/infra/redis/redis.pubsub.ts";
import { sendSuccess, sendError } from "@/shared/api-response";
import logger from "@/infra/logger/logger";
import type { Request, Response } from "express";

export const WebhooksController = {
  async handleAnalyzedListings(req: Request, res: Response) {
    logger.info("Recieved analyzed listings in webhook, notifying user");
    logger.info(req.body);
    sendSuccess(res, null);
  },

  async handleNeedsLogin(req: Request, res: Response) {
    logger.info("[needs-login] Webhook received");
    const { novncUrl } = req.body;
    if (!novncUrl) {
      logger.warn("[needs-login] Request missing novncUrl");
      sendError(res, 400, "BAD_REQUEST", "Missing novncUrl");
      return;
    }
    logger.info(`[needs-login] Human login required, noVNC: ${novncUrl}`);
    await publishSyncEvent({ type: "needs_login", novncUrl });
    sendSuccess(res, null);
  },

  async handleContainerExited(req: Request, res: Response) {
    const { reason } = req.body;
    const exitReason = typeof reason === "string" ? reason : "Unknown error";
    logger.warn(`[container-exited] Container exited: ${exitReason}`);
    await publishSyncEvent({ type: "container_exited", reason: exitReason });
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
    await publishSyncEvent({ type: "session_refreshed" });
    sendSuccess(res, null);
  },
};
