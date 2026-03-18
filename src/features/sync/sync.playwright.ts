import type { Page, BrowserContext, Request as PlaywrightRequest } from "playwright-core";
import { connectBrowser, closeBrowserSession, acquireDisplayPage, releaseDisplayPage } from "./sync.browser.ts";
import { setSession } from "@/features/facebook/facebook.repository.ts";
import { LOGIN_POLL_INTERVAL_MS, SESSION_CAPTURE_TIMEOUT_MS } from "./sync.constants.ts";
import logger from "@/infra/logger/logger.ts";

export type SyncStepCallback = (step: string, message: string) => void;

export interface SyncResult {
  success: boolean;
  needsLogin: boolean;
}

async function isLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();
  if (url.includes("/login") || url.includes("/checkpoint") || url.includes("/recover")) {
    return false;
  }

  const loginForm = await page
    .locator('form[action*="/login"], #login_form, input[name="email"]')
    .first()
    .isVisible()
    .catch(() => false);
  if (loginForm) return false;

  return page
    .locator(
      '[aria-label="Your profile"], [aria-label="Account"], [data-pagelet="ProfileTail"], ' +
        'a[href*="/marketplace"], [aria-label="Marketplace"], [role="navigation"]',
    )
    .first()
    .isVisible({ timeout: 8000 })
    .catch(() => false);
}

async function waitForLogin(page: Page, signal: AbortSignal): Promise<void> {
  logger.info("[playwright] Waiting for human to complete login...");
  while (!signal.aborted) {
    await new Promise((r) => setTimeout(r, LOGIN_POLL_INTERVAL_MS));
    if (signal.aborted) return;

    const url = page.url();
    if (url.includes("/login") || url.includes("/checkpoint") || url.includes("/recover")) {
      continue;
    }

    if (await isLoggedIn(page)) {
      logger.info("[playwright] Login detected!");
      return;
    }
  }
}

async function dismissNotificationPrompt(page: Page): Promise<void> {
  const blockButton = page.getByRole("button", { name: /^Block$/i });
  const closeButton = page.getByRole("button", { name: /^Close$/i });

  if (
    await blockButton
      .first()
      .isVisible({ timeout: 1500 })
      .catch(() => false)
  ) {
    await blockButton
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(1000);
    return;
  }

  if (
    await closeButton
      .first()
      .isVisible({ timeout: 1500 })
      .catch(() => false)
  ) {
    await closeButton
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(1000);
  }
}

function isAuthenticatedGraphQL(request: PlaywrightRequest, body: string): boolean {
  if (!request.url().includes("facebook.com/api/graphql")) return false;
  if (request.method() !== "POST") return false;
  if (!body.includes("fb_dtsg=")) return false;
  return true;
}

interface CapturedSession {
  headers: Record<string, string>;
  body: string;
  capturedAt: string;
}

function captureSession(page: Page, context: BrowserContext): Promise<CapturedSession> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Session capture timed out")),
      SESSION_CAPTURE_TIMEOUT_MS,
    );

    let cookieRetryCount = 0;
    const MAX_COOKIE_RETRIES = 3;

    const handler = async (request: PlaywrightRequest) => {
      const body = request.postData() ?? "";
      if (!isAuthenticatedGraphQL(request, body)) return;

      const reqHeaders = request.headers();
      let cookieHeader = reqHeaders["cookie"] ?? "";
      if (!cookieHeader) {
        const cookies = await context.cookies("https://www.facebook.com");
        cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
      }

      if (!cookieHeader) {
        cookieRetryCount++;
        if (cookieRetryCount <= MAX_COOKIE_RETRIES) {
          logger.debug(
            `[playwright] GraphQL has no cookies yet (attempt ${cookieRetryCount}/${MAX_COOKIE_RETRIES})`,
          );
          return;
        }
        logger.debug(
          `[playwright] Still no cookies after ${MAX_COOKIE_RETRIES} attempts, skipping`,
        );
        return;
      }

      clearTimeout(timeout);
      page.off("request", handler);

      const friendlyName = reqHeaders["x-fb-friendly-name"] || "unknown";
      logger.info(`[playwright] Captured authenticated GraphQL: ${friendlyName}`);

      resolve({
        headers: { ...reqHeaders, cookie: cookieHeader },
        body,
        capturedAt: new Date().toISOString(),
      });
    };

    page.on("request", handler);
  });
}

