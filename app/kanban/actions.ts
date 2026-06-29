"use server"

import { and, asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db, calendarItems, kanbanBoards, kanbanColumns, kanbanTasks } from "@/db"
import {
  boardColors,
  kanbanPriorities,
  labelColors,
  type KanbanBoardInput,
  type KanbanBoardCreateResult,
  type KanbanBoardView,
  type KanbanBoardUpdateInput,
  type KanbanColumnInput,
  type KanbanColumnView,
  type KanbanLabel,
  type KanbanPriority,
  type KanbanTaskInput,
  type KanbanTaskView,
} from "@/lib/kanban-types"
import { syncCurrentUserByEmail } from "@/lib/sync-user"

const defaultColumns = [
  { name: "Todo", color: "#ef6f61" },
  { name: "In Progress", color: "#f59e0b" },
  { name: "Done", color: "#10a37f" },
]

async function getCurrentDatabaseUser() {
  const result = await syncCurrentUserByEmail()

  if (!result.ok) {
    throw new Error(result.error)
  }

  return result.user
}

function serializeBoard(board: typeof kanbanBoards.$inferSelect): KanbanBoardView {
  return {
    ...board,
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
  }
}

function serializeColumn(column: typeof kanbanColumns.$inferSelect): KanbanColumnView {
  return {
    ...column,
    createdAt: column.createdAt.toISOString(),
    updatedAt: column.updatedAt.toISOString(),
  }
}

function serializeTask(task: typeof kanbanTasks.$inferSelect): KanbanTaskView {
  return {
    ...task,
    description: task.description ?? null,
    dueDate: task.dueDate ?? null,
    labels: cleanLabels(task.labels),
    linkedCalendarItemId: task.linkedCalendarItemId ?? null,
    priority: cleanPriority(task.priority),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}

function cleanColor(color: string, fallback: string) {
  const trimmed = color.trim()
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed : fallback
}

function cleanPriority(priority: string): KanbanPriority {
  return kanbanPriorities.includes(priority as KanbanPriority) ? (priority as KanbanPriority) : "medium"
}

function cleanLabels(labels: unknown): KanbanLabel[] {
  if (!Array.isArray(labels)) {
    return []
  }

  return labels
    .map((label) => {
      if (!label || typeof label !== "object") {
        return null
      }

      const value = label as Partial<KanbanLabel>
      const name = String(value.name ?? "").trim().slice(0, 24)

      if (!name) {
        return null
      }

      return {
        name,
        color: cleanColor(String(value.color ?? ""), labelColors[0]),
      }
    })
    .filter((label): label is KanbanLabel => Boolean(label))
    .slice(0, 6)
}

function cleanDate(date: string | null | undefined) {
  const trimmed = date?.trim()
  return trimmed && /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null
}

async function getBoardForUser(boardId: number, userId: number) {
  const [board] = await db
    .select()
    .from(kanbanBoards)
    .where(and(eq(kanbanBoards.id, boardId), eq(kanbanBoards.userId, userId)))
    .limit(1)

  if (!board) {
    throw new Error("Kanban board not found.")
  }

  return board
}

async function syncCalendarTask(
  userId: number,
  input: {
    title: string
    description: string | null
    dueDate: string | null
    syncCalendar: boolean
    linkedCalendarItemId?: number | null
  }
) {
  if (!input.syncCalendar || !input.dueDate) {
    return null
  }

  const values = {
    userId,
    title: input.title,
    description: input.description,
    kind: "task" as const,
    category: "planning" as const,
    scheduledDate: input.dueDate,
    startTime: null,
    durationMinutes: 30,
    status: "scheduled" as const,
    updatedAt: new Date(),
  }

  if (input.linkedCalendarItemId) {
    const [updated] = await db
      .update(calendarItems)
      .set(values)
      .where(and(eq(calendarItems.id, input.linkedCalendarItemId), eq(calendarItems.userId, userId)))
      .returning()

    if (updated) {
      return updated.id
    }
  }

  const [created] = await db.insert(calendarItems).values(values).returning()
  return created.id
}

export async function createKanbanBoard(input: KanbanBoardInput): Promise<KanbanBoardCreateResult> {
  const user = await getCurrentDatabaseUser()
  const name = input.name.trim()

  if (!name) {
    throw new Error("Board name is required.")
  }

  const [board] = await db
    .insert(kanbanBoards)
    .values({
      userId: user.id,
      name: name.slice(0, 80),
      color: cleanColor(input.color, boardColors[0]),
    })
    .returning()

  const columns = await db
    .insert(kanbanColumns)
    .values(
      defaultColumns.map((column, index) => ({
        boardId: board.id,
        name: column.name,
        color: column.color,
        position: index,
      }))
    )
    .returning()

  revalidatePath("/kanban")
  return {
    board: serializeBoard(board),
    columns: columns.map(serializeColumn),
  }
}

export async function deleteKanbanBoard(boardId: number) {
  const user = await getCurrentDatabaseUser()
  await getBoardForUser(boardId, user.id)

  await db.delete(kanbanBoards).where(and(eq(kanbanBoards.id, boardId), eq(kanbanBoards.userId, user.id)))

  revalidatePath("/kanban")
}

export async function saveKanbanBoard(input: KanbanBoardUpdateInput) {
  const user = await getCurrentDatabaseUser()
  await getBoardForUser(input.id, user.id)

  const name = input.name.trim()

  if (!name) {
    throw new Error("Board name is required.")
  }

  const [updated] = await db
    .update(kanbanBoards)
    .set({
      name: name.slice(0, 80),
      color: cleanColor(input.color, boardColors[0]),
      updatedAt: new Date(),
    })
    .where(and(eq(kanbanBoards.id, input.id), eq(kanbanBoards.userId, user.id)))
    .returning()

  if (!updated) {
    throw new Error("Board not found.")
  }

  revalidatePath("/kanban")
  return serializeBoard(updated)
}

export async function saveKanbanColumn(input: KanbanColumnInput) {
  const user = await getCurrentDatabaseUser()
  await getBoardForUser(input.boardId, user.id)

  const name = input.name.trim()
  if (!name) {
    throw new Error("Column name is required.")
  }

  const values = {
    name: name.slice(0, 40),
    color: cleanColor(input.color, "#10a37f"),
    updatedAt: new Date(),
  }

  if (input.id) {
    const [updated] = await db
      .update(kanbanColumns)
      .set(values)
      .where(and(eq(kanbanColumns.id, input.id), eq(kanbanColumns.boardId, input.boardId)))
      .returning()

    if (!updated) {
      throw new Error("Column not found.")
    }

    revalidatePath("/kanban")
    return serializeColumn(updated)
  }

  const columns = await db
    .select()
    .from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, input.boardId))
    .orderBy(asc(kanbanColumns.position))

  if (columns.length >= 5) {
    throw new Error("Boards can have a maximum of 5 columns.")
  }

  const [created] = await db
    .insert(kanbanColumns)
    .values({
      boardId: input.boardId,
      ...values,
      position: columns.length,
    })
    .returning()

  revalidatePath("/kanban")
  return serializeColumn(created)
}

