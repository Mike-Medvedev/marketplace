import { z } from "zod";
import { createSelectSchema } from "drizzle-orm/zod";
import { facebookSessions } from "@/infra/db/schema.ts";

export const facebookSessionSchema = createSelectSchema(facebookSessions);
export type FacebookSession = z.infer<typeof facebookSessionSchema>;

export interface SessionConfig {
  cookie: string;
  headers: Record<string, string>;
  body: Record<string, string>;
}
