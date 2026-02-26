import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().min(1),
  OPENAI_API_KEY: z.string().min(1),
  NTFY_TOPIC: z.string().min(1),
  REDIS_CONNECTION_STRING: z.string().min(1),
});

export const env = envSchema.parse(process.env);
