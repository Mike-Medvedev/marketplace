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
  marketplaceSearchRequestConfig,
  marketplaceProductListingPhotosRequestConfig,
  marketplaceProductListingDescriptionRequestConfig,
} from "@/requests";

import {
  searchMarketPlace,
  filterListings,
  analyzeListings,
  notifyMe,
} from "@/functions";

import express from "express";
const app = express();

/**
 * Fetches facebook marketplace listings and analyzes images with vision learning model
 * @returns void
 */
app.post("/scrape", async () => {
  searchMarketPlace()
    .then(() => filterListings())
    .then(() => analyzeListings())
    .then(() => notifyMe())
    .catch((error) => console.log(error));
});

const server = app.listen(env.PORT, () =>
  console.log(`Server listening on port ${env.PORT}`),
);
process.on("SIGTERM", () => {
  console.log("SIGINT SIGNALED, gracefully shutting down...");
  server.close();
});

process.on("SIGINT", () => {
  console.log("SIGINT SIGNALED, gracefully shutting down...");
  server.close();
});
