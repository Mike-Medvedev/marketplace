import { z } from "zod";

export const envSchema = z.object({
  PORT: z.coerce.number().min(1),
  OPENAI_API_KEY: z.string().min(1),
  REDIS_CONNECTION_STRING: z.string().min(1),
  ROBOFLOW_API_KEY: z.string().min(1),

  CHROMIUM_URL: z.string().min(1),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().min(1),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),

  GOOGLE_MAPS_API_KEY: z.string().min(1),
  BASE_URL: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  SUPABASE_PROJECT_URL: z.string().min(1),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});
