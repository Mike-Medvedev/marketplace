import { setSession } from "@/features/facebook/facebook.repository.ts";
import { publishSyncEvent } from "@/infra/redis/redis.pubsub.ts";
import { read } from "@/infra/redis/redis.client.ts";
import { SYNC_USER_KEY } from "@/features/sync/sync.constants.ts";
import { getContainerGroupHost } from "@/features/sync/sync.aci.ts";
import logger from "@/infra/logger/logger.ts";
import type { Request, Response } from "express";

export const WebhooksController = {
  async handleAnalyzedListings(req: Request, res: Response) {
    logger.info("Received analyzed listings in webhook, notifying user");
    logger.info(req.body);
    res.success(null);
  },

  async handleNeedsLogin(req: Request, res: Response) {
    logger.info("[needs-login] Webhook received");
    const { novncUrl } = req.body;
    if (!novncUrl) {
      logger.warn("[needs-login] Request missing novncUrl");
      res.error(400, new Error("Missing novncUrl"));
      return;
    }
    logger.info(`[needs-login] Human login required, noVNC: ${novncUrl}`);
    await publishSyncEvent({ type: "needs_login", novncUrl });
    res.success(null);
  },

  async handleStatusUpdate(req: Request, res: Response) {
    const { message, step, userId } = req.body;
    if (typeof message !== "string" || !message.trim()) {
      logger.warn("[status-update] Request missing message");
      res.error(400, new Error("Missing message"));
      return;
    }

    const activeUserId = await read(SYNC_USER_KEY);
    if (!activeUserId) {
      logger.warn("[status-update] No active sync session found in Redis");
      res.error(404, new Error("No active sync session"));
      return;
    }

    const resolvedUserId = typeof userId === "string" && userId.trim() ? userId : activeUserId;
    logger.info(
      `[status-update] ${step ? `[${step}] ` : ""}${message} (user ${resolvedUserId})`,
    );
    const trimmedStep = typeof step === "string" && step.trim() ? step.trim() : null;
    await publishSyncEvent({
      type: "status_update",
      message: message.trim(),
      ...(trimmedStep ? { step: trimmedStep } : {}),
      userId: resolvedUserId,
    });
    res.success(null);
  },

  async handleContainerExited(req: Request, res: Response) {
    const { reason } = req.body;
    const exitReason = typeof reason === "string" ? reason : "Unknown error";
    logger.warn(`[container-exited] Container exited: ${exitReason}`);
    await publishSyncEvent({ type: "container_exited", reason: exitReason });
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

  async handleSyncContext(_req: Request, res: Response) {
    logger.info("[sync-context] Webhook received");
    const userId = await read(SYNC_USER_KEY);
    if (!userId) {
      logger.warn("[sync-context] No active sync session found in Redis");
      res.error(404, new Error("No active sync session"));
      return;
    }

    const containerHost = await getContainerGroupHost();
    logger.info(`[sync-context] Returning sync context for user ${userId}, containerHost: ${containerHost}`);
    res.success({ userId, containerHost });
  },
};
