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

export class EmailError extends Error {
  constructor(message: string, error?: unknown) {
    super(message, { cause: error instanceof Error ? error : undefined });
    this.name = "EmailError";
  }
}
