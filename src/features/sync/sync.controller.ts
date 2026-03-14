import { isSessionValid } from "@/features/facebook/facebook.service.ts";
import { resumeAllSearches } from "@/features/searches/searches.repository.ts";
import { performSync } from "./sync.playwright.ts";
import { resetResyncFlag } from "./sync.service.ts";
import { SYNC_TIMEOUT_MS, SYNC_USER_KEY } from "./sync.constants.ts";
import { write, read, del } from "@/infra/redis/redis.client.ts";
import { NoActiveSyncError } from "@/shared/errors/errors.ts";
import logger from "@/infra/logger/logger.ts";
import type { Request, Response } from "express";

function sendSSE(res: Response, data: Record<string, unknown>): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export const SyncController = {
  async beginIdentitySync(req: Request, res: Response) {
    const userId = req.user!.id;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const valid = await isSessionValid(userId);
    if (valid) {
      sendSSE(res, { status: "already_synced" });
      res.end();
      return;
    }

    await write(SYNC_USER_KEY, userId, SYNC_TIMEOUT_MS / 1000);

    const abortController = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      abortController.abort();
      if (timeout) clearTimeout(timeout);
      timeout = null;
    };

    req.on("close", () => {
      logger.info("[sync] Client disconnected, aborting sync");
      cleanup();
      del(SYNC_USER_KEY).catch(() => {});
    });

    timeout = setTimeout(() => {
      logger.warn("[sync] Timed out waiting for session refresh");
      sendSSE(res, { status: "timeout" });
      cleanup();
      res.end();
    }, SYNC_TIMEOUT_MS);

    sendSSE(res, { status: "connecting" });

    try {
      const result = await performSync(
        userId,
        (step, message, debuggerUrl) => {
          logger.info(`[sync] [${step}] ${message}`);
          sendSSE(res, {
            status: "status_update",
            message,
            step,
            ...(debuggerUrl ? { debuggerUrl } : {}),
          });
        },
        abortController.signal,
      );

      if (result.success) {
        const resumed = await resumeAllSearches(userId);
        logger.info(`[sync] Session refreshed, resumed ${resumed} searches`);
        sendSSE(res, { status: "synced" });
      }
    } catch (error) {
      logger.error("[sync] Sync failed:", error);
      sendSSE(res, {
        status: "error",
        message: error instanceof Error ? error.message : "Sync failed",
      });
    } finally {
      cleanup();
      await del(SYNC_USER_KEY).catch(() => {});
      res.end();
    }
  },

  async abortSync(_req: Request, res: Response) {
    const syncUserId = await read(SYNC_USER_KEY);
    if (!syncUserId) throw new NoActiveSyncError();

    logger.info("[sync-abort] Aborting sync");
    await del(SYNC_USER_KEY);
    resetResyncFlag();

    res.success(null);
  },
};
