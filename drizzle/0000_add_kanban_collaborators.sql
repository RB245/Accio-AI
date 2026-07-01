CREATE TYPE "public"."kanban_collaborator_role" AS ENUM ('editor');

CREATE TABLE IF NOT EXISTS "kanban_board_collaborators" (
  "id" serial PRIMARY KEY NOT NULL,
  "board_id" integer NOT NULL,
  "user_id" integer,
  "email" text NOT NULL,
  "role" "public"."kanban_collaborator_role" NOT NULL DEFAULT 'editor',
  "invited_by_user_id" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "kanban_board_collaborators"
  ADD CONSTRAINT "kanban_board_collaborators_board_id_kanban_boards_id_fk"
  FOREIGN KEY ("board_id") REFERENCES "public"."kanban_boards"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "kanban_board_collaborators"
  ADD CONSTRAINT "kanban_board_collaborators_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "kanban_board_collaborators"
  ADD CONSTRAINT "kanban_board_collaborators_invited_by_user_id_users_id_fk"
  FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "kanban_board_collaborators_board_email_unique"
  ON "kanban_board_collaborators" ("board_id", "email");
