export class SearchMarketPlaceError extends Error {
  constructor(message: string, error?: unknown) {
    super(message, { cause: error instanceof Error ? error : undefined });
    this.name = "SearchMarketPlaceError";
  }
}

export class FetchListingPhotosError extends Error {
  constructor(message: string, error?: unknown) {
    super(message, { cause: error instanceof Error ? error : undefined });
    this.name = "FetchListingPhotosError";
  }
}

export class FetchListingDescriptionError extends Error {
  constructor(message: string, error?: unknown) {
    super(message, { cause: error instanceof Error ? error : undefined });
    this.name = "FetchListingDescriptionError";
  }
}

export class SessionNotLoadedError extends Error {
  constructor(message: string = "Facebook session not loaded. POST session data to /webhook/refresh first.") {
    super(message);
    this.name = "SessionNotLoadedError";
  }
}

/** Thrown when Facebook returns "Log in to continue" (e.g. error 1357001) — session expired or invalid. */
export class FacebookSessionExpiredError extends Error {
  public readonly facebookErrorCode?: number | undefined;
  public readonly errorSummary?: string | undefined;
  constructor(
    message: string = "Facebook session expired or invalid. Please refresh session via POST /webhook/refresh.",
    facebookErrorCode?: number,
    errorSummary?: string,
  ) {
    super(message);
    this.name = "FacebookSessionExpiredError";
    this.facebookErrorCode = facebookErrorCode;
    this.errorSummary = errorSummary;
  }
}

export class SearchNotFoundError extends Error {
  public readonly searchId: string;
  constructor(id: string) {
    super(`Search not found: ${id}`);
    this.name = "SearchNotFoundError";
    this.searchId = id;
  }
}