export async function deleteKanbanColumn(boardId: number, columnId: number) {
  const user = await getCurrentDatabaseUser()
  await getBoardForUser(boardId, user.id)

  await db.delete(kanbanColumns).where(and(eq(kanbanColumns.id, columnId), eq(kanbanColumns.boardId, boardId)))

  const remaining = await db
    .select()
    .from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, boardId))
    .orderBy(asc(kanbanColumns.position))

  for (const [index, column] of remaining.entries()) {
    await db.update(kanbanColumns).set({ position: index }).where(eq(kanbanColumns.id, column.id))
  }

  revalidatePath("/kanban")
}

export async function reorderKanbanColumns(boardId: number, orderedColumnIds: number[]) {
  const user = await getCurrentDatabaseUser()
  await getBoardForUser(boardId, user.id)

  for (const [index, columnId] of orderedColumnIds.entries()) {
    await db
      .update(kanbanColumns)
      .set({ position: index, updatedAt: new Date() })
      .where(and(eq(kanbanColumns.id, columnId), eq(kanbanColumns.boardId, boardId)))
  }

  revalidatePath("/kanban")
}

export async function saveKanbanTask(input: KanbanTaskInput) {
  const user = await getCurrentDatabaseUser()
  await getBoardForUser(input.boardId, user.id)

  const [column] = await db
    .select()
    .from(kanbanColumns)
    .where(and(eq(kanbanColumns.id, input.columnId), eq(kanbanColumns.boardId, input.boardId)))
    .limit(1)

  if (!column) {
    throw new Error("Column not found.")
  }

  const title = input.title.trim()
  if (!title) {
    throw new Error("Task title is required.")
  }

  const description = input.description?.trim() || null
  const dueDate = cleanDate(input.dueDate)
  const values = {
    boardId: input.boardId,
    columnId: input.columnId,
    title: title.slice(0, 100),
    description,
    dueDate,
    priority: cleanPriority(input.priority),
    labels: cleanLabels(input.labels),
    syncCalendar: Boolean(input.syncCalendar),
    syncNotes: Boolean(input.syncNotes),
    syncAi: Boolean(input.syncAi),
    updatedAt: new Date(),
  }

  if (input.id) {
    const [current] = await db
      .select()
      .from(kanbanTasks)
      .where(and(eq(kanbanTasks.id, input.id), eq(kanbanTasks.boardId, input.boardId)))
      .limit(1)

    if (!current) {
      throw new Error("Task not found.")
    }

    const linkedCalendarItemId = await syncCalendarTask(user.id, {
      title: values.title,
      description,
      dueDate,
      syncCalendar: values.syncCalendar,
      linkedCalendarItemId: current.linkedCalendarItemId,
    })

    const [updated] = await db
      .update(kanbanTasks)
      .set({
        ...values,
        linkedCalendarItemId,
      })
      .where(and(eq(kanbanTasks.id, input.id), eq(kanbanTasks.boardId, input.boardId)))
      .returning()

    revalidatePath("/kanban")
    return serializeTask(updated)
  }

  const tasks = await db
    .select()
    .from(kanbanTasks)
    .where(and(eq(kanbanTasks.boardId, input.boardId), eq(kanbanTasks.columnId, input.columnId)))
    .orderBy(asc(kanbanTasks.position))

  const [created] = await db
    .insert(kanbanTasks)
    .values({
      ...values,
      position: tasks.length,
    })
    .returning()

  const linkedCalendarItemId = await syncCalendarTask(user.id, {
    title: created.title,
    description: created.description,
    dueDate: created.dueDate,
    syncCalendar: created.syncCalendar,
  })

  const finalTask = linkedCalendarItemId
    ? (
        await db
          .update(kanbanTasks)
          .set({ linkedCalendarItemId })
          .where(eq(kanbanTasks.id, created.id))
          .returning()
      )[0]
    : created

  revalidatePath("/kanban")
  return serializeTask(finalTask)
}

