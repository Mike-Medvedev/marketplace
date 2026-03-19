ALTER TYPE "public"."notification_method" ADD VALUE 'none' BEFORE 'email';--> statement-breakpoint

ALTER TABLE "searches" ALTER COLUMN "notification_target" DROP NOT NULL;