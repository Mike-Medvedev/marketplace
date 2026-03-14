import { pauseAllSearches, resumeAllSearches } from "@/features/searches/searches.service.ts";
import { sendResyncEmail } from "@/infra/email/email.client.ts";
import { env } from "@/configs/env.ts";
import { performSync } from "./sync.playwright.ts";
import { SYNC_TIMEOUT_MS, SYNC_USER_KEY } from "./sync.constants.ts";
import { write } from "@/infra/redis/redis.client.ts";
import logger from "@/infra/logger/logger.ts";

let resyncInProgress = false;

export function resetResyncFlag(): void {
  resyncInProgress = false;
}

/**
 * Automated resync triggered when a scheduled search encounters
 * a FacebookSessionExpiredError. Connects to Browserless and attempts
 * to refresh the session automatically. If human login is required,
 * pauses all searches and sends an email notification.
 *
 * Only one auto-resync runs at a time to avoid redundant connections.
 */
export async function triggerAutoResync(userId: string): Promise<void> {
  if (resyncInProgress) {
    logger.info("[auto-resync] Already in progress, skipping");
    return;
  }
  resyncInProgress = true;
  logger.info("[auto-resync] Starting automated resync");

  await write(SYNC_USER_KEY, userId, SYNC_TIMEOUT_MS / 1000);

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), SYNC_TIMEOUT_MS);

  try {
    const result = await performSync(
      userId,
      (step, message) => {
        logger.info(`[auto-resync] [${step}] ${message}`);
      },
      abortController.signal,
    );

    if (result.success) {
      const resumed = await resumeAllSearches();
      logger.info(`[auto-resync] Session auto-refreshed, resumed ${resumed} searches`);
    } else if (result.needsLogin) {
      const paused = await pauseAllSearches();
      logger.warn(`[auto-resync] Paused ${paused} searches, sending email notification`);
      try {
        await sendResyncEmail(env.SMTP_USER);
      } catch (error) {
        logger.error("[auto-resync] Failed to send resync email:", error);
      }
    }
  } catch (error) {
    logger.error("[auto-resync] Sync failed:", error);
    const paused = await pauseAllSearches();
    logger.warn(`[auto-resync] Paused ${paused} searches, sending email notification`);
    try {
      await sendResyncEmail(env.SMTP_USER);
    } catch (emailError) {
      logger.error("[auto-resync] Failed to send resync email:", emailError);
    }
  } finally {
    clearTimeout(timeout);
    resyncInProgress = false;
  }
}
