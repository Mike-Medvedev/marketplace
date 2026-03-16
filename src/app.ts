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
  try {
    const http = await fetch(
      "http://chromium-app.internal.kindocean-fa25625e.eastus2.azurecontainerapps.io:4444/status",
    );
    res.json({ http: http.status });
  } catch (e) {
    res.json({ http_error: (e as Error).message });
  }
});
app.use(
  "/novnc",
  createProxyMiddleware({
    target: "http://chromium-app.internal.kindocean-fa25625e.eastus2.azurecontainerapps.io:7900",
    changeOrigin: true,
    ws: true,
    pathRewrite: { "^/novnc": "" },
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
