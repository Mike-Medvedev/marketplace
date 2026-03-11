import { searchMarketPlace } from "@/features/scrape/scrape.service.ts";
import type { SearchMarketPlaceParams } from "@/features/scrape/scrape.types.ts";
import { write } from "@/infra/redis/redis.client.ts";
import { notify } from "@/infra/notifications/notification.service.ts";
import * as repository from "@/features/searches/searches.repository.ts";
import type { StoredSearch } from "@/features/searches/searches.types.ts";
import { FREQUENCY_MS, RESULTS_TTL_SECONDS } from "./scheduler.constants.ts";
import logger from "@/logger/logger.ts";

const timers = new Map<string, ReturnType<typeof setInterval>>();
const scheduledAt = new Map<string, number>();

const DATE_LISTED_TO_DAYS: Record<string, 1 | 7 | 30> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

function criteriaToScrapeParams(search: StoredSearch): SearchMarketPlaceParams {
  const { criteria, settings } = search;
  const params: SearchMarketPlaceParams = {
    query: criteria.query,
    location: criteria.location,
    pageCount: Math.ceil(settings.listingsPerCheck / 24),
  };
  const min = Number(criteria.minPrice);
  if (!Number.isNaN(min)) params.minPrice = min;
  const max = Number(criteria.maxPrice);
  if (!Number.isNaN(max)) params.maxPrice = max;
  const days = DATE_LISTED_TO_DAYS[criteria.dateListed];
  if (days) params.dateListedDays = days;
  return params;
}

function resultsKey(searchId: string): string {
  return `search:${searchId}:results`;
}

async function executeTick(search: StoredSearch): Promise<void> {
  try {
    const params = criteriaToScrapeParams(search);
    logger.info(`[scheduler] Running search "${search.criteria.query}" (${search.id})`);

    const { listings } = await searchMarketPlace(params);

    const capped = listings.slice(0, search.settings.listingsPerCheck);

    await write(resultsKey(search.id), JSON.stringify(capped), RESULTS_TTL_SECONDS);

    await repository.updateLastRun(search.id, new Date().toISOString());

    await notify(
      search.settings.notificationType,
      search.settings.notificationTarget,
      search.criteria.query,
      capped.map((l) => ({ id: l.id, title: l.title, price: l.price, url: l.url })),
    );

    logger.info(
      `[scheduler] Search "${search.criteria.query}" completed — ${capped.length} listings stored & notified`,
    );
  } catch (error) {
    logger.error(`[scheduler] Search ${search.id} failed:`, error);
  }
}

export function scheduleSearch(search: StoredSearch): void {
  if (timers.has(search.id)) {
    cancelSearch(search.id);
  }

  const intervalMs = FREQUENCY_MS[search.settings.frequency];
  if (!intervalMs || intervalMs <= 0) {
    logger.error(
      `[scheduler] Invalid frequency "${search.settings.frequency}" for search ${search.id}, skipping`,
    );
    return;
  }

  logger.info(
    `[scheduler] Scheduling "${search.criteria.query}" every ${intervalMs / 60_000}min (${search.id})`,
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
