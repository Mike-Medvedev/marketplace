import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { env } from "@/configs/env.ts";
import logger from "@/infra/logger/logger.ts";

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export function getDebuggerUrl(trackingId: string): string {
  const httpBase = env.BROWSERLESS_WS_URL
    .replace("wss://", "https://")
    .replace("ws://", "http://")
    .replace(/\/+$/, "");
  return `${httpBase}/debugger/?token=${env.BROWSERLESS_TOKEN}&id=${trackingId}`;
}

export async function connectBrowser(trackingId: string): Promise<BrowserSession> {
  const wsUrl = `${env.BROWSERLESS_WS_URL}?token=${env.BROWSERLESS_TOKEN}&trackingId=${trackingId}`;
  logger.info(`[browser] Connecting to Browserless (trackingId: ${trackingId}, url: ${env.BROWSERLESS_WS_URL}, tokenLength: ${env.BROWSERLESS_TOKEN?.length})`);

  const browser = await chromium.connectOverCDP(wsUrl);
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
    timezoneId: "America/New_York",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  logger.info("[browser] Connected and context created");
  return { browser, context, page };
}

export async function closeBrowserSession(session: BrowserSession): Promise<void> {
  try {
    await session.context.close();
    logger.info("[browser] Context closed");
  } catch (error) {
    logger.warn("[browser] Failed to close context:", error);
  }
}
