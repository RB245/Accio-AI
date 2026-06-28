import {
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  time,
  timestamp,
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type CalendarItem = typeof calendarItems.$inferSelect;
export type NewCalendarItem = typeof calendarItems.$inferInsert;