export async function deleteKanbanTask(boardId: number, taskId: number) {
  const user = await getCurrentDatabaseUser()
  await getBoardForUser(boardId, user.id)

  const [task] = await db
    .delete(kanbanTasks)
    .where(and(eq(kanbanTasks.id, taskId), eq(kanbanTasks.boardId, boardId)))
    .returning()

  if (!task) {
    throw new Error("Task not found.")
  }

  const remaining = await db
    .select()
    .from(kanbanTasks)
    .where(and(eq(kanbanTasks.boardId, boardId), eq(kanbanTasks.columnId, task.columnId)))
    .orderBy(asc(kanbanTasks.position))

  for (const [index, remainingTask] of remaining.entries()) {
    await db.update(kanbanTasks).set({ position: index }).where(eq(kanbanTasks.id, remainingTask.id))
  }

  revalidatePath("/kanban")
}

export async function moveKanbanTask(boardId: number, taskId: number, columnId: number, orderedTaskIds: number[]) {
  const user = await getCurrentDatabaseUser()
  await getBoardForUser(boardId, user.id)

  const [column] = await db
    .select()
    .from(kanbanColumns)
    .where(and(eq(kanbanColumns.id, columnId), eq(kanbanColumns.boardId, boardId)))
    .limit(1)

  if (!column) {
    throw new Error("Column not found.")
  }

  for (const [index, orderedTaskId] of orderedTaskIds.entries()) {
    await db
      .update(kanbanTasks)
      .set({ columnId, position: index, updatedAt: new Date() })
      .where(and(eq(kanbanTasks.id, orderedTaskId), eq(kanbanTasks.boardId, boardId)))
  }

  if (!orderedTaskIds.includes(taskId)) {
    await db
      .update(kanbanTasks)
      .set({ columnId, position: orderedTaskIds.length, updatedAt: new Date() })
      .where(and(eq(kanbanTasks.id, taskId), eq(kanbanTasks.boardId, boardId)))
  }

  revalidatePath("/kanban")
}
