import type { SearchFrequency } from "@/features/searches/searches.types.ts";

export const FREQUENCY_MS: Record<SearchFrequency, number> = {
  every_1h: 3_600_000,
  every_2h: 7_200_000,
  every_6h: 21_600_000,
  every_12h: 43_200_000,
  every_24h: 86_400_000,
};

export const RESULTS_TTL_SECONDS = 604_800; // 7 days
