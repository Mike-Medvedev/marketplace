import Redis from "ioredis";
import { env } from "@/configs/env.ts";
import logger from "@/infra/logger/logger.ts";
import type { SearchEvent } from "@/features/searches/searches.types.ts";

const SYNC_CHANNEL = "sync:events";

function searchChannel(searchId: string): string {
  return `search:events:${searchId}`;
}

export type SyncEvent =
  | { type: "session_refreshed" }
  | { type: "needs_login"; novncUrl: string }
  | { type: "status_update"; message: string; step?: string; userId?: string }
  | { type: "container_exited"; reason: string };

/**
 * Dedicated Redis connection for Pub/Sub subscriptions.
 * ioredis enters subscriber mode on .subscribe() and can no longer issue
 * regular commands, so we keep this separate from the main client.
 */
const subscriber = new Redis(env.REDIS_CONNECTION_STRING);
subscriber.on("error", (e) => console.error("[redis-pubsub-error]", e));

async function publish(channel: string, payload: string): Promise<void> {
  const { redis } = await import("./redis.client.ts");
  await redis.publish(channel, payload);
}

export async function publishSyncEvent(event: SyncEvent): Promise<void> {
  await publish(SYNC_CHANNEL, JSON.stringify(event));
  logger.info(`[pubsub] Published ${event.type}`);
}

export async function publishSearchEvent(searchId: string, event: SearchEvent): Promise<void> {
  await publish(searchChannel(searchId), JSON.stringify(event));
  logger.info(`[pubsub] Published ${event.type} for search ${searchId}`);
}

export type SyncEventHandler = (event: SyncEvent) => void;
export type SearchEventHandler = (event: SearchEvent) => void;

/**
 * Subscribe to a channel, filtering messages to the provided handler.
 * Returns an unsubscribe function for cleanup.
 */
function subscribeChannel<T>(channel: string, handler: (event: T) => void): () => void {
  const messageHandler = (ch: string, message: string) => {
    if (ch !== channel) return;
    try {
      handler(JSON.parse(message) as T);
    } catch (error) {
      logger.error(`[pubsub] Failed to parse event on ${channel}:`, error);
    }
  };

  subscriber.subscribe(channel).catch((error) => {
    logger.error(`[pubsub] Failed to subscribe to ${channel}:`, error);
  });
  subscriber.on("message", messageHandler);

  return () => {
    subscriber.off("message", messageHandler);
    subscriber.unsubscribe(channel).catch((error) => {
      logger.error(`[pubsub] Failed to unsubscribe from ${channel}:`, error);
    });
  };
}

export function subscribeSyncEvents(handler: SyncEventHandler): () => void {
  return subscribeChannel<SyncEvent>(SYNC_CHANNEL, handler);
}

export function subscribeSearchEvents(searchId: string, handler: SearchEventHandler): () => void {
  return subscribeChannel<SearchEvent>(searchChannel(searchId), handler);
}

export function disconnectSubscriber(): void {
  subscriber.disconnect();
}
