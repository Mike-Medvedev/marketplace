import { timestamp, pgTable, varchar, uuid, text, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid().primaryKey(), // UUID from Supabase Auth - no default, you provide it
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone").unique(),
  email: text().unique(),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  isPremium: boolean("is_premium").default(false),
});
