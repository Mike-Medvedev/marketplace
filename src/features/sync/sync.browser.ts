import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { env } from "@/configs/env.ts";
import { acquireLock, del } from "@/infra/redis/redis.client.ts";
import { VNC_LOCK_KEY, SYNC_TIMEOUT_MS } from "./sync.constants.ts";
import logger from "@/infra/logger/logger.ts";

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  ownsVnc: boolean;
}

interface CDPVersionResponse {
  webSocketDebuggerUrl: string;
}

let sharedBrowser: Browser | null = null;

async function getSharedBrowser(): Promise<Browser> {
  if (sharedBrowser?.isConnected()) return sharedBrowser;

  logger.info(`[browser] Connecting via CDP to ${env.CHROMIUM_CDP_URL}`);
  const res = await fetch(`${env.CHROMIUM_CDP_URL}/json/version`);
  if (!res.ok) {
    throw new Error(`Failed to fetch CDP metadata: ${res.status}`);
  }

  const meta = (await res.json()) as CDPVersionResponse;
  const wsEndpoint = new URL(meta.webSocketDebuggerUrl);
  wsEndpoint.hostname = "127.0.0.1";

  logger.info(`[browser] Connecting to WS endpoint: ${wsEndpoint.toString()}`);
  sharedBrowser = await chromium.connectOverCDP(wsEndpoint.toString());

  sharedBrowser.on("disconnected", () => {
    logger.warn("[browser] CDP connection lost, will reconnect on next request");
    sharedBrowser = null;
  });

  return sharedBrowser;
}

/**
 * Creates an isolated BrowserContext + Page for the automated sync flow.
 * Copies cookies from the default Chromium context (the persistent profile)
 * so the isolated context inherits any existing Facebook session.
 * Multiple users can run this concurrently without seeing each other's pages.
 */
export async function connectBrowser(): Promise<BrowserSession> {
  const browser = await getSharedBrowser();

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
    timezoneId: "America/New_York",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    ignoreHTTPSErrors: true,
  });

  const defaultContext = browser.contexts()[0];
  if (defaultContext) {
    const cookies = await defaultContext.cookies().catch(() => []);
    if (cookies.length > 0) {
      await context.addCookies(cookies);
      logger.info(`[browser] Copied ${cookies.length} cookies from default context`);
    }
  }

  const page = await context.newPage();

  logger.info("[browser] Isolated context created for sync session");
  return { browser, context, page, ownsVnc: false };
}

/**
 * Acquires exclusive access to the visible Chromium page (the one shown
 * on the Xvfb/noVNC display) so a user can manually log in to Facebook.
 * Returns the display page, or null if another user already holds it.
 * The caller MUST call releaseDisplayPage() when done.
 */
export async function acquireDisplayPage(session: BrowserSession): Promise<Page | null> {
  const gotLock = await acquireLock(VNC_LOCK_KEY, "1", SYNC_TIMEOUT_MS / 1000);
  if (!gotLock) return null;

  const contexts = session.browser.contexts();
  const defaultContext = contexts[0];
  if (!defaultContext) {
    await del(VNC_LOCK_KEY).catch(() => {});
    return null;
  }

  const pages = defaultContext.pages();
  const displayPage = pages[0] ?? (await defaultContext.newPage());

  session.ownsVnc = true;
  logger.info("[browser] Acquired VNC display page for manual login");
  return displayPage;
}

/**
 * Releases the VNC display — navigates back to about:blank and drops the lock.
 */
export async function releaseDisplayPage(session: BrowserSession): Promise<void> {
  if (!session.ownsVnc) return;
  try {
    const contexts = session.browser.contexts();
    const defaultContext = contexts[0];
    if (defaultContext) {
      const pages = defaultContext.pages();
      if (pages[0]) {
        await pages[0].goto("about:blank", { timeout: 5_000 }).catch(() => {});
      }
    }
  } catch {
    logger.warn("[browser] Failed to reset display page");
  }
  await del(VNC_LOCK_KEY).catch(() => {});
  session.ownsVnc = false;
  logger.info("[browser] Released VNC display page");
}

export async function closeBrowserSession(session: BrowserSession): Promise<void> {
  await releaseDisplayPage(session);
  try {
    await session.context.close();
    logger.info("[browser] Context closed");
  } catch (error) {
    logger.warn("[browser] Failed to close context:", error);
  }
}
