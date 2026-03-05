import { z } from "zod";

export const ListingsModel = z.object({
  filtered: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      price: z.string(),
      title: z.string(),
      location: z.string(),
      primaryPhotoUri: z.string(),
    }),
  ),
});
