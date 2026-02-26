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
import { setSession } from "@/session-store.ts";

import { EmailError } from "@/errors/errors";
import { searchMarketPlace } from "@/functions";
import type { SearchMarketPlaceParams } from "@/functions/search/search.types";

import express, { json } from "express";
import logger from "@/logger/logger";
import errorHandler from "@/middleware/error.middleware";
import nodemailer from "nodemailer";
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_APP_PASSWORD,
  },
});

export { getSession } from "@/session-store.ts";
const app = express();
app.use(json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});
const SCRAPE_PARAM_KEYS: (keyof SearchMarketPlaceParams)[] = [
  "query",
  "locationId",
  "latitude",
  "longitude",
  "radiusKm",
  "minPrice",
  "cursor",
  "pageCount",
  "pageDelayMs",
  "listingFetchDelayMs",
];

function parseScrapeBody(body: unknown): SearchMarketPlaceParams {
  if (body == null || typeof body !== "object") return {};
  const raw = body as Record<string, unknown>;
  const params: SearchMarketPlaceParams = {};
  const numKeys = ["latitude", "longitude", "radiusKm", "minPrice", "pageCount", "pageDelayMs", "listingFetchDelayMs"] as const;
  for (const key of SCRAPE_PARAM_KEYS) {
    const v = raw[key];
    if (v === undefined) continue;
    if (numKeys.includes(key as (typeof numKeys)[number])) {
      const n = Number(v);
      if (!Number.isNaN(n)) (params as Record<string, number>)[key] = n;
    } else if (key === "cursor") {
      params.cursor = v === null || v === "" ? null : String(v);
    } else {
      (params as Record<string, string>)[key] = String(v);
    }
  }
  return params;
}

/**
 * Fetches facebook marketplace listings and analyzes images with vision learning model.
 * Accepts optional JSON body with search params: query, locationId, latitude, longitude,
 * radiusKm, minPrice, pageCount, pageDelayMs, listingFetchDelayMs, cursor.
 */
app.post("/scrape", async (req, res) => {
  logger.info("Request recieved, kicking off marketplace search...");

  const params = parseScrapeBody(req.body);
  const { listings } = await searchMarketPlace(params);
  // const filtered = await filterListings(listings);
  // const logged = await logListings(filtered);
  // const analyzed = await analyzeListings(filtered);
  // await notifyMe(analyzed);

  res.status(200).json({ listings });
});

app.post("/webhook/analyzed-listings", async (req, res) => {
  logger.info("Recieved analyzed listings in webhook, notifying user");
  logger.info(req.body);
  res.sendStatus(200);
});
app.post("/webhook/container-started", async (req, res) => {
  const { ip, novnc_url } = req.body;

  try {
    await transporter.sendMail({
      from: env.EMAIL_USER,
      to: env.EMAIL_USER,
      subject: "Facebook Login Required",
      html: `
        <h2>Facebook session refresh needed</h2>
        <p>Your container is ready. Click the link below to open the browser and log in:</p>
        <a href="${novnc_url}" style="font-size: 18px;">${novnc_url}</a>
        <p>Password: check your VNC_PASSWORD secret</p>
        <p>IP: ${ip}</p>
      `,
    });
  } catch (err) {
    throw new EmailError("Failed to send container-started notification email", err);
  }

  logger.info(`[container-started] Email sent for container at ${ip}`);
  res.json({ success: true });
});

app.post("/webhook/refresh", async (req, res) => {
  const { headers, body, capturedAt } = req.body;

  if (!headers || !body) {
    logger.warn("[refresh] Received invalid session data");
    res.status(400).json({ error: "Missing headers or body" });
    return;
  }

  setSession({ headers, body, capturedAt });
  logger.info(`[refresh] Session updated at ${capturedAt}`);
  res.json({ success: true });
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
