import "dotenv/config";
import { envSchema } from "./env.types.ts";

export const env = envSchema.parse(process.env);
