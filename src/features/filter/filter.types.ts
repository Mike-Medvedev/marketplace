import { z } from "zod";

export const ListingsModel = z.object({
  filtered: z.array(
    z.object({
      id: z.string(),
    }),
  ),
});
