export interface FacebookSession {
  headers: Record<string, string>;
  body: string;
  capturedAt: string;
}

export interface SessionConfig {
  cookie: string;
  headers: Record<string, string>;
  body: Record<string, string>;
}
