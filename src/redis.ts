import Redis from "ioredis";
import { env } from "@/env.ts";

/** Parse Azure/StackExchange-style Redis connection string into ioredis options. */
function parseConnectionString(conn: string): {
  host: string;
  port: number;
  password: string;
  useTls: boolean;
} {
  const parts = conn.split(",");
  const [hostPort, ...rest] = parts;
  const [host, portStr] = (hostPort ?? "").split(":");
  const port = portStr ? parseInt(portStr, 10) : 6380;
  let password = "";
  let useTls = false;
  for (const p of rest) {
    const [key, value] = p.split("=").map((s) => s?.trim() ?? "");
    if (key === "password") password = value ?? "";
    if (key === "ssl" && (value === "True" || value === "true" || value === "1")) useTls = true;
  }
  return {
    host: host ?? "localhost",
    port: Number.isNaN(port) ? 6380 : port,
    password,
    useTls,
  };
}

let client: Redis | null = null;

/**
 * Create and connect the Redis client. Idempotent; safe to call multiple times.
 * @throws Error with readable message if connection fails
 */
export async function connect(): Promise<Redis> {
  if (client) return client;
  const opts = parseConnectionString(env.REDIS_CONNECTION_STRING);
  const redis = new Redis({
    host: opts.host,
    port: opts.port,
    password: opts.password || undefined,
    ...(opts.useTls && { tls: {} }),
    retryStrategy: () => null,
    maxRetriesPerRequest: 1,
  });
  try {
    await redis.ping();
  } catch (err) {
    redis.disconnect();
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to connect to Redis at ${opts.host}:${opts.port}. ${msg}. Check REDIS_CONNECTION_STRING and network/firewall.`,
    );
  }
  redis.on("error", (err) => {
    console.error("[Redis] connection error:", err.message);
  });
  client = redis;
  return redis;
}

/**
 * Get the Redis client. Call connect() first or this may be null.
 */
export function getClient(): Redis | null {
  return client;
}

/**
 * Read a string value by key. Returns null if key does not exist.
 */
export async function read(key: string): Promise<string | null> {
  const r = client ?? (await connect());
  try {
    return await r.get(key);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Redis read failed for key "${key}": ${msg}`);
  }
}

/**
 * Write a string value for key. Optionally set TTL in seconds.
 */
export async function write(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const r = client ?? (await connect());
  try {
    if (ttlSeconds != null && ttlSeconds > 0) {
      await r.setex(key, ttlSeconds, value);
    } else {
      await r.set(key, value);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Redis write failed for key "${key}": ${msg}`);
  }
}

/**
 * Disconnect the client. Useful for graceful shutdown.
 */
export async function disconnect(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
