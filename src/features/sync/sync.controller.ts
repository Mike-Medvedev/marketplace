import { isSessionValid } from "@/features/facebook/facebook.service.ts";
import { resumeAllSearches } from "@/features/searches/searches.repository.ts";
import { performSync } from "./sync.playwright.ts";
import { resetResyncFlag } from "./sync.service.ts";
import { SYNC_TIMEOUT_MS, syncUserKey, VNC_LOCK_KEY } from "./sync.constants.ts";
import { acquireLock, read, del } from "@/infra/redis/redis.client.ts";
import { NoActiveSyncError } from "@/shared/errors/errors.ts";
import logger from "@/infra/logger/logger.ts";
import type { Request, Response } from "express";

function sendSSE(res: Response, data: Record<string, unknown>): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export const SyncController = {
  async beginIdentitySync(req: Request, res: Response) {
    const userId = req.user!.id;
    const userKey = syncUserKey(userId);

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

    const gotVncLock = await acquireLock(VNC_LOCK_KEY, userId, SYNC_TIMEOUT_MS / 1000);
    if (!gotVncLock) {
      sendSSE(res, {
        status: "error",
        message: "Another user is currently syncing. Please try again in a few minutes.",
      });
      res.end();
      return;
    }

    const gotUserLock = await acquireLock(userKey, "1", SYNC_TIMEOUT_MS / 1000);
    if (!gotUserLock) {
      await del(VNC_LOCK_KEY).catch(() => {});
      sendSSE(res, { status: "error", message: "A sync is already in progress for this account" });
      res.end();
      return;
    }

    const abortController = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      abortController.abort();
      if (timeout) clearTimeout(timeout);
      timeout = null;
    };

    const releaseLocks = async () => {
      await del(userKey).catch(() => {});
      await del(VNC_LOCK_KEY).catch(() => {});
    };

    req.on("close", () => {
      logger.info(`[sync] Client disconnected, aborting sync for ${userId}`);
      cleanup();
      releaseLocks();
    });

    timeout = setTimeout(() => {
      logger.warn(`[sync] Timed out waiting for session refresh for ${userId}`);
      sendSSE(res, { status: "timeout" });
      cleanup();
      res.end();
    }, SYNC_TIMEOUT_MS);

    sendSSE(res, { status: "connecting" });

    try {
      const result = await performSync(
        userId,
        (step, message, vncUrl) => {
          logger.info(`[sync] [${userId}] [${step}] ${message}`);
          sendSSE(res, {
            status: "status_update",
            message,
            step,
            ...(vncUrl ? { vncUrl } : {}),
          });
        },
        abortController.signal,
      );

      if (result.success) {
        const resumed = await resumeAllSearches(userId);
        logger.info(`[sync] Session refreshed for ${userId}, resumed ${resumed} searches`);
        sendSSE(res, { status: "synced" });
      }
    } catch (error) {
      logger.error(`[sync] Sync failed for ${userId}:`, error);
      sendSSE(res, {
        status: "error",
        message: error instanceof Error ? error.message : "Sync failed",
      });
    } finally {
      cleanup();
      await releaseLocks();
      res.end();
    }
  },

  async abortSync(req: Request, res: Response) {
    const userId = req.user!.id;
    const userKey = syncUserKey(userId);
    const isSyncing = await read(userKey);
    if (!isSyncing) throw new NoActiveSyncError();

    logger.info(`[sync-abort] Aborting sync for ${userId}`);
    await del(userKey);
    await del(VNC_LOCK_KEY);
    resetResyncFlag();

    res.success(null);
  },
};
