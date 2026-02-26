// Im going to make a program that does a facebook marketplace query given params and returns guitars with a title, price, descritpion, location and photos.
// Step1: Build a Marketplace search query with given params and authenticated session headers/cookie
// Step2: Get Response and extract listings from it
// Step 3; Filter out listings that are not vintage guitars
// Step4: Get title price location, id from listings
// Step5: For target ID make query for listing photos and descriptions
// Step6: aggregate data into one place and send it off for verification
// Step 7: verification pipeline with use roboflow to tell whether its vintage or not
// Step 8: roboflow calls webhook and notifies me with listing.
import { env } from "@/env.ts";
import { handleScrape } from "@/routes/scrape.ts";
import {
  handleAnalyzedListings,
  handleContainerStarted,
  handleRefresh,
} from "@/routes/webhooks.ts";
import express, { json } from "express";
import errorHandler from "@/middleware/error.middleware";

export { getSession } from "@/session-store.ts";

const app = express();
app.use(json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

app.post("/scrape", (req, res, next) => {
  handleScrape(req, res).catch(next);
});

app.post("/webhook/analyzed-listings", (req, res, next) => {
  handleAnalyzedListings(req, res).catch(next);
});
app.post("/webhook/container-started", (req, res, next) => {
  handleContainerStarted(req, res).catch(next);
});
app.post("/webhook/refresh", (req, res, next) => {
  handleRefresh(req, res).catch(next);
});

app.use(errorHandler);

const server = app.listen(env.PORT, () => console.log(`Server listening on port ${env.PORT}`));

let isShuttingDown = false;
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log("Shutting down...");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
