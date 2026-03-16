import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { env } from "@/configs/env.ts";
import logger from "@/infra/logger/logger.ts";

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  sessionId: string;
  vncUrl: string;
}

// Create a new Selenium session and connect Playwright to it via CDP
export async function connectBrowser(trackingId: string): Promise<BrowserSession> {
  logger.info(`[browser] Creating Selenium session (trackingId: ${trackingId})`);

  // Step 1: Create a session via Selenium Grid WebDriver protocol
  const res = await fetch(`${env.CHROMIUM_URL}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      capabilities: {
        alwaysMatch: {
          browserName: "chrome",
          "goog:chromeOptions": {
            args: [
              "--no-sandbox",
              "--disable-dev-shm-usage",
              "--disable-gpu",
              "--window-size=1920,1080",
            ],
          },
        },
      },
    }),
  });

  if (!res.ok) throw new Error(`Failed to create Selenium session: ${res.status}`);
  const { value } = (await res.json()) as { value: { sessionId: string } };
  const sessionId = value.sessionId;
  logger.info(`[browser] Selenium session created: ${sessionId}`);

  // Step 2: Connect Playwright to that session via CDP
  const cdpUrl = `${env.CHROMIUM_URL.replace("http://", "ws://").replace("https://", "wss://")}/session/${sessionId}/se/cdp`;
  const browser = await chromium.connectOverCDP(cdpUrl);
  const contexts = browser.contexts();
  const context = contexts[0] ?? (await browser.newContext());
  const page = context.pages()[0] ?? (await context.newPage());

  // The VNC stream URL for this specific session
  const vncUrl = `${env.CHROMIUM_URL}/session/${sessionId}/se/vnc`;

  logger.info(`[browser] Connected via CDP, VNC at: ${vncUrl}`);
  return { browser, context, page, sessionId, vncUrl };
}

// Returns the noVNC viewer URL to send to the frontend
export function getDebuggerUrl(sessionId: string): string {
  // Proxy this through your API since port 7900 isn't public
  return `${env.BASE_URL}/novnc/?autoconnect=1&resize=scale&password=secret`;
}

export async function closeBrowserSession(session: BrowserSession): Promise<void> {
  try {
    await session.context.close();
    logger.info("[browser] Context closed");
  } catch (err) {
    logger.warn("[browser] Failed to close context:", err);
  }

  // Delete the Selenium session to free the slot
  try {
    await fetch(`${env.CHROMIUM_URL}/session/${session.sessionId}`, {
      method: "DELETE",
    });
    logger.info(`[browser] Selenium session deleted: ${session.sessionId}`);
  } catch (err) {
    logger.warn("[browser] Failed to delete Selenium session:", err);
  }
}
