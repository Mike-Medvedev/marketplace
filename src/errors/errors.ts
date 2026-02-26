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

export class NtfyError extends Error {
  constructor(message: string, error?: unknown) {
    super(message, { cause: error instanceof Error ? error : undefined });
    this.name = "NtfyError";
  }
}

export class SessionNotLoadedError extends Error {
  constructor(message: string = "Facebook session not loaded. POST session data to /webhook/refresh first.") {
    super(message);
    this.name = "SessionNotLoadedError";
  }
}
