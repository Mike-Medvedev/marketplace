import { isSessionValid } from "@/features/facebook/facebook.service.ts";
import { resumeAllSearches } from "@/features/searches/searches.repository.ts";
import {
  subscribeSyncEvents,
  publishSyncEvent,
  type SyncEvent,
} from "@/infra/redis/redis.pubsub.ts";
import { startContainerGroup, pollContainerState } from "./sync.aci.ts";
import { SYNC_TIMEOUT_MS } from "./sync.constants.ts";
import logger from "@/logger/logger.ts";
import type { Request, Response } from "express";

function sendSSE(res: Response, data: Record<string, unknown>): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export const SyncController = {
  async beginIdentitySync(_req: Request, res: Response) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const valid = await isSessionValid();
    if (valid) {
      sendSSE(res, { status: "already_synced" });
      res.end();
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const pollerAbort = new AbortController();

    const cleanup = () => {
      if (unsubscribe) unsubscribe();
      if (timeout) clearTimeout(timeout);
      pollerAbort.abort();
      unsubscribe = null;
      timeout = null;
    };

    _req.on("close", () => {
      logger.info("[sync] Client disconnected");
      cleanup();
    });

    const syncComplete = new Promise<void>((resolve) => {
      const handler = async (event: SyncEvent) => {
        if (event.type === "session_refreshed") {
          const resumed = await resumeAllSearches();
          logger.info(`[sync] Session refreshed, resumed ${resumed} searches`);
          sendSSE(res, { status: "synced" });
          cleanup();
          res.end();
          resolve();
        } else if (event.type === "needs_login") {
          logger.info("[sync] Human login required, forwarding noVNC URL to client");
          sendSSE(res, { status: "needs_login", novncUrl: event.novncUrl });
        } else if (event.type === "container_exited") {
          logger.warn(`[sync] Container exited: ${event.reason}`);
          sendSSE(res, { status: "container_exited", reason: event.reason });
          cleanup();
          res.end();
          resolve();
        }
      };

      unsubscribe = subscribeSyncEvents(handler);

      timeout = setTimeout(() => {
        logger.warn("[sync] Timed out waiting for session refresh");
        sendSSE(res, { status: "timeout" });
        cleanup();
        res.end();
        resolve();
      }, SYNC_TIMEOUT_MS);
    });

    sendSSE(res, { status: "starting_container" });

    try {
      await startContainerGroup();
      sendSSE(res, { status: "container_running" });
    } catch (error) {
      logger.error("[sync] Failed to start ACI container group:", error);
      sendSSE(res, {
        status: "error",
        message: "Failed to start container group",
      });
      cleanup();
      res.end();
      return;
    }

    pollContainerState(pollerAbort.signal).then((state) => {
      if (state && !pollerAbort.signal.aborted) {
        publishSyncEvent({ type: "container_exited", reason: `Container state: ${state}` }).catch(
          (error) => logger.error("[sync] Failed to publish container_exited:", error),
        );
      }
    });

    await syncComplete;
  },
};
