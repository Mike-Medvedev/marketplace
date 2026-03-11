import { z } from "zod";
import { createSelectSchema, createUpdateSchema } from "drizzle-zod";

import { users } from "@/infra/db/schema.ts";

export const userSelectSchema = createSelectSchema(users);

export const userUpdateSchema = createUpdateSchema(users).pick({
  firstName: true,
  lastName: true,
  phone: true,
});

export type UserProfile = z.infer<typeof userSelectSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
