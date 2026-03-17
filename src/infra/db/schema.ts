import {
  timestamp,
  pgTable,
  pgEnum,
  varchar,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const searchStatusEnum = pgEnum("search_status", [
  "running",
  "refresh",
  "error",
  "needs_attention",
]);

export const searchFrequencyEnum = pgEnum("search_frequency", [
  "every_1h",
  "every_2h",
  "every_6h",
  "every_12h",
  "every_24h",
]);

export const notificationMethodEnum = pgEnum("notification_method", [
  "email",
  "sms",
  "webhook",
]);

export const dateListedOptionEnum = pgEnum("date_listed_option", [
  "24h",
  "7d",
  "30d",
]);

export const users = pgTable("users", {
  id: uuid().primaryKey(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone").unique(),
  email: text().unique(),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  isPremium: boolean("is_premium").default(false),
});

export const searches = pgTable("searches", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  query: text().notNull(),
  location: text().notNull(),
  minPrice: integer("min_price").notNull().default(0),
  maxPrice: integer("max_price"),
  dateListed: dateListedOptionEnum("date_listed").notNull(),
  frequency: searchFrequencyEnum().notNull(),
  listingsPerCheck: integer("listings_per_check").notNull().default(24),
  notificationType: notificationMethodEnum("notification_type").notNull(),
  notificationTarget: text("notification_target").notNull(),
  prompt: text(),
  webhookFilterUrl: text("webhook_filter_url"),
  country: text(),
  status: searchStatusEnum().notNull().default("running"),
  lastRun: timestamp("last_run", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const filterStatusEnum = pgEnum("filter_status", [
  "none",
  "pending",
  "completed",
  "failed",
]);

export const searchRuns = pgTable("search_runs", {
  id: uuid().primaryKey().defaultRandom(),
  searchId: uuid("search_id")
    .notNull()
    .references(() => searches.id, { onDelete: "cascade" }),
  redisResultKey: text("redis_result_key").notNull(),
  listingCount: integer("listing_count").notNull().default(0),
  filteredRedisResultKey: text("filtered_redis_result_key"),
  filteredListingCount: integer("filtered_listing_count"),
  filterStatus: filterStatusEnum("filter_status").notNull().default("none"),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const facebookSessions = pgTable("facebook_sessions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  headers: jsonb().$type<Record<string, string>>().notNull(),
  body: text().notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
