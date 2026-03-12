import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { facebookSessions } from "@/infra/db/schema.ts";

export const facebookSessionSchema = createSelectSchema(facebookSessions);
export type FacebookSession = z.infer<typeof facebookSessionSchema>;

export const sessionStatusSchema = z.object({
  valid: z.boolean(),
});
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export interface SessionConfig {
  cookie: string;
  headers: Record<string, string>;
  body: Record<string, string>;
}
