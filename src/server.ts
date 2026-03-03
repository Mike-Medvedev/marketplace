// Im going to make a program that does a facebook marketplace query given params and returns guitars with a title, price, descritpion, location and photos.
// Step1: Build a Marketplace search query with given params and authenticated session headers/cookie
// Step2: Get Response and extract listings from it
// Step 3; Filter out listings that are not vintage guitars
// Step4: Get title price location, id from listings
// Step5: For target ID make query for listing photos and descriptions
// Step6: aggregate data into one place and send it off for verification
// Step 7: verification pipeline with use roboflow to tell whether its vintage or not
// Step 8: roboflow calls webhook and notifies me with listing.
import {
  searchMarketPlaceParamsSchema,
  searchMarketPlaceResultSchema,
} from "@/functions/search/search.schema";
import { env } from "@/env.ts";
import { redis } from "@/redis.ts";
import { handleScrape } from "@/routes/scrape.ts";
import {
  handleAnalyzedListings,
  handleContainerStarted,
  handleRefresh,
} from "@/routes/webhooks.ts";
import { searchesRouter } from "@/searches/searches.router.ts";
import express, { json } from "express";
import errorHandler from "@/middleware/error.middleware";
import { TypedRouter, swagger } from "meebo";

export { getSession } from "@/session-store.ts";
import packageJson from "../package.json" with { type: "json" };

const app = express();
app.use(json());
const v1Router = TypedRouter(express.Router());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

v1Router.post(
  "/scrape",
  {
    request: searchMarketPlaceParamsSchema,
    response: searchMarketPlaceResultSchema,
    summary: "Searches Marketplace and returns listings",
  },
  (req, res, next) => {
    handleScrape(req, res).catch(next);
  },
);

v1Router.post("/webhook/analyzed-listings", { skipValidation: true }, (req, res, next) => {
  handleAnalyzedListings(req, res).catch(next);
});
v1Router.post("/webhook/container-started", { skipValidation: true }, (req, res, next) => {
  handleContainerStarted(req, res).catch(next);
});
v1Router.post("/webhook/refresh", { skipValidation: true }, (req, res, next) => {
  handleRefresh(req, res).catch(next);
});

v1Router.use("/searches", searchesRouter);

app.use("/api/v1", v1Router);
app.use(swagger("MarketScrape", { bearerAuth: false, version: packageJson.version }));
app.use(errorHandler);

const server = app.listen(env.PORT, () => console.log(`Server listening on port ${env.PORT}`));

let isShuttingDown = false;
async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log("Shutting down...");
  try {
    redis.disconnect();
  } catch (err) {
    console.error("Redis disconnect error:", err);
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
