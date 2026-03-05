import { app } from "./app.ts";
import { env } from "@/configs/env.ts";
import { redis } from "@/infra/redis/redis.client.ts";
import { disconnectSubscriber } from "@/infra/redis/redis.pubsub.ts";

const server = app.listen(env.PORT, () => console.log(`Server listening on port ${env.PORT}`));

let isShuttingDown = false;
async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log("Shutting down...");
  try {
    disconnectSubscriber();
    redis.disconnect();
  } catch (err) {
    console.error("Redis disconnect error:", err);
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
