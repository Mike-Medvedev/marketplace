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

import {
  searchMarketPlace,
  filterListings,
  analyzeListings,
  notifyMe,
  logListings,
} from "@/functions";

import express, { json } from "express";
const app = express();
app.use(json());

/**
 * Fetches facebook marketplace listings and analyzes images with vision learning model
 */
app.post("/scrape", (req, res) => {
  searchMarketPlace({ pageCount: 1 })
    .then(({ pages }) => logListings(pages))
    .then((logged) => filterListings(logged))
    .then((filtered) => analyzeListings(filtered))
    .then((analyzed) => notifyMe(analyzed))
    .then((analyzed) => res.json({ listings: analyzed }))
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: String(error) });
    });
});

const server = app.listen(env.PORT, () => console.log(`Server listening on port ${env.PORT}`));

function shutdown() {
  console.log("Shutting down...");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
