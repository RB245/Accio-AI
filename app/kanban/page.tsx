import { asc, eq, inArray, or } from "drizzle-orm"

import {
  createKanbanBoard,
  deleteKanbanBoard,
  deleteKanbanColumn,
  deleteKanbanTask,
  getKanbanCollaborators,
  inviteKanbanCollaborator,
  moveKanbanTask,
  removeKanbanCollaborator,
  reorderKanbanColumns,
  saveKanbanBoard,
  saveKanbanColumn,
  saveKanbanTask,
} from "@/app/kanban/actions"
import { KanbanPage } from "@/components/kanban-page"
import { DashboardShell } from "@/components/dashboard-shell"
import { db, kanbanBoardCollaborators, kanbanBoards, kanbanColumns, kanbanTasks } from "@/db"
import { listKanbanBoardCollaborators } from "@/lib/kanban-collaboration"
import type { KanbanBoardView, KanbanCollaboratorView, KanbanColumnView, KanbanTaskView } from "@/lib/kanban-types"
import { syncCurrentUserByEmail } from "@/lib/sync-user"

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
    labels: Array.isArray(task.labels) ? task.labels : [],
    linkedCalendarItemId: task.linkedCalendarItemId ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}

export default async function KanbanRoute() {
  const result = await syncCurrentUserByEmail()

  if (!result.ok) {
    return (
      <DashboardShell activePage="kanban">
        <div className="grid min-h-screen place-items-center p-6">
          <div className="max-w-md rounded-lg border border-[#ded8ce] bg-[#f8f5ef] p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-[#f59e0b]">Task / Kanban</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#2b2824]">Sign in to organize your boards.</h1>
            <p className="mt-3 text-sm leading-6 text-[#756d64]">{result.error}</p>
          </div>
        </div>
      </DashboardShell>
    )
  }

  const collaboratorRows = await db
    .select()
    .from(kanbanBoardCollaborators)
    .where(or(eq(kanbanBoardCollaborators.userId, result.user.id), eq(kanbanBoardCollaborators.email, result.user.email)))

  const sharedBoardIds = collaboratorRows.map((row) => row.boardId)
  const boardWhere =
    sharedBoardIds.length > 0
      ? or(eq(kanbanBoards.userId, result.user.id), inArray(kanbanBoards.id, sharedBoardIds))
      : eq(kanbanBoards.userId, result.user.id)

  const [boards, columns, tasks] = await Promise.all([
    db
      .select()
      .from(kanbanBoards)
      .where(boardWhere)
      .orderBy(asc(kanbanBoards.createdAt)),
    db
      .select()
      .from(kanbanColumns)
      .orderBy(asc(kanbanColumns.position), asc(kanbanColumns.createdAt)),
    db
      .select()
      .from(kanbanTasks)
      .orderBy(asc(kanbanTasks.position), asc(kanbanTasks.createdAt)),
  ])

  const boardIds = new Set(boards.map((board) => board.id))
  const collaboratorEntries = await Promise.all(
    boards.map(async (board) => [board.id, await listKanbanBoardCollaborators(board)] as const)
  )
  const collaboratorsByBoard = Object.fromEntries(collaboratorEntries) as Record<number, KanbanCollaboratorView[]>

  return (
    <DashboardShell activePage="kanban">
      <KanbanPage
        initialBoards={boards.map(serializeBoard)}
        initialColumns={columns.filter((column) => boardIds.has(column.boardId)).map(serializeColumn)}
        initialTasks={tasks.filter((task) => boardIds.has(task.boardId)).map(serializeTask)}
        currentUser={{ id: result.user.id, name: result.user.name, email: result.user.email }}
        initialCollaboratorsByBoard={collaboratorsByBoard}
        createBoard={createKanbanBoard}
        deleteBoard={deleteKanbanBoard}
        inviteCollaborator={inviteKanbanCollaborator}
        removeCollaborator={removeKanbanCollaborator}
        getCollaborators={getKanbanCollaborators}
        saveBoard={saveKanbanBoard}
        saveColumn={saveKanbanColumn}
        deleteColumn={deleteKanbanColumn}
        reorderColumns={reorderKanbanColumns}
        saveTask={saveKanbanTask}
        deleteTask={deleteKanbanTask}
        moveTask={moveKanbanTask}
      />
    </DashboardShell>
  )
}
