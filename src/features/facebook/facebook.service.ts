import { SessionNotLoadedError } from "@/shared/errors/errors.ts";
import logger from "@/infra/logger/logger.ts";
import { getSession, hasSessionRow } from "./facebook.repository.ts";
import {
  FIXED_HEADERS,
  BODY_DEFAULTS,
  FB_GRAPHQL_URL,
  REQUEST_SPECIFIC,
} from "./facebook.constants.ts";
import type { SessionConfig } from "./facebook.types.ts";

export async function getSessionConfig(userId: string): Promise<SessionConfig | null> {
  const raw = await getSession(userId);
  if (!raw) {
    logger.debug("[session] No session in store for user");
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

async function requireSession(userId: string): Promise<SessionConfig> {
  const session = await getSessionConfig(userId);
  if (!session) {
    throw new SessionNotLoadedError();
  }
  return session;
}

export function getSessionOrThrow(userId: string): Promise<SessionConfig> {
  return requireSession(userId);
}

export async function hasSession(userId: string): Promise<boolean> {
  const session = await getSessionConfig(userId);
  return session !== null;
}

/** True if the user has ever synced (row exists), even if their session is expired/invalid. */
export { hasSessionRow } from "./facebook.repository.ts";

export async function isSessionValid(userId: string): Promise<boolean> {
  const session = await getSessionConfig(userId);
  if (!session) return false;

  try {
    const body = new URLSearchParams({
      ...session.body,
      ...REQUEST_SPECIFIC.ROOT_QUERY,
      variables: "{}",
    });

    const response = await fetch(FB_GRAPHQL_URL, {
      method: "POST",
      headers: {
        ...session.headers,
        cookie: session.cookie,
        "x-fb-friendly-name": REQUEST_SPECIFIC.ROOT_QUERY.fb_api_req_friendly_name,
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
