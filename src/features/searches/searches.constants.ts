interface CoverageCenter {
  lat: number;
  lng: number;
}

interface CountryCoverage {
  label: string;
  centers: CoverageCenter[];
}

export const COUNTRY_COVERAGE: Record<string, CountryCoverage> = {
  US: {
    label: "United States",
    centers: [
      { lat: 47.6, lng: -122.3 },
      { lat: 38.6, lng: -121.5 },
      { lat: 39.7, lng: -104.9 },
      { lat: 32.8, lng: -96.8 },
      { lat: 41.9, lng: -87.6 },
      { lat: 33.7, lng: -84.4 },
      { lat: 40.7, lng: -74.0 },
    ],
  },
};

export const SUPPORTED_COUNTRIES = Object.keys(COUNTRY_COVERAGE);
