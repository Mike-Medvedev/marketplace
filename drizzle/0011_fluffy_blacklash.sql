ALTER TABLE "search_runs" ADD COLUMN "new_listing_count" integer;--> statement-breakpoint
ALTER TABLE "searches" ADD COLUMN "deduplicate_results" boolean DEFAULT false NOT NULL;