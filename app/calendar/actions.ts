"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db, calendarItems } from "@/db"
import {
  allCalendarCategories,
  calendarKinds,
  type CalendarCategory,
  type CalendarItemInput,
  type CalendarItemView,
  type CalendarKind,
} from "@/lib/calendar-types"
import { syncCurrentUserByEmail } from "@/lib/sync-user"

type DatabaseCalendarCategory = typeof calendarItems.$inferInsert["category"]

const databaseCategoryByUiCategory: Record<string, DatabaseCalendarCategory> = {
  work: "planning",
  personal: "personal",
  focus: "content",
  meeting: "meeting",
  reminder: "other",
  design: "design",
  planning: "planning",
  client: "client",
  content: "content",
  product: "product",
  other: "other",
}

function serializeCalendarItem(item: typeof calendarItems.$inferSelect): CalendarItemView {
  return {
    ...item,
    description: item.description ?? null,
    scheduledDate: item.scheduledDate ?? null,
    startTime: item.startTime ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

function cleanKind(value: string): CalendarKind {
  return calendarKinds.includes(value as CalendarKind) ? (value as CalendarKind) : "task"
}

function cleanCategory(value: string): CalendarCategory {
  return allCalendarCategories.includes(value as CalendarCategory) ? (value as CalendarCategory) : "work"
}

function cleanDatabaseCategory(value: string): DatabaseCalendarCategory {
  return databaseCategoryByUiCategory[cleanCategory(value)] ?? "other"
}

function cleanInput(input: CalendarItemInput) {
  const title = input.title.trim()

  if (!title) {
    throw new Error("Task title is required.")
  }

  const scheduledDate = input.scheduledDate?.trim() || null
  const startTime = input.startTime?.trim() || null
  const durationMinutes = Number.isFinite(input.durationMinutes)
    ? Math.max(5, Math.min(720, Math.round(input.durationMinutes)))
    : 30

  return {
    title,
    description: input.description?.trim() || null,
    kind: cleanKind(input.kind),
    category: cleanDatabaseCategory(input.category),
    scheduledDate,
    startTime,
    durationMinutes,
    status: scheduledDate ? ("scheduled" as const) : ("draft" as const),
    updatedAt: new Date(),
  }
}

async function getCurrentDatabaseUser() {
  const result = await syncCurrentUserByEmail()

  if (!result.ok) {
    throw new Error(result.error)
  }

  return result.user
}

export async function saveCalendarItem(input: CalendarItemInput): Promise<CalendarItemView> {
  const user = await getCurrentDatabaseUser()
  const values = cleanInput(input)

  if (input.id) {
    const [updated] = await db
      .update(calendarItems)
      .set(values)
      .where(and(eq(calendarItems.id, input.id), eq(calendarItems.userId, user.id)))
      .returning()

    if (!updated) {
      throw new Error("Calendar item not found.")
    }

    revalidatePath("/calendar")
    return serializeCalendarItem(updated)
  }

  const [created] = await db
    .insert(calendarItems)
    .values({
      ...values,
      userId: user.id,
    })
    .returning()

  revalidatePath("/calendar")
  return serializeCalendarItem(created)
}

export async function moveCalendarItem(itemId: number, scheduledDate: string | null): Promise<CalendarItemView> {
  const user = await getCurrentDatabaseUser()
  const cleanDate = scheduledDate?.trim() || null
  const [updated] = await db
    .update(calendarItems)
    .set({
      scheduledDate: cleanDate,
      status: cleanDate ? "scheduled" : "draft",
      updatedAt: new Date(),
    })
    .where(and(eq(calendarItems.id, itemId), eq(calendarItems.userId, user.id)))
    .returning()

  if (!updated) {
    throw new Error("Calendar item not found.")
  }

  revalidatePath("/calendar")
  return serializeCalendarItem(updated)
}
