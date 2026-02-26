import { getSession } from "@/session-store.ts";

export interface SessionConfig {
  cookie: string;
  headers: Record<string, string>;
  body: Record<string, string>;
}

const FIXED_HEADERS: Record<string, string> = {
  accept: "*/*",
  "cache-control": "no-cache",
  "content-type": "application/x-www-form-urlencoded",
  pragma: "no-cache",
  priority: "u=1, i",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
};

const BODY_DEFAULTS: Record<string, string> = {
  __aaid: "0",
  __a: "1",
  dpr: "2",
  __ccg: "EXCELLENT",
  __spin_b: "trunk",
};

/** Builds request config from the in-memory Facebook session (set via /webhook/refresh). Returns null if no session. */
export function getSessionConfig(): SessionConfig | null {
  const raw = getSession();
  if (!raw) return null;

  const cookie =
    raw.headers["cookie"] ?? raw.headers["Cookie"] ?? "";
  if (!cookie) return null;

  const params = new URLSearchParams(raw.body);
  const bodyParams: Record<string, string> = { ...BODY_DEFAULTS };
  for (const [key, value] of params) {
    bodyParams[key] = value;
  }

  const headers: Record<string, string> = {
    ...FIXED_HEADERS,
    "accept-language": raw.headers["accept-language"] ?? "en-US,en;q=0.9",
    "sec-ch-prefers-color-scheme":
      raw.headers["sec-ch-prefers-color-scheme"] ?? "dark",
    "sec-ch-ua": raw.headers["sec-ch-ua"] ?? "",
    "sec-ch-ua-full-version-list":
      raw.headers["sec-ch-ua-full-version-list"] ?? "",
    "sec-ch-ua-mobile": raw.headers["sec-ch-ua-mobile"] ?? "?0",
    "sec-ch-ua-model": raw.headers["sec-ch-ua-model"] ?? '""',
    "sec-ch-ua-platform": raw.headers["sec-ch-ua-platform"] ?? "",
    "sec-ch-ua-platform-version":
      raw.headers["sec-ch-ua-platform-version"] ?? "",
    "x-asbd-id": raw.headers["x-asbd-id"] ?? "",
  };

  return { cookie, headers, body: bodyParams };
}

function requireSession(): SessionConfig {
  const session = getSessionConfig();
  if (!session) {
    throw new Error(
      "Facebook session not loaded. POST session data to /webhook/refresh first.",
    );
  }
  return session;
}

/** Session config for requests. Throws if no session has been set via /webhook/refresh. */
export function getSessionOrThrow(): SessionConfig {
  return requireSession();
}
