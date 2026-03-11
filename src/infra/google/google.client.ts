import { env } from "@/configs/env.ts";
import { GeocodingError } from "@/shared/errors/errors";
import logger from "@/infra/logger/logger";

interface GeocodeResult {
  latitude: number;
  longitude: number;
  /** Facebook-compatible slug derived from the city name (e.g. "san-francisco"). */
  locationId: string;
}

interface GoogleGeocodeResponse {
  status: string;
  results: {
    geometry: { location: { lat: number; lng: number } };
    address_components: { long_name: string; types: string[] }[];
  }[];
}

/**
 * Geocodes a city/state string (e.g. "Stamford, CT") via Google Maps Geocoding API.
 * Returns lat/lng and a Facebook-compatible location slug.
 */
export async function geocodeCity(location: string): Promise<GeocodeResult> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", location);
  url.searchParams.set("key", env.GOOGLE_MAPS_API_KEY);

  const response = await fetch(url);
  if (!response.ok) {
    throw new GeocodingError(location, `Google Geocoding API returned ${response.status}`);
  }

  const json = (await response.json()) as GoogleGeocodeResponse;

  if (json.status !== "OK" || json.results.length === 0) {
    throw new GeocodingError(location, `No results (status: ${json.status})`);
  }

  const result = json.results[0]!;
  const { lat, lng } = result.geometry.location;

  const locality = result.address_components.find((c) => c.types.includes("locality"));
  const cityName = locality?.long_name ?? location;
  const locationId = cityName.toLowerCase().replace(/\s+/g, "-");

  logger.info(`[geocode] "${location}" -> lat=${lat}, lng=${lng}, slug="${locationId}"`);

  return { latitude: lat, longitude: lng, locationId };
}
