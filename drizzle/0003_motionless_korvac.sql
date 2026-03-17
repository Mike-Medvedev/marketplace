CREATE TYPE "public"."filter_status" AS ENUM('none', 'pending', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "search_runs" ADD COLUMN "filtered_redis_result_key" text;--> statement-breakpoint
ALTER TABLE "search_runs" ADD COLUMN "filtered_listing_count" integer;--> statement-breakpoint
ALTER TABLE "search_runs" ADD COLUMN "filter_status" "filter_status" DEFAULT 'none' NOT NULL;