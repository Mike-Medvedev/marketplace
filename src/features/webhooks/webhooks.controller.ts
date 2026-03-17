import { setSession } from "@/features/facebook/facebook.repository.ts";
import { publishSyncEvent } from "@/infra/redis/redis.pubsub.ts";
import { filterListingsViaRoboflow } from "@/features/analysis/analysis.service.ts";
import logger from "@/infra/logger/logger.ts";
import type { AnalysisWebhookRequest } from "@/features/analysis/analysis.types.ts";
import type { Request, Response } from "express";

export const WebhooksController = {
  async handleAnalyzedListings(req: Request, res: Response) {
    logger.info("Received analyzed listings in webhook, notifying user");
    logger.info(req.body);
    res.success(null);
  },

  async handleRoboflowFilter(req: Request<unknown, unknown, AnalysisWebhookRequest>, res: Response) {
    const { searchId, runId, listings } = req.body;
    logger.info(
      `[roboflow-filter] Received ${listings.length} listings for search ${searchId}, run ${runId}`,
    );

    const filtered = await filterListingsViaRoboflow(listings);

    logger.info(
      `[roboflow-filter] Returning ${filtered.length}/${listings.length} listings for search ${searchId}`,
    );
    res.json({ listings: filtered });
  },

  async handleRefresh(req: Request, res: Response) {
    const { userId, headers, body, capturedAt } = req.body;

    if (!headers || !body) {
      logger.warn("[refresh] Received invalid session data");
      res.error(400, new Error("Missing headers or body"));
      return;
    }

    if (!userId) {
      logger.warn("[refresh] No userId in payload");
      res.error(400, new Error("Missing userId in refresh payload"));
      return;
    }

    await setSession(userId, { headers, body, capturedAt });
    logger.info(`[refresh] Session updated for user ${userId} at ${capturedAt}`);
    await publishSyncEvent({ type: "session_refreshed" });
    res.success(null);
  },
};
