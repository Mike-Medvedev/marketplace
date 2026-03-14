import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { env } from "@/configs/env.ts";
import logger from "@/infra/logger/logger.ts";

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

function getBrowserlessHttpBase(): string {
  return env.BROWSERLESS_WS_URL
    .replace("wss://", "https://")
    .replace("ws://", "http://")
    .replace(/\/+$/, "");
}

export function getDebuggerUrl(trackingId: string): string {
  const externalBase = env.BROWSERLESS_WS_URL
    .replace("wss://", "https://")
    .replace("ws://", "http://")
    .replace(/\.internal\./, ".")
    .replace(/\/+$/, "");
  return `${externalBase}/debugger/?token=${env.BROWSERLESS_TOKEN}&id=${trackingId}`;
}

async function resolveWebSocketUrl(): Promise<string> {
  const httpBase = getBrowserlessHttpBase();
  const versionUrl = `${httpBase}/json/version?token=${env.BROWSERLESS_TOKEN}`;
  logger.info(`[browser] Fetching /json/version from ${httpBase}`);

  const res = await fetch(versionUrl);
  if (!res.ok) throw new Error(`Failed to fetch /json/version: ${res.status} ${res.statusText}`);

  const data = await res.json() as { webSocketDebuggerUrl?: string };
  const rawWsUrl = data.webSocketDebuggerUrl;
  if (!rawWsUrl) throw new Error("/json/version did not return webSocketDebuggerUrl");

  const wsPath = new URL(rawWsUrl).pathname;
  const base = env.BROWSERLESS_WS_URL.replace(/\/+$/, "");
  const resolvedUrl = `${base}${wsPath}?token=${env.BROWSERLESS_TOKEN}`;

  logger.info(`[browser] Resolved WS URL: ${resolvedUrl} (raw: ${rawWsUrl})`);
  return resolvedUrl;
}

export async function connectBrowser(trackingId: string): Promise<BrowserSession> {
  const wsUrl = await resolveWebSocketUrl();
  logger.info(`[browser] Connecting to Browserless (trackingId: ${trackingId})`);

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
