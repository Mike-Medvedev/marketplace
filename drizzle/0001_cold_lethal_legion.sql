CREATE TYPE "public"."date_listed_option" AS ENUM('24h', '7d', '30d');--> statement-breakpoint
CREATE TYPE "public"."notification_method" AS ENUM('email', 'sms', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."search_frequency" AS ENUM('every_1h', 'every_2h', 'every_6h', 'every_12h', 'every_24h');--> statement-breakpoint
CREATE TYPE "public"."search_status" AS ENUM('running', 'refresh', 'error', 'needs_attention');--> statement-breakpoint
CREATE TABLE "facebook_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"headers" jsonb NOT NULL,
	"body" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facebook_sessions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "search_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"search_id" uuid NOT NULL,
	"redis_result_key" text NOT NULL,
	"listing_count" integer DEFAULT 0 NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"query" text NOT NULL,
	"location" text NOT NULL,
	"min_price" integer DEFAULT 0 NOT NULL,
	"max_price" integer,
	"date_listed" date_listed_option NOT NULL,
	"frequency" "search_frequency" NOT NULL,
	"listings_per_check" integer DEFAULT 24 NOT NULL,
	"notification_type" "notification_method" NOT NULL,
	"notification_target" text NOT NULL,
	"status" "search_status" DEFAULT 'running' NOT NULL,
	"last_run" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "facebook_sessions" ADD CONSTRAINT "facebook_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_runs" ADD CONSTRAINT "search_runs_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "searches" ADD CONSTRAINT "searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;