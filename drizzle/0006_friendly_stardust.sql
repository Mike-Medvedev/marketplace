ALTER TABLE "users" DROP CONSTRAINT "users_phone_unique";--> statement-breakpoint
ALTER TABLE "searches" ALTER COLUMN "notification_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "searches" ALTER COLUMN "notification_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."notification_method";--> statement-breakpoint
CREATE TYPE "public"."notification_method" AS ENUM('email', 'webhook');--> statement-breakpoint
ALTER TABLE "searches" ALTER COLUMN "notification_type" SET DATA TYPE "public"."notification_method" USING "notification_type"::"public"."notification_method";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "phone";
