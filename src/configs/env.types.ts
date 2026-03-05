import { z } from "zod";

export const envSchema = z.object({
  PORT: z.coerce.number().min(1),
  OPENAI_API_KEY: z.string().min(1),
  REDIS_CONNECTION_STRING: z.string().min(1),
  ROBOFLOW_API_KEY: z.string().min(1),
});
