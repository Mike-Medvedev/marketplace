import nodemailer from "nodemailer";
import { env } from "@/configs/env.ts";
import type { NotificationMethod } from "@/features/searches/searches.types.ts";
import logger from "@/infra/logger/logger";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

interface ListingSummary {
  id: string;
  title: string;
  price: string;
  url: string;
}

export async function notify(
  method: NotificationMethod,
  target: string,
  searchQuery: string,
  listings: ListingSummary[],
): Promise<void> {
  if (listings.length === 0) return;

  switch (method) {
    case "email":
      return sendEmailNotification(target, searchQuery, listings);
    case "sms":
      return sendSmsNotification(target, searchQuery, listings);
    case "webhook":
      return sendWebhookNotification(target, searchQuery, listings);
  }
}

async function sendEmailNotification(
  to: string,
  searchQuery: string,
  listings: ListingSummary[],
): Promise<void> {
  const listingLines = listings
    .slice(0, 20)
    .map((l) => `• ${l.title} — $${l.price}\n  ${l.url}`)
    .join("\n");

  await transporter.sendMail({
    from: env.SMTP_USER,
    to,
    subject: `New Marketplace Listings: "${searchQuery}" (${listings.length} found)`,
    text: [
      `Your scheduled search for "${searchQuery}" found ${listings.length} listing(s).`,
      "",
      listingLines,
      listings.length > 20 ? `\n...and ${listings.length - 20} more` : "",
    ].join("\n"),
  });
  logger.info(`[notify] Email sent to ${to} for "${searchQuery}" (${listings.length} listings)`);
}

async function sendSmsNotification(
  _to: string,
  searchQuery: string,
  listings: ListingSummary[],
): Promise<void> {
  logger.warn(
    `[notify] SMS not configured. Would send to ${_to}: "${searchQuery}" found ${listings.length} listing(s)`,
  );
}

async function sendWebhookNotification(
  url: string,
  searchQuery: string,
  listings: ListingSummary[],
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ searchQuery, count: listings.length, listings }),
  });

  if (!response.ok) {
    throw new Error(`Webhook POST to ${url} failed: ${response.status} ${response.statusText}`);
  }

  logger.info(
    `[notify] Webhook delivered to ${url} for "${searchQuery}" (${listings.length} listings)`,
  );
}
