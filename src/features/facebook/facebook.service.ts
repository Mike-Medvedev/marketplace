import { SessionNotLoadedError } from "@/shared/errors/errors.ts";
import logger from "@/infra/logger/logger.ts";
import { getSession } from "./facebook.repository.ts";
import {
  FIXED_HEADERS,
  BODY_DEFAULTS,
  FB_GRAPHQL_URL,
  REQUEST_SPECIFIC,
} from "./facebook.constants.ts";
import type { SessionConfig } from "./facebook.types.ts";

/** Builds request config from the Redis-backed Facebook session (set via /webhook/refresh). Returns null if no session. */
export async function getSessionConfig(): Promise<SessionConfig | null> {
  const raw = await getSession();
  if (!raw) {
    logger.debug("[session] No session in store (different instance or not yet refreshed?)");
    return null;
  }

  const cookie = raw.headers["cookie"] ?? raw.headers["Cookie"] ?? "";
  if (!cookie) {
    logger.info(
      "[session] Session exists but headers have no cookie — refresh payload may be wrong",
    );
    return null;
  }

  const params = new URLSearchParams(raw.body);
  const bodyParams: Record<string, string> = { ...BODY_DEFAULTS };
  for (const [key, value] of params) {
    bodyParams[key] = value;
  }

  const headers: Record<string, string> = {
    ...FIXED_HEADERS,
    "accept-language": raw.headers["accept-language"] ?? "en-US,en;q=0.9",
    "sec-ch-prefers-color-scheme": raw.headers["sec-ch-prefers-color-scheme"] ?? "dark",
    "sec-ch-ua": raw.headers["sec-ch-ua"] ?? "",
    "sec-ch-ua-full-version-list": raw.headers["sec-ch-ua-full-version-list"] ?? "",
    "sec-ch-ua-mobile": raw.headers["sec-ch-ua-mobile"] ?? "?0",
    "sec-ch-ua-model": raw.headers["sec-ch-ua-model"] ?? '""',
    "sec-ch-ua-platform": raw.headers["sec-ch-ua-platform"] ?? "",
    "sec-ch-ua-platform-version": raw.headers["sec-ch-ua-platform-version"] ?? "",
    "x-asbd-id": raw.headers["x-asbd-id"] ?? "",
  };

  return { cookie, headers, body: bodyParams };
}

async function requireSession(): Promise<SessionConfig> {
  const session = await getSessionConfig();
  if (!session) {
    throw new SessionNotLoadedError();
  }
  return session;
}

/** Session config for requests. Throws if no session has been set via /webhook/refresh. */
export function getSessionOrThrow(): Promise<SessionConfig> {
  return requireSession();
}

/**
 * Probes Facebook with a lightweight GraphQL request to check whether the
 * stored session is still accepted. Returns true if valid, false if expired
 * or missing.
 */
export async function isSessionValid(): Promise<boolean> {
  const session = await getSessionConfig();
  if (!session) return false;

  try {
    const body = new URLSearchParams({
      ...session.body,
      ...REQUEST_SPECIFIC.SEARCH,
      variables: JSON.stringify({ count: 0, cursor: null }),
    });

    const response = await fetch(FB_GRAPHQL_URL, {
      method: "POST",
      headers: {
        ...session.headers,
        cookie: session.cookie,
        "x-fb-friendly-name": REQUEST_SPECIFIC.SEARCH.fb_api_req_friendly_name,
        "x-fb-lsd": session.body.lsd ?? "",
      },
      body: body.toString(),
    });

    if (!response.ok) return false;

    const rawText = await response.text();
    const jsonText = rawText.startsWith("for (;;);") ? rawText.slice(9) : rawText;
    const json = JSON.parse(jsonText) as { error?: number };
    return json.error == null;
  } catch (error) {
    logger.warn("[session] Probe failed:", error);
    return false;
  }
}
