import { runSearch } from "@/features/searches/searches.executor.ts";
import { notify } from "@/infra/notifications/notification.service.ts";
import { publishSearchEvent } from "@/infra/redis/redis.pubsub.ts";
import * as repository from "@/features/searches/searches.repository.ts";
import type { StoredSearch } from "@/features/searches/searches.types.ts";
import { FREQUENCY_MS } from "./scheduler.constants.ts";
import logger from "@/infra/logger/logger.ts";

const timers = new Map<string, ReturnType<typeof setInterval>>();
const scheduledAt = new Map<string, number>();

async function executeTick(search: StoredSearch): Promise<void> {
  try {
    logger.info(`[scheduler] Running search "${search.query}" (${search.id})`);

    const results = await runSearch(search);

    await notify(
      search.notificationType,
      search.notificationTarget,
      search.query,
      results.listings.map((l) => ({ id: l.id, title: l.title, price: l.price, url: l.url })),
    );

    logger.info(
      `[scheduler] Search "${search.query}" completed — ${results.listings.length} listings stored & notified`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[scheduler] Search ${search.id} failed:`, error);

    await publishSearchEvent(search.id, {
      type: "failed",
      searchId: search.id,
      error: message,
      errorName: error instanceof Error ? error.name : "Error",
    }).catch((e) => logger.error(`[scheduler] Failed to publish error event:`, e));
  }
}

export function scheduleSearch(search: StoredSearch): void {
  if (timers.has(search.id)) {
    cancelSearch(search.id);
  }

  const intervalMs = FREQUENCY_MS[search.frequency];
  if (!intervalMs || intervalMs <= 0) {
    logger.error(
      `[scheduler] Invalid frequency "${search.frequency}" for search ${search.id}, skipping`,
    );
    return;
  }

  logger.info(
    `[scheduler] Scheduling "${search.query}" every ${intervalMs / 60_000}min (${search.id})`,
  );

  executeTick(search);

  const timer = setInterval(() => {
    repository.getSearchById(search.id).then((latest) => {
      if (!latest || latest.status !== "running") {
        cancelSearch(search.id);
        return;
      }
      executeTick(latest);
    });
  }, intervalMs);

  timers.set(search.id, timer);
  scheduledAt.set(search.id, Date.now());
}

export function cancelSearch(searchId: string): void {
  const timer = timers.get(searchId);
  if (timer) {
    clearInterval(timer);
    timers.delete(searchId);
    scheduledAt.delete(searchId);
    logger.info(`[scheduler] Cancelled schedule for ${searchId}`);
  }
}

export function rescheduleSearch(search: StoredSearch): void {
  cancelSearch(search.id);
  if (search.status === "running") {
    scheduleSearch(search);
  }
}

export function isScheduled(searchId: string): boolean {
  return timers.has(searchId);
}

export function getNextRunAt(searchId: string, frequency: string): string | null {
  const startedAt = scheduledAt.get(searchId);
  if (!startedAt) return null;
  const intervalMs = FREQUENCY_MS[frequency as keyof typeof FREQUENCY_MS];
  if (!intervalMs) return null;
  const elapsed = Date.now() - startedAt;
  const remaining = intervalMs - (elapsed % intervalMs);
  return new Date(Date.now() + remaining).toISOString();
}

export function cancelAll(): void {
  for (const [id, timer] of timers) {
    clearInterval(timer);
    logger.info(`[scheduler] Cancelled schedule for ${id}`);
  }
  timers.clear();
  scheduledAt.clear();
}
