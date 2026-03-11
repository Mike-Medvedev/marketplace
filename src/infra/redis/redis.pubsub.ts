import Redis from "ioredis";
import { env } from "@/configs/env.ts";
import logger from "@/logger/logger.ts";

const SYNC_CHANNEL = "sync:events";

export type SyncEvent =
  | { type: "session_refreshed" }
  | { type: "needs_login"; novncUrl: string }
  | { type: "container_exited"; reason: string };

/**
 * Dedicated Redis connection for Pub/Sub subscriptions.
 * ioredis enters subscriber mode on .subscribe() and can no longer issue
 * regular commands, so we keep this separate from the main client.
 */
const subscriber = new Redis(env.REDIS_CONNECTION_STRING);
subscriber.on("error", (e) => console.error("[redis-pubsub-error]", e));

/** Publish a sync event using the main Redis client (imported separately). */
export async function publishSyncEvent(event: SyncEvent): Promise<void> {
  const { redis } = await import("./redis.client.ts");
  await redis.publish(SYNC_CHANNEL, JSON.stringify(event));
  logger.info(`[pubsub] Published ${event.type}`);
}

export type SyncEventHandler = (event: SyncEvent) => void;

/**
 * Subscribe to sync events. Returns an unsubscribe function for cleanup.
 * Only one handler is active at a time per subscriber connection.
 */
export function subscribeSyncEvents(handler: SyncEventHandler): () => void {
  const messageHandler = (_channel: string, message: string) => {
    try {
      const event = JSON.parse(message) as SyncEvent;
      handler(event);
    } catch (error) {
      logger.error("[pubsub] Failed to parse sync event:", error);
    }
  };

  subscriber.subscribe(SYNC_CHANNEL).catch((error) => {
    logger.error("[pubsub] Failed to subscribe:", error);
  });
  subscriber.on("message", messageHandler);

  return () => {
    subscriber.off("message", messageHandler);
    subscriber.unsubscribe(SYNC_CHANNEL).catch((error) => {
      logger.error("[pubsub] Failed to unsubscribe:", error);
    });
  };
}

export function disconnectSubscriber(): void {
  subscriber.disconnect();
}
