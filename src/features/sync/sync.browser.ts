import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { env } from "@/configs/env.ts";
import logger from "@/infra/logger/logger.ts";

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}
interface CDPVersionResponse {
  webSocketDebuggerUrl: string;
}
export async function connectBrowser(): Promise<BrowserSession> {
  logger.info(`[browser] Connecting via CDP to ${env.CHROMIUM_CDP_URL}`);

  // 1. Fetch metadata using localhost (or 127.0.0.1)
  const res = await fetch("127.0.0.1/json/version");
  if (!res.ok) {
    throw new Error(`Failed to fetch CDP metadata: ${res.status}`);
  }

  const meta = (await res.json()) as CDPVersionResponse;
  logger.info(meta);

  const wsEndpoint = new URL(meta.webSocketDebuggerUrl);
  wsEndpoint.hostname = "127.0.0.1";

  logger.info(`[browser] Connecting to WS endpoint: ${wsEndpoint.toString()}`);

  const browser = await chromium.connectOverCDP(wsEndpoint.toString());
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
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
