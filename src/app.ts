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
app.get("/novnc-test", async (_req, res) => {
  try {
    const r = await fetch("http://chromium-app:7900/vnc.html");
    const html = await r.text();
    res.setHeader("Content-Type", r.headers.get("content-type") || "text/html");
    res.send(html);
  } catch (err) {
    console.error("novnc-test failed", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
app.use(
  "/novnc",
  createProxyMiddleware({
    target: "http://chromium-app:7900",
    changeOrigin: true,
    ws: true,
    secure: false,
    proxyTimeout: 30000,
    timeout: 30000,
    pathRewrite: (path) => path.replace(/^\/novnc/, ""),
    on: {
      error(err, req, res) {
        console.error("noVNC proxy error", {
          message: err.message,
          code: (err as NodeJS.ErrnoException).code,
          stack: err.stack,
          url: req.url,
        });

        if ("writeHead" in res && !res.headersSent) {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              error: {
                message: err.message,
                code: (err as NodeJS.ErrnoException).code,
              },
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
