import express, { json } from "express";
import cors from "cors";
import { swagger } from "meebo";
import "@/configs/meebo.config.ts";
import { responseHelpers } from "@/middleware/response.middleware.ts";
import errorHandler from "@/middleware/error.middleware.ts";
import { validateUser } from "@/middleware/auth.middleware.ts";
import { scrapeRouter } from "@/features/scrape/scrape.routes.ts";
import { searchesRouter } from "@/features/searches/searches.routes.ts";
import { usersRouter } from "@/features/users/users.routes.ts";
import { webhookRouter } from "@/features/webhooks/webhooks.routes.ts";
import { syncRouter } from "@/features/sync/sync.routes.ts";
import { facebookRouter } from "@/features/facebook/facebook.routes.ts";
import logger from "@/infra/logger/logger.ts";
import packageJson from "../package.json" with { type: "json" };
import { createProxyMiddleware } from "http-proxy-middleware";
import { env } from "@/configs/env";

const app = express();
app.use(json());
app.use(cors());
app.use(responseHelpers);

app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, data: { status: "healthy" } });
});
interface ChromiumVersionResponse {
  Browser: string;
  "Protocol-Version": string;
  webSocketDebuggerUrl: string;
}

app.get("/chromium-test", async (_req, res) => {
  try {
    const r = await fetch(`${env.CHROMIUM_CDP_URL}/json/version`);

    if (!r.ok) {
      throw new Error(`Chromium returned ${r.status}`);
    }

    const data = (await r.json()) as ChromiumVersionResponse;

    res.json({
      success: true,
      message: "Chromium reachable",
      browser: data.Browser,
      protocolVersion: data["Protocol-Version"],
      webSocketDebuggerUrl: data.webSocketDebuggerUrl,
    });
  } catch (err) {
    console.error("chromium-test failed", err);

    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
// Proxy everything starting with /vnc/ to the target
app.use(
  "/vnc",
  createProxyMiddleware({
    target: "http://127.0.0.1:6080",
    changeOrigin: true,
    ws: true,
    pathRewrite: {
      "^/vnc": "", // Optional: rewrites /vnc/vnc.html to /vnc.html
    },
  }),
);
app.use("/webhook", webhookRouter);

app.use("/api/v1", validateUser, scrapeRouter);
app.use("/api/v1", validateUser, syncRouter);
app.use("/api/v1", validateUser, facebookRouter);
app.use("/api/v1/searches", validateUser, searchesRouter);
app.use("/api/v1/users", validateUser, usersRouter);

app.use(swagger("MarketScrape", { bearerAuth: true, version: packageJson.version }));
app.use(errorHandler);

export { app };
