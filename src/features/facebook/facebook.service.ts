import { SessionNotLoadedError } from "@/errors/errors.ts";
import logger from "@/logger/logger.ts";
import { getSession } from "./facebook.repository.ts";
import { FIXED_HEADERS, BODY_DEFAULTS } from "./facebook.constants.ts";
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
