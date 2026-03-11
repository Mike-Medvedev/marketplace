import { app } from "./app.ts";
import { env } from "@/configs/env.ts";
import { redis } from "@/infra/redis/redis.client.ts";
import { disconnectSubscriber } from "@/infra/redis/redis.pubsub.ts";
import { cancelAll } from "@/features/scheduler/scheduler.service.ts";
import { client as db } from "@/infra/db/db.ts";
import logger from "@/logger/logger.ts";

const server = app.listen(env.PORT, () => {
  logger.info(`Server listening on port ${env.PORT}`);
});

let isShuttingDown = false;
async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info("Shutting down...");
  try {
    cancelAll();
    disconnectSubscriber();
    redis.disconnect();
  } catch (error) {
    logger.error("Redis disconnect error:", error);
  }
  try {
    await db.end();
  } catch (error) {
    logger.error("Database disconnect error:", error);
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
