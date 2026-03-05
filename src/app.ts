import express, { json } from "express";
import cors from "cors";
import { swagger } from "meebo";
import "@/configs/meebo.config.ts";
import errorHandler from "@/middleware/error.middleware.ts";
import { authMiddleware } from "@/middleware/auth.middleware.ts";
import { authRouter } from "@/features/auth/auth.routes.ts";
import { scrapeRouter } from "@/features/scrape/scrape.routes.ts";
import { searchesRouter } from "@/features/searches/searches.routes.ts";
import { webhookRouter } from "@/features/webhooks/webhooks.routes.ts";
import { syncRouter } from "@/features/sync/sync.routes.ts";
import packageJson from "../package.json" with { type: "json" };

const app = express();
app.use(json());
app.use(cors());

app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, data: { status: "healthy" } });
});

app.use("/api/v1/auth", authRouter);
app.use("/webhook", webhookRouter);

app.use("/api/v1", authMiddleware, scrapeRouter);
app.use("/api/v1", authMiddleware, syncRouter);
app.use("/api/v1/searches", authMiddleware, searchesRouter);

app.use(swagger("MarketScrape", { bearerAuth: true, version: packageJson.version }));
app.use(errorHandler);

export { app };
