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
 * Reuses the default BrowserContext and its first page — the one visible
 * on the Xvfb/noVNC display. Only one sync session can hold the display
 * at a time (enforced by the VNC lock in the controller). This guarantees
 * the user only ever sees their own Facebook session on screen.
 */
export async function connectBrowser(): Promise<BrowserSession> {
  const browser = await getSharedBrowser();

  const contexts = browser.contexts();
  const context = contexts[0];
  if (!context) {
    throw new Error("No default browser context found on the Chromium instance");
  }

  const pages = context.pages();
  const page = pages[0] ?? (await context.newPage());

  logger.info("[browser] Acquired default context + page for sync session");
  return { browser, context, page };
}

/**
 * Clears the visible page back to about:blank after a sync session ends,
 * so no leftover Facebook content remains on screen for the next user.
 */
export async function closeBrowserSession(session: BrowserSession): Promise<void> {
  try {
    await session.page.goto("about:blank", { timeout: 5_000 }).catch(() => {});
    logger.info("[browser] Page reset to about:blank");
  } catch (error) {
    logger.warn("[browser] Failed to reset page:", error);
  }
}