async function triggerMarketplaceGraphQL(page: Page): Promise<void> {
  logger.info("[playwright] Triggering authenticated GraphQL via marketplace interactions...");

  const searchBar = page.locator('input[type="search"][placeholder="Search Marketplace"]');
  if (
    await searchBar
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false)
  ) {
    await searchBar
      .first()
      .hover()
      .catch(() => {});
    await page.waitForTimeout(1000);
    await searchBar
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(3000);
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(1000);
  }

  const listingItems = page.locator('a[href*="/marketplace/item/"]');
  await page.waitForSelector('a[href*="/marketplace/item/"]', { timeout: 8000 }).catch(() => {});
  const listingCount = await listingItems.count().catch(() => 0);
  if (listingCount > 0) {
    logger.info(`[playwright] Hovering ${Math.min(listingCount, 5)} listings...`);
    for (let i = 0; i < Math.min(listingCount, 5); i++) {
      await listingItems
        .nth(i)
        .hover({ force: true })
        .catch(() => {});
      await page.waitForTimeout(1000);
    }
  }

  await page.evaluate("window.scrollBy(0, 600)").catch(() => {});
  await page.waitForTimeout(2000);
  await page.evaluate("window.scrollBy(0, 600)").catch(() => {});
  await page.waitForTimeout(2000);
}

/**
 * Runs the full Facebook identity sync flow against a remote Chromium instance.
 *
 * Uses an isolated BrowserContext so multiple users can sync concurrently.
 * If the user isn't logged in, acquires exclusive access to the visible
 * VNC display page for the manual login, then releases it immediately after.
 */
export async function performSync(
  userId: string,
  onStep: SyncStepCallback,
  signal: AbortSignal,
): Promise<SyncResult> {
  const session = await connectBrowser(userId);
  const { page, context } = session;

  try {
    onStep("checking_session", "Checking for existing session...");
    await page.goto("https://www.facebook.com/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(3000);
    await dismissNotificationPrompt(page);

    const alreadyLoggedIn = await isLoggedIn(page);

    if (!alreadyLoggedIn) {
      onStep("awaiting_login", "Login required. Acquiring browser display...");

      const displayPage = await acquireDisplayPage(session);
      if (!displayPage) {
        onStep("vnc_busy", "Another user is logging in. Please try again shortly.");
        return { success: false, needsLogin: true };
      }

      try {
        await displayPage.context().clearCookies({ domain: ".facebook.com" });

        await displayPage.goto("https://www.facebook.com/login", {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
        await displayPage.waitForTimeout(2000);
        await dismissNotificationPrompt(displayPage);

        onStep("needs_login", "Login required. Waiting for user to log in...");

        await waitForLogin(displayPage, signal);
        if (signal.aborted) return { success: false, needsLogin: true };

        onStep(
          "login_detected",
          'Login detected. If Facebook asks, click "Trust this device", "Save browser", or "Continue".',
        );
        await displayPage.waitForTimeout(5000);
        await dismissNotificationPrompt(displayPage);

        const defaultContext = displayPage.context();
        const cookies = await defaultContext.cookies("https://www.facebook.com");
        await context.addCookies(cookies);
      } finally {
        await releaseDisplayPage(session);
      }

      await page.goto("https://www.facebook.com/", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.waitForTimeout(3000);
    } else {
      onStep("session_restored", "Already logged in via saved profile.");
    }

    onStep("navigating_marketplace", "Navigating to Facebook Marketplace...");
    const sessionPromise = captureSession(page, context);
    await page.goto("https://www.facebook.com/marketplace/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(3000);
    await dismissNotificationPrompt(page);

    onStep("triggering_graphql", "Triggering authenticated requests...");
    await triggerMarketplaceGraphQL(page);

    const sessionData = await sessionPromise;
    onStep("session_captured", "Session captured successfully. Saving...");

    await setSession(userId, sessionData);
    onStep("done", "Session refresh complete.");

    return { success: true, needsLogin: false };
  } finally {
    await closeBrowserSession(session, userId);
  }
}
