import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().min(1),
  OPENAI_API_KEY: z.string().min(1),
  EMAIL_USER: z.string().min(1),
  EMAIL_APP_PASSWORD: z.string().min(1),
});

export const env = envSchema.parse(process.env);
