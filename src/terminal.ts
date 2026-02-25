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
  marketplaceSearchRequestConfig,
  marketplaceProductListingPhotosRequestConfig,
  marketplaceProductListingDescriptionRequestConfig,
} from "./requests";

import { readFile, writeFile } from "node:fs/promises";

import * as readline from "node:readline";
import { stdin } from "node:process";

readline.emitKeypressEvents(stdin);
if (stdin.isTTY) {
  stdin.setRawMode(true);
}

console.log("Press m to search, q to quit");

let nextCursor: string | null = null;
let counter = 0;

stdin.on("keypress", async (str, key) => {
  if (key?.name === "m") {
    console.log("Searching...");
    nextCursor = await search(nextCursor);
  }
  if (key?.name === "q") {
    console.log("Quitting...");
    await writeFile("./out.json", "{}");
    process.exit(0);
  }
});
async function search(c?: string | null) {
  // Step 1
  const search = await fetch(
    "https://www.facebook.com/api/graphql/",
    marketplaceSearchRequestConfig(c),
  );

  const searchJson = await search.json();
  const searchEdges = searchJson.data.marketplace_search.feed_units.edges;
  const cursor =
    searchJson.data.marketplace_search.feed_units.page_info.end_cursor;
  const searchListings = (searchEdges as []).reduce((acc, edge, index) => {
    const listing = edge.node.listing;
    acc[index] = {
      id: listing.id,
      url: `https://www.facebook.com/marketplace/item/${listing.id}/`,
      price: listing.listing_price.amount,
      title: listing.marketplace_listing_title,
      location: listing.location.reverse_geocode,
      primaryPhotoUri: listing.primary_listing_photo.image.uri,
    };
    return acc;
  }, []);

  const finalResult = await Promise.all(
    searchListings.map(async (listing: Record<any, any>) => {
      const photosPromise = fetchPhotos(listing.id);
      const descriptionPromise = fetchDescription(listing.id);
      const [photos, description] = await Promise.all([
        photosPromise,
        descriptionPromise,
      ]);
      return { ...listing, photos, description };
    }),
  );
  const data = await readFile("./out.json", "utf-8").catch(() => "{}");
  const obj = JSON.parse(data || "{}");
  obj[counter] = finalResult;
  await writeFile("./out.json", JSON.stringify(obj, null, 2));
  counter++;
  console.log("Done!");
  return cursor;
}

async function fetchPhotos(id: string) {
  const photos = await fetch(
    "https://www.facebook.com/api/graphql/",
    marketplaceProductListingPhotosRequestConfig(id),
  );
  const json = await photos.json();
  return json.data.viewer.marketplace_product_details_page.target.listing_photos.map(
    (photoData) => photoData.image,
  );
}

async function fetchDescription(id: string) {
  const res = await fetch(
    "https://www.facebook.com/api/graphql/",
    marketplaceProductListingDescriptionRequestConfig(id),
  );
  const json = await res.json();

  const pdp = json.data?.viewer?.marketplace_product_details_page;
  if (!pdp) return "";

  const target = pdp.target;

  return target?.redacted_description?.text ?? "";
}
