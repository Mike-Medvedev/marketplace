import Redis from "ioredis";
import { env } from "@/configs/env.ts";

export const redis = new Redis(env.REDIS_CONNECTION_STRING);

redis.on("error", (e) => console.error("[redis-error]", e));
redis.on("connect", () => console.log("Redis connecting..."));

export async function read(key: string): Promise<string | null> {
  return redis.get(key);
}

export async function del(key: string): Promise<void> {
  await redis.del(key);
}

export async function write(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (ttlSeconds && ttlSeconds > 0) {
    await redis.set(key, value, "EX", ttlSeconds);
  } else {
    await redis.set(key, value);
  }
}

/** Atomic SET-if-not-exists with TTL. Returns true if the lock was acquired. */
export async function acquireLock(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  const result = await redis.set(key, value, "EX", ttlSeconds, "NX");
  return result === "OK";
}
