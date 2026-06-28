CREATE TYPE "public"."calendar_item_category" AS ENUM('meeting', 'design', 'planning', 'client', 'content', 'product', 'personal', 'other');--> statement-breakpoint
CREATE TYPE "public"."calendar_item_kind" AS ENUM('task', 'reminder');--> statement-breakpoint
CREATE TYPE "public"."calendar_item_status" AS ENUM('draft', 'scheduled');--> statement-breakpoint
CREATE TABLE "calendar_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"kind" "calendar_item_kind" DEFAULT 'task' NOT NULL,
	"category" "calendar_item_category" DEFAULT 'other' NOT NULL,
	"scheduled_date" date,
	"start_time" time,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"status" "calendar_item_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_items" ADD CONSTRAINT "calendar_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
