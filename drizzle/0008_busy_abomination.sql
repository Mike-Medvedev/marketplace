-- Custom SQL migration file, put your code below! --
ALTER TABLE "searches" ALTER COLUMN "notification_type" SET DEFAULT 'none';--> statement-breakpoint