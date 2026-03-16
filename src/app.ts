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
app.get("/health/chromium", async (_req, res) => {
  const results: Record<string, unknown> = {};

  try {
    const r = await fetch(`${env.CHROMIUM_URL}/status`);
    results["selenium"] = await r.json();
  } catch (e) {
    results["selenium_error"] = (e as Error).message;
  }
  try {
    const r = await fetch("http://chromium-app:7900", {
      signal: AbortSignal.timeout(5000),
    });
    results["novnc_shortname_7900"] = r.status;
  } catch (e) {
    results["novnc_shortname_7900_error"] = (e as Error).message;
  }
  try {
    const r = await fetch("http://chromium-app:7900/vnc.html", {
      signal: AbortSignal.timeout(5000),
    });
    results["novnc_shortname_vnc_html"] = r.status;
  } catch (e) {
    results["novnc_shortname_vnc_html_error"] = (e as Error).message;
  }
  try {
    const r = await fetch(
      "http://chromium-app.internal.kindocean-fa25625e.eastus2.azurecontainerapps.io:7900",
      { signal: AbortSignal.timeout(5000) },
    );
    results["novnc_7900"] = r.status;
  } catch (e) {
    results["novnc_7900_error"] = (e as Error).message;
  }

  res.json(results);
});
app.use(
  "/novnc",
  createProxyMiddleware({
    target: "http://chromium-app.internal.kindocean-fa25625e.eastus2.azurecontainerapps.io:7900",
    changeOrigin: true,
    ws: true,
    pathRewrite: { "^/novnc": "" },
    on: {
      error(err, _req, res) {
        logger.error("[novnc-proxy] Proxy error:", err);

        if ("writeHead" in res && !res.headersSent) {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              error: { message: "noVNC proxy failed" },
            }),
          );
          return;
        }

        res.end();
      },
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
