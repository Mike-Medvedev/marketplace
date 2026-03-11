import { randomUUID } from "node:crypto";
import { searchMarketPlace } from "@/features/scrape/scrape.service.ts";
import type { SearchMarketPlaceParams } from "@/features/scrape/scrape.types.ts";
import { write } from "@/infra/redis/redis.client.ts";
import { db } from "@/infra/db/db.ts";
import { searchRuns } from "@/infra/db/schema.ts";
import { notify } from "@/infra/notifications/notification.service.ts";
import * as repository from "@/features/searches/searches.repository.ts";
import type { StoredSearch } from "@/features/searches/searches.types.ts";
import { FREQUENCY_MS, RESULTS_TTL_SECONDS } from "./scheduler.constants.ts";
import logger from "@/infra/logger/logger.ts";

const timers = new Map<string, ReturnType<typeof setInterval>>();
const scheduledAt = new Map<string, number>();

const DATE_LISTED_TO_DAYS: Record<string, 1 | 7 | 30> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

function searchToScrapeParams(search: StoredSearch): SearchMarketPlaceParams {
  const params: SearchMarketPlaceParams = {
    query: search.query,
    location: search.location,
    pageCount: Math.ceil(search.listingsPerCheck / 24),
  };
  if (search.minPrice != null) params.minPrice = search.minPrice;
  if (search.maxPrice != null) params.maxPrice = search.maxPrice;
  const days = DATE_LISTED_TO_DAYS[search.dateListed];
  if (days) params.dateListedDays = days;
  return params;
}

function resultsKey(searchId: string, runId: string): string {
  return `search:${searchId}:results:${runId}`;
}

async function executeTick(search: StoredSearch): Promise<void> {
  try {
    const params = searchToScrapeParams(search);
    logger.info(`[scheduler] Running search "${search.query}" (${search.id})`);

    const { listings } = await searchMarketPlace(params, search.userId);

    const capped = listings.slice(0, search.listingsPerCheck);

    const runId = randomUUID();
    const redisKey = resultsKey(search.id, runId);
    await write(redisKey, JSON.stringify(capped), RESULTS_TTL_SECONDS);

    await db.insert(searchRuns).values({
      id: runId,
      searchId: search.id,
      redisResultKey: redisKey,
      listingCount: capped.length,
    });

    await repository.updateLastRun(search.id, new Date());

    await notify(
      search.notificationType,
      search.notificationTarget,
      search.query,
      capped.map((l) => ({ id: l.id, title: l.title, price: l.price, url: l.url })),
    );

    logger.info(
      `[scheduler] Search "${search.query}" completed — ${capped.length} listings stored & notified`,
    );
  } catch (error) {
    logger.error(`[scheduler] Search ${search.id} failed:`, error);
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
