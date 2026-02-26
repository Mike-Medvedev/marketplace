export interface FacebookSession {
  headers: Record<string, string>;
  body: string;
  capturedAt: string;
}

let facebookSession: FacebookSession | null = null;

export function getSession(): FacebookSession | null {
  return facebookSession;
}

export function setSession(session: FacebookSession): void {
  facebookSession = session;
}
