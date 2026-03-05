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

export class GeocodingError extends Error {
  public readonly location: string;
  constructor(location: string, detail?: string) {
    super(`Could not resolve location: "${location}"${detail ? ` — ${detail}` : ""}`);
    this.name = "GeocodingError";
    this.location = location;
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

export class UnauthorizedError extends Error {
  constructor(message: string = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class UserAlreadyExistsError extends Error {
  public readonly email: string;
  constructor(email: string) {
    super(`User already exists: ${email}`);
    this.name = "UserAlreadyExistsError";
    this.email = email;
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class EmailNotVerifiedError extends Error {
  constructor() {
    super("Email not verified. Please check your inbox for the verification link.");
    this.name = "EmailNotVerifiedError";
  }
}

export class VerificationTokenExpiredError extends Error {
  constructor() {
    super("Verification token is invalid or has expired");
    this.name = "VerificationTokenExpiredError";
  }
}

export class SchedulerError extends Error {
  public readonly searchId: string;
  constructor(searchId: string, detail?: string) {
    super(`Scheduler error for search ${searchId}${detail ? `: ${detail}` : ""}`);
    this.name = "SchedulerError";
    this.searchId = searchId;
  }
}

export class NotificationError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause: cause instanceof Error ? cause : undefined });
    this.name = "NotificationError";
  }
}
