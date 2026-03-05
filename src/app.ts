import express, { json } from "express";
import cors from "cors";
import { swagger } from "meebo";
import "@/configs/meebo.config.ts";
import errorHandler from "@/middleware/error.middleware.ts";
import { scrapeRouter } from "@/features/scrape/scrape.routes.ts";
import { searchesRouter } from "@/features/searches/searches.routes.ts";
import { webhookRouter } from "@/features/webhooks/webhooks.routes.ts";
import packageJson from "../package.json" with { type: "json" };

const app = express();
app.use(json());
app.use(cors());

app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, data: { status: "healthy" } });
});

app.use("/api/v1", scrapeRouter);
app.use("/api/v1/searches", searchesRouter);
app.use("/webhook", webhookRouter);

app.use(swagger("MarketScrape", { bearerAuth: false, version: packageJson.version }));
app.use(errorHandler);

export { app };
