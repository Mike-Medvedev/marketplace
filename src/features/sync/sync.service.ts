import {
  pauseAllSearches,
  resumeAllSearches,
} from "@/features/searches/searches.repository.ts";
import { subscribeSyncEvents, publishSyncEvent, type SyncEvent } from "@/infra/redis/redis.pubsub.ts";
import { sendResyncEmail } from "@/infra/email/email.client.ts";
import { env } from "@/configs/env.ts";
import { startContainerGroup, pollContainerState } from "./sync.aci.ts";
import { SYNC_TIMEOUT_MS } from "./sync.constants.ts";
import logger from "@/logger/logger.ts";

let resyncInProgress = false;

/**
 * Automated resync triggered when a scheduled search encounters
 * a FacebookSessionExpiredError. Spins up the ACI Playwright container
 * and waits for it to either refresh the session automatically or
 * signal that human login is required.
 *
 * Only one auto-resync runs at a time to avoid redundant container starts.
 */
export async function triggerAutoResync(): Promise<void> {
  if (resyncInProgress) {
    logger.info("[auto-resync] Already in progress, skipping");
    return;
  }
  resyncInProgress = true;
  logger.info("[auto-resync] Starting automated resync");

  try {
    await new Promise<void>((resolve) => {
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

      const handleNeedsHumanLogin = async () => {
        const paused = await pauseAllSearches();
        logger.warn(`[auto-resync] Paused ${paused} searches, sending email notification`);
        try {
          await sendResyncEmail(env.SMTP_USER);
        } catch (err) {
          logger.error("[auto-resync] Failed to send resync email:", err);
        }
        cleanup();
        resolve();
      };

      const handler = async (event: SyncEvent) => {
        if (event.type === "session_refreshed") {
          const resumed = await resumeAllSearches();
          logger.info(`[auto-resync] Session auto-refreshed, resumed ${resumed} searches`);
          cleanup();
          resolve();
        } else if (event.type === "needs_login") {
          await handleNeedsHumanLogin();
        } else if (event.type === "container_exited") {
          logger.error(`[auto-resync] Container crashed: ${event.reason}. Next scheduled search will retry.`);
          cleanup();
          resolve();
        }
      };

      unsubscribe = subscribeSyncEvents(handler);

      timeout = setTimeout(async () => {
        logger.warn("[auto-resync] Timed out waiting for Playwright container");
        timeout = null;
        await handleNeedsHumanLogin();
      }, SYNC_TIMEOUT_MS);

      startContainerGroup()
        .then(() => {
          pollContainerState(pollerAbort.signal).then((state) => {
            if (state && !pollerAbort.signal.aborted) {
              publishSyncEvent({ type: "container_exited", reason: `Container state: ${state}` }).catch(
                (err) => logger.error("[auto-resync] Failed to publish container_exited:", err),
              );
            }
          });
        })
        .catch(async (err) => {
          logger.error("[auto-resync] Failed to start ACI container group:", err);
          await handleNeedsHumanLogin();
        });
    });
  } finally {
    resyncInProgress = false;
  }
}
