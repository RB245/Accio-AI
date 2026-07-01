import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  time,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id"),
  name: text("name"),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  authorId: serial("author_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const calendarItemKind = pgEnum("calendar_item_kind", [
  "task",
  "reminder",
]);

export const calendarItemCategory = pgEnum("calendar_item_category", [
  "meeting",
  "design",
  "planning",
  "client",
  "content",
  "product",
  "personal",
  "other",
]);

export const calendarItemStatus = pgEnum("calendar_item_status", [
  "draft",
  "scheduled",
]);

export const calendarItems = pgTable("calendar_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  kind: calendarItemKind("kind").notNull().default("task"),
  category: calendarItemCategory("category").notNull().default("other"),
  scheduledDate: date("scheduled_date"),
  startTime: time("start_time"),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  status: calendarItemStatus("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kanbanTaskPriority = pgEnum("kanban_task_priority", [
  "low",
  "medium",
  "high",
]);

export const kanbanCollaboratorRole = pgEnum("kanban_collaborator_role", [
  "editor",
]);

export const kanbanBoards = pgTable("kanban_boards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#ef6f61"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kanbanColumns = pgTable("kanban_columns", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id")
    .notNull()
    .references(() => kanbanBoards.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#10a37f"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kanbanTasks = pgTable("kanban_tasks", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id")
    .notNull()
    .references(() => kanbanBoards.id, { onDelete: "cascade" }),
  columnId: integer("column_id")
    .notNull()
    .references(() => kanbanColumns.id, { onDelete: "cascade" }),
  linkedCalendarItemId: integer("linked_calendar_item_id").references(
    () => calendarItems.id,
    { onDelete: "set null" }
  ),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  priority: kanbanTaskPriority("priority").notNull().default("medium"),
  labels: jsonb("labels")
    .$type<Array<{ name: string; color: string }>>()
    .notNull()
    .default([]),
  position: integer("position").notNull().default(0),
  syncCalendar: boolean("sync_calendar").notNull().default(false),
  syncNotes: boolean("sync_notes").notNull().default(false),
  syncAi: boolean("sync_ai").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kanbanBoardCollaborators = pgTable(
  "kanban_board_collaborators",
  {
    id: serial("id").primaryKey(),
    boardId: integer("board_id")
      .notNull()
      .references(() => kanbanBoards.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull(),
    role: kanbanCollaboratorRole("role").notNull().default("editor"),
    invitedByUserId: integer("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    boardEmailUnique: uniqueIndex("kanban_board_collaborators_board_email_unique").on(table.boardId, table.email),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type CalendarItem = typeof calendarItems.$inferSelect;
export type NewCalendarItem = typeof calendarItems.$inferInsert;
export type KanbanBoard = typeof kanbanBoards.$inferSelect;
export type NewKanbanBoard = typeof kanbanBoards.$inferInsert;
export type KanbanColumn = typeof kanbanColumns.$inferSelect;
export type NewKanbanColumn = typeof kanbanColumns.$inferInsert;
export type KanbanTask = typeof kanbanTasks.$inferSelect;
export type NewKanbanTask = typeof kanbanTasks.$inferInsert;
export type KanbanBoardCollaborator =
  typeof kanbanBoardCollaborators.$inferSelect;
export type NewKanbanBoardCollaborator =
  typeof kanbanBoardCollaborators.$inferInsert;
