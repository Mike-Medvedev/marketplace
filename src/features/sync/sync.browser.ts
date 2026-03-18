import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { env } from "@/configs/env.ts";
import { acquireLock, del } from "@/infra/redis/redis.client.ts";
import { VNC_LOCK_KEY, SYNC_TIMEOUT_MS } from "./sync.constants.ts";
import logger from "@/infra/logger/logger.ts";

const PROFILE_DIR = env.CHROME_PROFILE_DIR ?? "";

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

function userProfilePath(userId: string): string {
  return join(PROFILE_DIR, `${userId}.json`);
}

async function loadStorageState(userId: string): Promise<string | undefined> {
  if (!PROFILE_DIR) return undefined;
  try {
    const data = await readFile(userProfilePath(userId), "utf-8");
    logger.info(`[browser] Loaded saved profile for user ${userId}`);
    return data;
  } catch {
    return undefined;
  }
}

async function saveStorageState(context: BrowserContext, userId: string): Promise<void> {
  if (!PROFILE_DIR) return;
  try {
    await mkdir(PROFILE_DIR, { recursive: true });
    const state = await context.storageState();
    await writeFile(userProfilePath(userId), JSON.stringify(state), "utf-8");
    logger.info(`[browser] Saved profile for user ${userId}`);
  } catch (error) {
    logger.warn(`[browser] Failed to save profile for user ${userId}:`, error);
  }
}

/**
 * Creates an isolated BrowserContext + Page for the automated sync flow.
 * If a saved profile exists for the user on the fileshare, restores it
 * so the user is already logged in. Multiple users can run concurrently
 * with fully isolated state.
 */
export async function connectBrowser(userId: string): Promise<BrowserSession> {
  const browser = await getSharedBrowser();

  const storageState = await loadStorageState(userId);

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
    timezoneId: "America/New_York",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    ignoreHTTPSErrors: true,
    ...(storageState ? { storageState: JSON.parse(storageState) } : {}),
  });

  const page = await context.newPage();

  logger.info(`[browser] Context created for user ${userId}`);
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

/**
 * Persists the user's browser state (cookies + localStorage) to the
 * fileshare, then closes the context.
 */
export async function closeBrowserSession(session: BrowserSession, userId: string): Promise<void> {
  await releaseDisplayPage(session);
  try {
    await saveStorageState(session.context, userId);
    await session.context.close();
    logger.info("[browser] Context closed");
  } catch (error) {
    logger.warn("[browser] Failed to close context:", error);
  }
}
