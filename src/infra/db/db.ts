import { env } from "@/configs/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export const client = postgres(env.DATABASE_URL, { prepare: false });
export const db = drizzle(client, { casing: "snake_case" });
export type DB = typeof db;
