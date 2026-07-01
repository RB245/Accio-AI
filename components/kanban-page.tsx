"use client"

import {
  Bot,
  CalendarDays,
  Check,
  Columns3,
  Edit3,
  GripVertical,
  Link2,
  MessageCircle,
  Plus,
  StickyNote,
  Trash2,
  UserPlus,
  Users2,
  X,
} from "lucide-react"
import {
  LiveblocksProvider,
  RoomProvider,
  useBroadcastEvent,
  useEventListener,
  useMutation,
  useOthers,
  useSelf,
  useThreads,
  useUpdateMyPresence,
} from "@liveblocks/react"
import { Composer, Thread } from "@liveblocks/react-ui"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  boardColors,
  kanbanPriorities,
  labelColors,
  type KanbanBoardInput,
  type KanbanBoardCreateResult,
  type KanbanBoardView,
  type KanbanCollaboratorView,
  type KanbanCurrentUserView,
  type KanbanColumnInput,
  type KanbanColumnView,
  type KanbanLabel,
  type KanbanPriority,
  type KanbanTaskInput,
  type KanbanTaskView,
} from "@/lib/kanban-types"
import { cn } from "@/lib/utils"

type KanbanPageProps = {
  initialBoards: KanbanBoardView[]
  initialColumns: KanbanColumnView[]
  initialTasks: KanbanTaskView[]
  currentUser: KanbanCurrentUserView
  initialCollaboratorsByBoard: Record<number, KanbanCollaboratorView[]>
  createBoard: (input: KanbanBoardInput) => Promise<KanbanBoardCreateResult>
  deleteBoard: (boardId: number) => Promise<void>
  inviteCollaborator: (input: { boardId: number; email: string }) => Promise<KanbanCollaboratorView[]>
  removeCollaborator: (boardId: number, collaboratorId: number) => Promise<KanbanCollaboratorView[]>
  getCollaborators: (boardId: number) => Promise<KanbanCollaboratorView[]>
  saveBoard: (input: { id: number; name: string; color: string }) => Promise<KanbanBoardView>
  saveColumn: (input: KanbanColumnInput) => Promise<KanbanColumnView>
  deleteColumn: (boardId: number, columnId: number) => Promise<void>
  reorderColumns: (boardId: number, orderedColumnIds: number[]) => Promise<void>
  saveTask: (input: KanbanTaskInput) => Promise<KanbanTaskView>
  deleteTask: (boardId: number, taskId: number) => Promise<void>
  moveTask: (boardId: number, taskId: number, columnId: number, orderedTaskIds: number[]) => Promise<void>
}

type BoardDialog = {
  open: boolean
  id?: number
  name: string
  color: string
}

type ColumnDialog = {
  open: boolean
  id?: number
  boardId: number | null
  name: string
  color: string
}

type TaskDialog = {
  open: boolean
  id?: number
  boardId: number | null
  columnId: number | null
  title: string
  description: string
  dueDate: string
  priority: KanbanPriority
  labels: KanbanLabel[]
  syncCalendar: boolean
  syncNotes: boolean
  syncAi: boolean
}

type KanbanSyncPayload = {
  boardId: number
  boards: KanbanBoardView[]
  columns: KanbanColumnView[]
  tasks: KanbanTaskView[]
  collaborators: KanbanCollaboratorView[]
}

const emptyBoardDialog: BoardDialog = {
  open: false,
  name: "",
  color: boardColors[0],
}

const emptyColumnDialog: ColumnDialog = {
  open: false,
  boardId: null,
  name: "",
  color: "#10a37f",
}

function todayKey() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

function newTaskDialog(boardId: number, columnId: number): TaskDialog {
  return {
    open: true,
    boardId,
    columnId,
    title: "",
    description: "",
    dueDate: todayKey(),
    priority: "medium",
    labels: [],
    syncCalendar: false,
    syncNotes: false,
    syncAi: false,
  }
}

function priorityStyle(priority: KanbanPriority) {
  if (priority === "high") {
    return "bg-[#ffe1dc] text-[#b84236] border-[#f6b2aa]"
  }

  if (priority === "low") {
    return "bg-[#dff7ec] text-[#08785f] border-[#a7dfca]"
  }

  return "bg-[#fff1c7] text-[#946200] border-[#f6d47b]"
}

function labelText(priority: KanbanPriority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}

function sortColumns(columns: KanbanColumnView[]) {
  return [...columns].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt))
}

function sortTasks(tasks: KanbanTaskView[]) {
  return [...tasks].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt))
}

function upsertById<T extends { id: number }>(items: T[], item: T) {
  return items.some((current) => current.id === item.id)
    ? items.map((current) => (current.id === item.id ? item : current))
    : [...items, item]
}

function getRoomId(boardId: number) {
  return `kanban:board:${boardId}`
}

function initials(nameOrEmail: string) {
  const parts = nameOrEmail.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  return nameOrEmail.slice(0, 2).toUpperCase()
}

function taskThreadQuery(boardId: number, taskId: number) {
  return {
    metadata: {
      type: "kanban-task" as const,
      boardId,
      taskId,
    },
  }
}

function threadCommentCount(thread: { comments?: unknown[] }) {
  return thread.comments?.length ?? 0
}

function LiveblocksRoom({
  boardId,
  selectedTaskId,
  onSync,
  syncRef,
  children,
}: {
  boardId: number | null
  selectedTaskId: number | null
  onSync: (payload: KanbanSyncPayload) => void
  syncRef: React.MutableRefObject<((payload: KanbanSyncPayload) => void) | null>
  children: React.ReactNode
}) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      {boardId ? (
        <RoomProvider id={getRoomId(boardId)} initialPresence={{ selectedTaskId: null }} initialStorage={{ boardVersion: 0 }}>
          <KanbanPresenceBridge selectedTaskId={selectedTaskId} />
          <LiveKanbanSync boardId={boardId} onSync={onSync} syncRef={syncRef} />
          {children}
        </RoomProvider>
      ) : (
        children
      )}
    </LiveblocksProvider>
  )
}

function KanbanPresenceBridge({ selectedTaskId }: { selectedTaskId: number | null }) {
  const updateMyPresence = useUpdateMyPresence()

  React.useEffect(() => {
    updateMyPresence({ selectedTaskId })
  }, [selectedTaskId, updateMyPresence])

  return null
}

function LiveKanbanSync({
  boardId,
  onSync,
  syncRef,
}: {
  boardId: number
  onSync: (payload: KanbanSyncPayload) => void
  syncRef: React.MutableRefObject<((payload: KanbanSyncPayload) => void) | null>
}) {
  const broadcast = useBroadcastEvent()
  const bumpBoardVersion = useMutation(({ storage }) => {
    storage.set("boardVersion", Date.now())
  }, [])

  useEventListener(({ event }) => {
    if (event.type === "kanban-sync" && event.boardId === boardId) {
      onSync(event)
    }
  })

  React.useEffect(() => {
    syncRef.current = (payload) => {
      bumpBoardVersion()
      broadcast({ type: "kanban-sync", ...payload })
    }

    return () => {
      syncRef.current = null
    }
  }, [broadcast, bumpBoardVersion, syncRef])

  return null
}

export function KanbanPage({
  initialBoards,
  initialColumns,
  initialTasks,
  currentUser,
  initialCollaboratorsByBoard,
  createBoard,
  deleteBoard,
  inviteCollaborator,
  removeCollaborator,
  getCollaborators,
  saveBoard,
  saveColumn,
  deleteColumn,
  reorderColumns,
  saveTask,
  deleteTask,
  moveTask,
}: KanbanPageProps) {
  const [boards, setBoards] = React.useState(initialBoards)
  const [columns, setColumns] = React.useState(initialColumns)
  const [tasks, setTasks] = React.useState(initialTasks)
  const [selectedBoardId, setSelectedBoardId] = React.useState<number | null>(initialBoards[0]?.id ?? null)
  const [boardDialog, setBoardDialog] = React.useState<BoardDialog>(emptyBoardDialog)
  const [columnDialog, setColumnDialog] = React.useState<ColumnDialog>(emptyColumnDialog)
  const [taskDialog, setTaskDialog] = React.useState<TaskDialog | null>(null)
  const [collaborationOpen, setCollaborationOpen] = React.useState(false)
  const [collaboratorsByBoard, setCollaboratorsByBoard] = React.useState(initialCollaboratorsByBoard)
  const [newColumnName, setNewColumnName] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()
  const [selectedTaskId, setSelectedTaskId] = React.useState<number | null>(null)
  const liveSyncRef = React.useRef<((payload: KanbanSyncPayload) => void) | null>(null)
  const boardsRef = React.useRef(boards)
  const columnsRef = React.useRef(columns)
  const tasksRef = React.useRef(tasks)
  const collaboratorsRef = React.useRef(collaboratorsByBoard)

  const selectedBoard = boards.find((board) => board.id === selectedBoardId) ?? null
  const selectedCollaborators = selectedBoardId ? collaboratorsByBoard[selectedBoardId] ?? [] : []
  const selectedBoardOwner = selectedCollaborators.find((collaborator) => collaborator.isOwner)
  const canManageSelectedBoard = selectedBoardOwner?.userId === currentUser.id
  const boardColumns = selectedBoardId
    ? sortColumns(columns.filter((column) => column.boardId === selectedBoardId))
    : []
  const boardTasks = selectedBoardId ? tasks.filter((task) => task.boardId === selectedBoardId) : []

  function runAction(action: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Something went wrong.")
      }
    })
  }

  function submitBoard() {
    const name = boardDialog.name.trim()
    const color = boardDialog.color

    if (!name) {
      return
    }

    runAction(async () => {
      if (boardDialog.id) {
        const updated = await saveBoard({ id: boardDialog.id, name, color })
        const nextBoards = upsertById(boardsRef.current, updated)
        commitBoards(nextBoards)
        setSelectedBoardId(updated.id)
        publishKanbanSync(updated.id, {
          boards: nextBoards,
          columns: columnsRef.current,
          tasks: tasksRef.current,
          collaborators: collaboratorsRef.current[updated.id] ?? [],
        })
      } else {
        const created = await createBoard({ name, color })
        commitBoards([...boardsRef.current, created.board])
        commitColumns([...columnsRef.current, ...created.columns])
        setSelectedBoardId(created.board.id)
      }
      setBoardDialog(emptyBoardDialog)
    })
  }

  function openCreateBoardDialog() {
    setBoardDialog({ ...emptyBoardDialog, open: true })
  }

  function openEditBoardDialog(board: KanbanBoardView) {
    setBoardDialog({
      open: true,
      id: board.id,
      name: board.name,
      color: board.color,
    })
  }

  function removeBoard(board: KanbanBoardView) {
    const confirmed = window.confirm(`Delete "${board.name}" and all of its tasks?`)

    if (!confirmed) {
      return
    }

    runAction(async () => {
      await deleteBoard(board.id)
      const nextBoards = boardsRef.current.filter((item) => item.id !== board.id)
      const nextColumns = columnsRef.current.filter((column) => column.boardId !== board.id)
      const nextTasks = tasksRef.current.filter((task) => task.boardId !== board.id)
      commitBoards(nextBoards)
      commitColumns(nextColumns)
      commitTasks(nextTasks)
      setSelectedBoardId((current) => {
        if (current !== board.id) {
          return current
        }

        return nextBoards[0]?.id ?? null
      })
      publishKanbanSync(board.id, {
        boards: nextBoards,
        columns: nextColumns,
        tasks: nextTasks,
        collaborators: [],
      })
    })
  }

  function openEditColumnDialog(column: KanbanColumnView) {
    setColumnDialog({
      open: true,
      id: column.id,
      boardId: column.boardId,
      name: column.name,
      color: column.color,
    })
  }

  function submitInlineColumn() {
    if (!selectedBoardId || boardColumns.length >= 5) {
      return
    }

    const name = newColumnName.trim()
    if (!name) {
      return
    }

    runAction(async () => {
      const saved = await saveColumn({
        boardId: selectedBoardId,
        name,
        color: boardColors[boardColumns.length % boardColors.length],
      })
      const nextColumns = upsertById(columnsRef.current, saved)
      commitColumns(nextColumns)
      publishKanbanSync(selectedBoardId, {
        columns: nextColumns,
        collaborators: collaboratorsRef.current[selectedBoardId] ?? [],
      })
      setNewColumnName("")
    })
  }

  function submitColumn() {
    if (!columnDialog.boardId) {
      return
    }

    const boardId = columnDialog.boardId

    runAction(async () => {
      const saved = await saveColumn({
        id: columnDialog.id,
        boardId,
        name: columnDialog.name,
        color: columnDialog.color,
      })
      const nextColumns = upsertById(columnsRef.current, saved)
      commitColumns(nextColumns)
      publishKanbanSync(boardId, {
        columns: nextColumns,
        collaborators: collaboratorsRef.current[boardId] ?? [],
      })
      setColumnDialog(emptyColumnDialog)
    })
  }

  function removeColumn(column: KanbanColumnView) {
    const confirmed = window.confirm(`Delete "${column.name}" and its tasks?`)

    if (!confirmed) {
      return
    }

    runAction(async () => {
      await deleteColumn(column.boardId, column.id)
      const nextColumns = columnsRef.current.filter((item) => item.id !== column.id)
      const nextTasks = tasksRef.current.filter((task) => task.columnId !== column.id)
      commitColumns(nextColumns)
      commitTasks(nextTasks)
      publishKanbanSync(column.boardId, {
        columns: nextColumns,
        tasks: nextTasks,
        collaborators: collaboratorsRef.current[column.boardId] ?? [],
      })
    })
  }

  function shiftColumn(column: KanbanColumnView, direction: -1 | 1) {
    if (!selectedBoardId) {
      return
    }

    const index = boardColumns.findIndex((item) => item.id === column.id)
    const targetIndex = index + direction

    if (index < 0 || targetIndex < 0 || targetIndex >= boardColumns.length) {
      return
    }

    const nextColumns = [...boardColumns]
    const [moved] = nextColumns.splice(index, 1)
    nextColumns.splice(targetIndex, 0, moved)
    const orderedIds = nextColumns.map((item) => item.id)

    const reorderedColumns = columnsRef.current.map((item) => {
      const position = orderedIds.indexOf(item.id)
      return position >= 0 ? { ...item, position } : item
    })
    commitColumns(reorderedColumns)

    runAction(async () => {
      await reorderColumns(selectedBoardId, orderedIds)
      publishKanbanSync(selectedBoardId, {
        columns: reorderedColumns,
        collaborators: collaboratorsRef.current[selectedBoardId] ?? [],
      })
    })
  }

  function openEditTaskDialog(task: KanbanTaskView) {
    setSelectedTaskId(task.id)
    setTaskDialog({
      open: true,
      id: task.id,
      boardId: task.boardId,
      columnId: task.columnId,
      title: task.title,
      description: task.description ?? "",
      dueDate: task.dueDate ?? todayKey(),
      priority: task.priority,
      labels: task.labels,
      syncCalendar: task.syncCalendar,
      syncNotes: task.syncNotes,
      syncAi: task.syncAi,
    })
  }

  function submitTask() {
    if (!taskDialog?.boardId || !taskDialog.columnId) {
      return
    }

    const payload: KanbanTaskInput = {
      id: taskDialog.id,
      boardId: taskDialog.boardId,
      columnId: taskDialog.columnId,
      title: taskDialog.title,
      description: taskDialog.description,
      dueDate: taskDialog.dueDate,
      priority: taskDialog.priority,
      labels: taskDialog.labels,
      syncCalendar: taskDialog.syncCalendar,
      syncNotes: taskDialog.syncNotes,
      syncAi: taskDialog.syncAi,
    }

    runAction(async () => {
      const saved = await saveTask(payload)
      const nextTasks = upsertById(tasksRef.current, saved)
      commitTasks(nextTasks)
      publishKanbanSync(payload.boardId, {
        tasks: nextTasks,
        collaborators: collaboratorsRef.current[payload.boardId] ?? [],
      })
      setTaskDialog(null)
      setSelectedTaskId(null)
    })
  }

  function removeTask(task: KanbanTaskView) {
    const confirmed = window.confirm(`Delete "${task.title}"?`)

    if (!confirmed) {
      return
    }

    runAction(async () => {
      await deleteTask(task.boardId, task.id)
      const nextTasks = tasksRef.current.filter((item) => item.id !== task.id)
      commitTasks(nextTasks)
      publishKanbanSync(task.boardId, {
        tasks: nextTasks,
        collaborators: collaboratorsRef.current[task.boardId] ?? [],
      })
      if (selectedTaskId === task.id) {
        setSelectedTaskId(null)
      }
    })
  }

  function moveDroppedTask(taskId: number, targetColumnId: number, beforeTaskId?: number) {
    if (!selectedBoardId) {
      return
    }

    const movedTask = tasksRef.current.find((task) => task.id === taskId)
    if (!movedTask) {
      return
    }

    const currentTargetTasks = sortTasks(
      tasksRef.current.filter((task) => task.boardId === selectedBoardId && task.columnId === targetColumnId && task.id !== taskId)
    )
    const insertIndex = beforeTaskId
      ? Math.max(
          0,
          currentTargetTasks.findIndex((task) => task.id === beforeTaskId)
        )
      : currentTargetTasks.length

    const nextTargetTasks = [...currentTargetTasks]
    nextTargetTasks.splice(insertIndex < 0 ? nextTargetTasks.length : insertIndex, 0, {
      ...movedTask,
      columnId: targetColumnId,
    })
    const orderedIds = nextTargetTasks.map((task) => task.id)

    const targetIdSet = new Set(orderedIds)
    const nextTasks = tasksRef.current.map((task) => {
      if (task.id === taskId) {
        return { ...task, columnId: targetColumnId, position: orderedIds.indexOf(task.id) }
      }

      if (task.columnId === targetColumnId && targetIdSet.has(task.id)) {
        return { ...task, position: orderedIds.indexOf(task.id) }
      }

      return task
    })
    commitTasks(nextTasks)

    runAction(async () => {
      await moveTask(selectedBoardId, taskId, targetColumnId, orderedIds)
      publishKanbanSync(selectedBoardId, {
        tasks: nextTasks,
        collaborators: collaboratorsRef.current[selectedBoardId] ?? [],
      })
    })
  }

  React.useEffect(() => {
    boardsRef.current = boards
  }, [boards])

  React.useEffect(() => {
    columnsRef.current = columns
  }, [columns])

  React.useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  React.useEffect(() => {
    collaboratorsRef.current = collaboratorsByBoard
  }, [collaboratorsByBoard])

  function commitBoards(nextBoards: KanbanBoardView[]) {
    boardsRef.current = nextBoards
    setBoards(nextBoards)
  }

  function commitColumns(nextColumns: KanbanColumnView[]) {
    columnsRef.current = nextColumns
    setColumns(nextColumns)
  }

  function commitTasks(nextTasks: KanbanTaskView[]) {
    tasksRef.current = nextTasks
    setTasks(nextTasks)
  }

  function commitCollaborators(boardId: number, collaborators: KanbanCollaboratorView[]) {
    collaboratorsRef.current = { ...collaboratorsRef.current, [boardId]: collaborators }
    setCollaboratorsByBoard((current) => ({ ...current, [boardId]: collaborators }))
  }

  function publishKanbanSync(boardId: number, snapshot?: Partial<Omit<KanbanSyncPayload, "boardId">>) {
    liveSyncRef.current?.({
      boardId,
      boards: snapshot?.boards ?? boardsRef.current,
      columns: snapshot?.columns ?? columnsRef.current,
      tasks: snapshot?.tasks ?? tasksRef.current,
      collaborators: snapshot?.collaborators ?? collaboratorsRef.current[boardId] ?? [],
    })
  }

  function applyKanbanSync(payload: KanbanSyncPayload) {
    commitBoards(payload.boards)
    commitColumns(payload.columns)
    commitTasks(payload.tasks)
    commitCollaborators(payload.boardId, payload.collaborators)
    setSelectedBoardId((current) => (payload.boards.some((board) => board.id === current) ? current : payload.boards[0]?.id ?? null))
  }

  function setCollaborators(boardId: number, collaborators: KanbanCollaboratorView[]) {
    commitCollaborators(boardId, collaborators)
  }

  function submitInvite(boardId: number, email: string) {
    runAction(async () => {
      const collaborators = await inviteCollaborator({ boardId, email })
      commitCollaborators(boardId, collaborators)
      publishKanbanSync(boardId, { collaborators })
    })
  }

  function removeInvite(boardId: number, collaboratorId: number) {
    runAction(async () => {
      const collaborators = await removeCollaborator(boardId, collaboratorId)
      commitCollaborators(boardId, collaborators)
      publishKanbanSync(boardId, { collaborators })
    })
  }

  return (
    <LiveblocksRoom boardId={selectedBoard?.id ?? null} selectedTaskId={selectedTaskId} onSync={applyKanbanSync} syncRef={liveSyncRef}>
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[#e9dfd0] px-5 py-5 md:px-8">
        <div className="min-w-0 pl-12 lg:pl-0">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#d95345]">
            <Columns3 className="size-4 text-[#c98d54]" />
            Task / Kanban
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-normal text-[#171923] md:text-[2rem] md:leading-tight">
            Shape the work as it moves.
          </h1>
        </div>
        {error && <p className="mt-4 rounded-md border border-[#f6b2aa] bg-[#fff0ed] px-3 py-2 text-sm text-[#b84236]">{error}</p>}
      </header>

      <div className="grid min-w-0 flex-1 gap-4 p-4 md:p-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border border-[#ded8ce] bg-[#fffdf8] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#171923]">Boards</h2>
            <Button
              type="button"
              onClick={openCreateBoardDialog}
              className="h-9 bg-[#ef4d3f] px-4 text-white hover:bg-[#df4134]"
            >
              <Plus className="mr-2 size-4" />
              New
            </Button>
          </div>

          <div className="mt-5 space-y-2">
            {boards.length === 0 ? (
              <div className="grid min-h-44 place-items-center rounded-md border border-dashed border-[#d7cec4] bg-[#fbf6ed] p-4 text-center text-sm leading-6 text-[#756d64]">
                <div className="max-w-[180px]">
                  <Columns3 className="mx-auto mb-3 size-5 text-[#71788a]" />
                  <p className="font-semibold text-[#2b2824]">No boards yet</p>
                  <p className="mt-1">Create a board to begin shaping your tasks.</p>
                </div>
              </div>
            ) : (
              boards.map((board) => {
                const active = board.id === selectedBoardId
                return (
                  <div
                    key={board.id}
                    className={cn(
                      "flex h-12 w-full items-center gap-3 rounded-md border px-3 transition-colors",
                      active
                        ? "border-transparent bg-[#fde8e5] text-[#d93c30]"
                        : "border-transparent text-[#625b53] hover:bg-[#fbf6ed]"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedBoardId(board.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left text-sm font-semibold"
                    >
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: board.color }} />
                      <span className="min-w-0 flex-1 truncate">{board.name}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Edit ${board.name}`}
                      onClick={() => openEditBoardDialog(board)}
                      className="grid size-7 shrink-0 place-items-center rounded-md text-[#837b72] hover:bg-white hover:text-[#ef4d3f]"
                    >
                      <Edit3 className="size-4" />
                    </button>
                    {(collaboratorsByBoard[board.id] ?? []).find((collaborator) => collaborator.isOwner)?.userId === currentUser.id && (
                      <button
                        type="button"
                        aria-label={`Delete ${board.name}`}
                        onClick={() => removeBoard(board)}
                        className="grid size-7 shrink-0 place-items-center rounded-md text-[#837b72] hover:bg-white hover:text-[#b84236]"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </aside>

        <section className="min-w-0">
          {!selectedBoard ? (
            <div className="grid min-h-[420px] place-items-center rounded-lg border border-[#ded8ce] bg-[#fffdf8] p-6 text-center shadow-sm">
              <div className="max-w-xl">
                <Columns3 className="mx-auto size-10 text-[#71788a]" />
                <h2 className="mt-5 text-2xl font-semibold text-[#2b2824]">Create your first board</h2>
                <p className="mt-3 text-sm leading-6 text-[#5f6673]">
                  Boards hold columns, tasks, labels, and calendar sync settings.
                </p>
                <Button
                  type="button"
                  onClick={openCreateBoardDialog}
                  className="mt-6 h-10 bg-[#ef4d3f] px-4 text-white hover:bg-[#df4134]"
                >
                  <Plus className="mr-2 size-4" />
                  New board
                </Button>
              </div>
            </div>
          ) : (
            <div className="min-w-0 overflow-hidden rounded-lg border border-[#ded8ce] bg-[#fffdf8] shadow-sm">
              <div className="grid gap-4 border-b border-[#eadfd2] px-5 py-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-3 rounded-full" style={{ backgroundColor: selectedBoard.color }} />
                    <h2 className="truncate text-[1.75rem] font-semibold leading-tight text-[#171923]">{selectedBoard.name}</h2>
                  </div>
                  <p className="mt-1 text-sm text-[#5f6673]">
                    {boardColumns.length}/5 columns - {boardTasks.length} task{boardTasks.length === 1 ? "" : "s"}
                  </p>
                  <ActiveCollaborators collaborators={selectedCollaborators} />
                </div>
                <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row xl:w-auto xl:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCollaborationOpen(true)}
                    className="h-10 shrink-0 border-[#ded8ce] bg-[#fffaf1] px-3 text-[#2b2824] hover:bg-white"
                  >
                    <Users2 className="mr-2 size-4" />
                    Collaboration
                  </Button>
                  <input
                    value={newColumnName}
                    onChange={(event) => setNewColumnName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        submitInlineColumn()
                      }
                    }}
                    placeholder="New column name"
                    disabled={boardColumns.length >= 5}
                    className="h-10 min-w-0 rounded-lg border border-[#ded8ce] bg-[#f8f2e9] px-4 text-sm outline-none shadow-inner shadow-stone-200/30 focus:border-[#ef6f61] disabled:opacity-60 sm:w-56"
                  />
                  <Button
                    type="button"
                    onClick={submitInlineColumn}
                    disabled={boardColumns.length >= 5 || !newColumnName.trim()}
                    className="h-10 shrink-0 bg-[#ef4d3f] px-4 text-white hover:bg-[#df4134]"
                  >
                    <Plus className="mr-2 size-4" />
                    Column
                  </Button>
                </div>
              </div>

              <div className="min-w-0 overflow-x-auto px-5 py-5">
                <div
                  className="grid min-w-[720px] gap-4 lg:grid-flow-col"
                  style={{
                    gridAutoColumns: "minmax(clamp(220px, 17vw, 260px), 1fr)",
                  }}
                >
                  {boardColumns.map((column) => {
                    const columnTasks = sortTasks(boardTasks.filter((task) => task.columnId === column.id))
                    return (
                      <ColumnLane
                        key={column.id}
                        column={column}
                        tasks={columnTasks}
                        pending={pending}
                        onEdit={() => openEditColumnDialog(column)}
                        onDelete={() => removeColumn(column)}
                        onAddTask={() => selectedBoardId && setTaskDialog(newTaskDialog(selectedBoardId, column.id))}
                        onEditTask={openEditTaskDialog}
                        onDeleteTask={removeTask}
                        onDropTask={(taskId, beforeTaskId) => moveDroppedTask(taskId, column.id, beforeTaskId)}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {boardDialog.open && (
        <BoardDialogView
          dialog={boardDialog}
          setDialog={setBoardDialog}
          pending={pending}
          onClose={() => setBoardDialog(emptyBoardDialog)}
          onSubmit={submitBoard}
        />
      )}

      {columnDialog.open && (
        <ColumnDialogView
          dialog={columnDialog}
          setDialog={setColumnDialog}
          pending={pending}
          onClose={() => setColumnDialog(emptyColumnDialog)}
          onSubmit={submitColumn}
        />
      )}

      {taskDialog?.open && (
        <TaskDialogView
          dialog={taskDialog}
          columns={boardColumns}
          setDialog={setTaskDialog}
          pending={pending}
          onClose={() => {
            setTaskDialog(null)
            setSelectedTaskId(null)
          }}
          onSubmit={submitTask}
        />
      )}

      {collaborationOpen && selectedBoard && (
        <CollaborationDialog
          board={selectedBoard}
          collaborators={selectedCollaborators}
          currentUser={currentUser}
          canManage={canManageSelectedBoard}
          pending={pending}
          onClose={() => setCollaborationOpen(false)}
          onInvite={(email) => submitInvite(selectedBoard.id, email)}
          onRemove={(collaboratorId) => removeInvite(selectedBoard.id, collaboratorId)}
          onRefresh={() =>
            runAction(async () => {
              const collaborators = await getCollaborators(selectedBoard.id)
              setCollaborators(selectedBoard.id, collaborators)
            })
          }
        />
      )}
    </div>
    </LiveblocksRoom>
  )
}

function ColumnLane({
  column,
  tasks,
  pending,
  onEdit,
  onDelete,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onDropTask,
}: {
  column: KanbanColumnView
  tasks: KanbanTaskView[]
  pending: boolean
  onEdit: () => void
  onDelete: () => void
  onAddTask: () => void
  onEditTask: (task: KanbanTaskView) => void
  onDeleteTask: (task: KanbanTaskView) => void
  onDropTask: (taskId: number, beforeTaskId?: number) => void
}) {
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        const taskId = Number(event.dataTransfer.getData("text/plain"))
        if (taskId) {
          onDropTask(taskId)
        }
      }}
      className="flex max-h-[calc(100vh-225px)] min-h-[calc(100vh-225px)] min-w-0 flex-col rounded-lg border border-[#ded8ce] bg-[#fbf6ed]"
    >
      <div className="flex items-start gap-2 border-b border-[#ded8ce] px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[1.05rem] font-semibold text-[#171923]">{column.name}</h3>
          <p className="mt-1 text-xs text-[#5f6673]">{tasks.length} task{tasks.length === 1 ? "" : "s"}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Add task to ${column.name}`}
          onClick={onAddTask}
          className="size-7 text-[#ef4d3f] hover:bg-white"
        >
          <Plus className="size-4" />
        </Button>
        <IconButton label={`Edit ${column.name}`} icon={Edit3} onClick={onEdit} />
        <IconButton label={`Delete ${column.name}`} icon={Trash2} onClick={onDelete} danger />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
        {tasks.length === 0 ? (
          <button
            type="button"
            onClick={onAddTask}
            className="grid min-h-32 w-full place-items-center rounded-md border border-dashed border-[#d7cec4] bg-white p-3 text-sm font-semibold text-[#4b5563] hover:border-[#ef6f61]"
          >
            <span className="inline-flex items-center gap-2">
              <Plus className="size-4" />
              Add task
            </span>
          </button>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task)}
              onDropBefore={(taskId) => onDropTask(taskId, task.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onDropBefore,
}: {
  task: KanbanTaskView
  onEdit: () => void
  onDelete: () => void
  onDropBefore: (taskId: number) => void
}) {
  const { threads } = useThreads({ query: taskThreadQuery(task.boardId, task.id) })
  const commentCount = threads?.reduce((total, thread) => total + threadCommentCount(thread), 0) ?? 0

  return (
    <article
      draggable
      onDragStart={(event) => event.dataTransfer.setData("text/plain", String(task.id))}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const taskId = Number(event.dataTransfer.getData("text/plain"))
        if (taskId && taskId !== task.id) {
          onDropBefore(taskId)
        }
      }}
      className="rounded-md border border-[#ded8ce] bg-white p-3 shadow-sm transition-colors hover:border-[#f6b2aa]"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 size-4 shrink-0 text-[#a29a91]" />
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 text-sm font-semibold leading-5 text-[#2b2824]">{task.title}</h4>
          {task.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#756d64]">{task.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" aria-label="Open task comments" onClick={onEdit} className="relative text-[#837b72] hover:text-[#10a37f]">
            <MessageCircle className="size-3.5" />
            {commentCount > 0 && (
              <span className="absolute -right-2 -top-2 grid min-w-4 place-items-center rounded-full bg-[#10a37f] px-1 text-[0.58rem] font-bold text-white">
                {commentCount}
              </span>
            )}
          </button>
          <button type="button" aria-label="Edit task" onClick={onEdit} className="text-[#837b72] hover:text-[#ef6f61]">
            <Edit3 className="size-3.5" />
          </button>
          <button type="button" aria-label="Delete task" onClick={onDelete} className="text-[#837b72] hover:text-[#b84236]">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className={cn("rounded border px-2 py-0.5 text-[0.68rem] font-semibold", priorityStyle(task.priority))}>
          {labelText(task.priority)}
        </span>
        {task.dueDate && (
          <span className="inline-flex items-center gap-1 rounded border border-[#d7cec4] bg-[#f8f5ef] px-2 py-0.5 text-[0.68rem] font-semibold text-[#625b53]">
            <CalendarDays className="size-3" />
            {task.dueDate}
          </span>
        )}
      </div>

      {task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {task.labels.map((label) => (
            <span
              key={`${task.id}-${label.name}-${label.color}`}
              className="rounded px-2 py-0.5 text-[0.68rem] font-semibold text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-[#837b72]">
        {task.syncCalendar && <CalendarDays className="size-3.5" />}
        {task.syncNotes && <StickyNote className="size-3.5" />}
        {task.syncAi && <Bot className="size-3.5" />}
      </div>
    </article>
  )
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-md text-[#5f6673] hover:bg-white hover:text-[#ef4d3f] disabled:opacity-35",
        danger && "hover:text-[#b84236]"
      )}
    >
      <Icon className="size-3.5" />
    </button>
  )
}

function BoardDialogView({
  dialog,
  setDialog,
  pending,
  onClose,
  onSubmit,
}: {
  dialog: BoardDialog
  setDialog: React.Dispatch<React.SetStateAction<BoardDialog>>
  pending: boolean
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <BaseDialog title={dialog.id ? "Edit board" : "Create board"} onClose={onClose}>
      <label className="grid gap-2 text-sm font-semibold text-[#2b2824]">
        Board name
        <input
          value={dialog.name}
          onChange={(event) => setDialog((current) => ({ ...current, name: event.target.value }))}
          placeholder="Product Roadmap"
          className="h-9 rounded-md border border-[#ded8ce] bg-[#fffaf1] px-3 text-sm font-normal outline-none focus:border-[#ef6f61]"
        />
      </label>
      <ColorPicker value={dialog.color} colors={boardColors} onChange={(color) => setDialog((current) => ({ ...current, color }))} />
      <DialogActions pending={pending} submitLabel={dialog.id ? "Save board" : "Create board"} onClose={onClose} onSubmit={onSubmit} />
    </BaseDialog>
  )
}

function ColumnDialogView({
  dialog,
  setDialog,
  pending,
  onClose,
  onSubmit,
}: {
  dialog: ColumnDialog
  setDialog: React.Dispatch<React.SetStateAction<ColumnDialog>>
  pending: boolean
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <BaseDialog title={dialog.id ? "Edit column" : "Add column"} onClose={onClose}>
      <label className="grid gap-2 text-sm font-semibold text-[#2b2824]">
        Column name
        <input
          value={dialog.name}
          onChange={(event) => setDialog((current) => ({ ...current, name: event.target.value }))}
          placeholder="Review"
          className="h-9 rounded-md border border-[#ded8ce] bg-[#fffaf1] px-3 text-sm font-normal outline-none focus:border-[#ef6f61]"
        />
      </label>
      <ColorPicker value={dialog.color} colors={boardColors} onChange={(color) => setDialog((current) => ({ ...current, color }))} />
      <DialogActions pending={pending} submitLabel={dialog.id ? "Save column" : "Add column"} onClose={onClose} onSubmit={onSubmit} />
    </BaseDialog>
  )
}

function TaskDialogView({
  dialog,
  columns,
  setDialog,
  pending,
  onClose,
  onSubmit,
}: {
  dialog: TaskDialog
  columns: KanbanColumnView[]
  setDialog: React.Dispatch<React.SetStateAction<TaskDialog | null>>
  pending: boolean
  onClose: () => void
  onSubmit: () => void
}) {
  const [labelName, setLabelName] = React.useState(dialog.labels[0]?.name ?? "")
  const [labelColor, setLabelColor] = React.useState<string>(dialog.labels[0]?.color ?? "#84a11f")
  const taskId = dialog.id ?? null
  const taskBoardId = dialog.boardId ?? null

  function addLabel() {
    const name = labelName.trim()
    if (!name) {
      return
    }

    setDialog((current) =>
      current
        ? {
            ...current,
            labels: [...current.labels.filter((label) => label.name.toLowerCase() !== name.toLowerCase()), { name, color: labelColor }].slice(0, 6),
          }
        : current
    )
    setLabelName("")
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 p-3 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-[720px] overflow-y-auto rounded-lg border border-[#ded8ce] bg-white shadow-xl">
        <div className="flex items-center justify-between gap-4 px-5 pt-5">
          <h2 className="text-[1.05rem] font-semibold text-[#171923]">{dialog.id ? "Edit task" : "Create task"}</h2>
          <button type="button" onClick={onClose} aria-label="Close task dialog" className="text-[#171923] hover:text-[#ef4d3f]">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-3.5 px-5 py-5">
          <label className="grid gap-2 text-sm font-semibold text-[#171923]">
            Title
            <input
              value={dialog.title}
              onChange={(event) => setDialog((current) => (current ? { ...current, title: event.target.value } : current))}
              placeholder="New Video to Publish"
              className="h-10 rounded-lg border border-[#ead8bf] bg-[#fffaf1] px-3 text-sm font-semibold text-[#171923] outline-none focus:border-[#ef6f61]"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[#171923]">
            Description
            <textarea
              value={dialog.description}
              onChange={(event) => setDialog((current) => (current ? { ...current, description: event.target.value } : current))}
              placeholder="Add helpful context"
              rows={3}
              className="resize-none rounded-lg border border-[#ead8bf] bg-[#fffaf1] px-3 py-2.5 text-sm font-normal leading-6 text-[#171923] outline-none focus:border-[#ef6f61]"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-[#171923]">
              Column
              <select
                value={dialog.columnId ?? ""}
                onChange={(event) =>
                  setDialog((current) => (current ? { ...current, columnId: Number(event.target.value) } : current))
                }
                className="h-10 rounded-lg border border-[#efb0a6] bg-[#fffaf1] px-3 text-sm font-semibold text-[#2b2824] outline-none focus:border-[#ef4d3f]"
              >
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[#171923]">
              Due date
              <input
                type="date"
                value={dialog.dueDate}
                onChange={(event) => setDialog((current) => (current ? { ...current, dueDate: event.target.value } : current))}
                className="h-10 rounded-lg border border-[#ead8bf] bg-[#fffaf1] px-3 text-sm font-semibold text-[#2b2824] outline-none focus:border-[#ef6f61]"
              />
            </label>
          </div>

          <div className="grid gap-2 text-sm font-semibold text-[#171923]">
            Priority
            <div className="grid gap-2 sm:grid-cols-3">
              {kanbanPriorities.map((priority) => (
                <button
                  type="button"
                  key={priority}
                  onClick={() => setDialog((current) => (current ? { ...current, priority } : current))}
                  className={cn(
                    "h-9 rounded-lg border text-xs font-semibold capitalize transition-colors",
                    priority === "low" && "border-[#c9eadb] bg-[#dff7ec] text-[#08785f]",
                    priority === "medium" && "border-[#f3d084] bg-[#fff1c7] text-[#946200]",
                    priority === "high" && "border-[#f2c9c0] bg-[#ffe1dc] text-[#9a3d33]",
                    dialog.priority === priority && "ring-2 ring-[#ef6f61]"
                  )}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 text-sm font-semibold text-[#171923]">
            Labels
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_90px_90px]">
              <input
                value={labelName}
                onChange={(event) => setLabelName(event.target.value)}
                placeholder="Design"
                className="h-10 min-w-0 rounded-lg border border-[#ead8bf] bg-[#fffaf1] px-3 text-sm font-normal outline-none focus:border-[#ef6f61]"
              />
              <select
                value={labelColor}
                onChange={(event) => setLabelColor(event.target.value)}
                className="h-10 rounded-lg border border-[#ead8bf] bg-[#fffaf1] px-3 text-sm font-semibold text-[#625b53] outline-none focus:border-[#ef6f61]"
              >
                {labelColors.map((color) => (
                  <option key={color} value={color}>
                    {color === "#84a11f" ? "sage" : color === "#ef6f61" ? "coral" : color === "#10a37f" ? "mint" : color === "#0ea5e9" ? "sky" : color === "#8b5cf6" ? "violet" : "gold"}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={addLabel} className="h-10 border-[#ead8bf] bg-[#fffaf1] text-[#171923] hover:bg-white">
                <Plus className="mr-2 size-4" />
                Add
              </Button>
            </div>
            {dialog.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {dialog.labels.map((label) => (
                  <button
                    type="button"
                    key={`${label.name}-${label.color}`}
                    onClick={() =>
                      setDialog((current) =>
                        current ? { ...current, labels: current.labels.filter((item) => item.name !== label.name) } : current
                      )
                    }
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                    <X className="size-3" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <CheckboxTile
              checked={dialog.syncCalendar}
              icon={CalendarDays}
              label="Sync with Calendar"
              onClick={() => setDialog((current) => (current ? { ...current, syncCalendar: !current.syncCalendar } : current))}
            />
            <CheckboxTile
              checked={dialog.syncNotes}
              icon={StickyNote}
              label="Link with Notes"
              onClick={() => setDialog((current) => (current ? { ...current, syncNotes: !current.syncNotes } : current))}
            />
          </div>

          <Button type="button" onClick={onSubmit} disabled={pending} className="h-10 w-full bg-[#ef4d3f] text-white hover:bg-[#df4134]">
            {pending ? "Saving..." : dialog.id ? "Save task" : "Create task"}
          </Button>

          {taskId && taskBoardId && <TaskComments boardId={taskBoardId} taskId={taskId} />}
        </div>
      </div>
    </div>
  )
}

function TaskComments({ boardId, taskId }: { boardId: number; taskId: number }) {
  const { threads, isLoading, error } = useThreads({ query: taskThreadQuery(boardId, taskId) })

  return (
    <section className="mt-1 grid gap-3 border-t border-[#ead8bf] pt-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#171923]">Comments</h3>
        <span className="text-xs font-semibold text-[#756d64]">
          {threads?.reduce((total, thread) => total + threadCommentCount(thread), 0) ?? 0}
        </span>
      </div>
      {isLoading && <p className="rounded-md border border-[#ead8bf] bg-[#fffaf1] px-3 py-2 text-sm text-[#756d64]">Loading comments...</p>}
      {error && <p className="rounded-md border border-[#f6b2aa] bg-[#fff0ed] px-3 py-2 text-sm text-[#b84236]">Comments could not load.</p>}
      {threads?.map((thread) => (
        <Thread
          key={thread.id}
          thread={thread}
          showResolveAction={false}
          showSubscription={false}
          showComposer="collapsed"
          showComposerFormattingControls={false}
          className="rounded-md border border-[#ead8bf] bg-[#fffaf1]"
        />
      ))}
      <Composer
        metadata={{ type: "kanban-task", boardId, taskId }}
        showAttachments={false}
        showFormattingControls={false}
        className="rounded-md border border-[#ead8bf] bg-[#fffaf1]"
      />
    </section>
  )
}

function ActiveCollaborators({ collaborators }: { collaborators: KanbanCollaboratorView[] }) {
  const others = useOthers()
  const self = useSelf()

  const activePeople = [
    ...(self
      ? [
          {
            key: `self-${self.connectionId}`,
            name: self.info.name || self.info.email,
            color: self.info.color,
          },
        ]
      : []),
    ...others.map((user) => ({
      key: `other-${user.connectionId}`,
      name: user.info.name || user.info.email,
      color: user.info.color,
    })),
  ]

  return (
    <div className="mt-3 flex w-full min-w-0 items-center gap-2">
      <div className="flex -space-x-2">
        {activePeople.length === 0 ? (
          <span className="grid size-8 place-items-center rounded-full border border-dashed border-[#d7cec4] bg-white text-[0.65rem] font-semibold text-[#756d64]">
            0
          </span>
        ) : (
          activePeople.slice(0, 3).map((person) => (
            <span
              key={person.key}
              title={person.name}
              className="grid size-8 place-items-center rounded-full border-2 border-[#fffdf8] text-[0.68rem] font-semibold text-white shadow-sm"
              style={{ backgroundColor: person.color }}
            >
              {initials(person.name)}
            </span>
          ))
        )}
        {activePeople.length > 3 && (
          <span className="ml-1 grid size-8 place-items-center rounded-full border-2 border-[#fffdf8] bg-[#2b2824] text-[0.65rem] font-semibold text-white">
            +{activePeople.length - 3}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-5 text-[#4b5563]">
          {activePeople.length} active now
          {collaborators.length > 0 ? ` - ${collaborators.length} shared` : ""}
        </p>
      </div>
    </div>
  )
}

function CollaborationDialog({
  board,
  collaborators,
  currentUser,
  canManage,
  pending,
  onClose,
  onInvite,
  onRemove,
  onRefresh,
}: {
  board: KanbanBoardView
  collaborators: KanbanCollaboratorView[]
  currentUser: KanbanCurrentUserView
  canManage: boolean
  pending: boolean
  onClose: () => void
  onInvite: (email: string) => void
  onRemove: (collaboratorId: number) => void
  onRefresh: () => void
}) {
  const [email, setEmail] = React.useState("")

  React.useEffect(() => {
    setEmail("")
  }, [board.id])

  function submitInvite() {
    const nextEmail = email.trim()
    if (!nextEmail) {
      return
    }

    onInvite(nextEmail)
    setEmail("")
  }

  return (
    <BaseDialog title="Collaboration" onClose={onClose} wide>
      <div className="grid gap-1">
        <p className="text-sm font-semibold text-[#2b2824]">{board.name}</p>
        <p className="text-xs text-[#756d64]">{collaborators.length} people have access to this board.</p>
      </div>

      <div className="grid gap-2 rounded-md border border-[#ead8bf] bg-[#fffaf1] p-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#171923]">Invite by email</h3>
          <Button type="button" variant="outline" onClick={onRefresh} disabled={pending} className="h-8 border-[#ded8ce] bg-white text-[#625b53] hover:bg-[#fffaf1]">
            <Link2 className="mr-2 size-3.5" />
            Refresh
          </Button>
        </div>
        <div className="flex gap-2">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submitInvite()
              }
            }}
            disabled={!canManage || pending}
            placeholder="teammate@company.com"
            className="h-10 min-w-0 flex-1 rounded-md border border-[#ded8ce] bg-white px-3 text-sm outline-none focus:border-[#ef6f61] disabled:opacity-60"
          />
          <Button type="button" onClick={submitInvite} disabled={!canManage || pending || !email.trim()} className="h-10 bg-[#ef4d3f] text-white hover:bg-[#df4134]">
            <UserPlus className="mr-2 size-4" />
            Invite
          </Button>
        </div>
        {!canManage && <p className="text-xs text-[#756d64]">Only the board owner can invite or remove collaborators.</p>}
      </div>

      <div className="grid gap-2">
        <h3 className="text-sm font-semibold text-[#171923]">People</h3>
        {collaborators.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#d7cec4] bg-[#fffaf1] p-4 text-sm text-[#756d64]">
            No collaborators yet.
          </div>
        ) : (
          <div className="grid gap-2">
            {collaborators.map((collaborator) => {
              const isSelf = collaborator.userId === currentUser.id
              return (
                <div key={collaborator.id} className="flex items-center justify-between gap-3 rounded-md border border-[#ead8bf] bg-[#fffaf1] px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-full text-[0.68rem] font-semibold text-white"
                      style={{ backgroundColor: collaborator.isOwner ? "#2b2824" : "#10a37f" }}
                    >
                      {initials(collaborator.name || collaborator.email)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#2b2824]">
                        {collaborator.name || collaborator.email}
                        {isSelf ? " (you)" : ""}
                      </p>
                      <p className="text-xs text-[#756d64]">
                        {collaborator.email} - {collaborator.isOwner ? "Owner" : collaborator.status === "active" ? "Active" : "Pending"}
                      </p>
                    </div>
                  </div>
                  {!collaborator.isOwner && canManage && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onRemove(collaborator.id)}
                      disabled={pending}
                      className="h-8 border-[#ded8ce] bg-white text-[#b84236] hover:bg-[#fff0ed]"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </BaseDialog>
  )
}

function BaseDialog({
  title,
  children,
  onClose,
  wide,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 p-3 backdrop-blur-sm">
      <div className={cn("max-h-[90vh] w-full overflow-y-auto rounded-lg border border-[#ded8ce] bg-[#f8f5ef] shadow-xl", wide ? "max-w-[560px]" : "max-w-[420px]")}>
        <div className="flex items-center justify-between gap-4 border-b border-[#ded8ce] px-5 py-4">
          <h2 className="text-base font-semibold text-[#2b2824]">{title}</h2>
          <button type="button" onClick={onClose} className="text-[#837b72] hover:text-[#ef6f61]">
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-4 px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

function DialogActions({
  pending,
  submitLabel,
  onClose,
  onSubmit,
}: {
  pending: boolean
  submitLabel: string
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onClose} disabled={pending} className="border-[#ded8ce] bg-[#fffaf1] text-[#625b53] hover:bg-white">
        Cancel
      </Button>
      <Button type="button" onClick={onSubmit} disabled={pending} className="bg-[#ef6f61] text-white hover:bg-[#df5e50]">
        {pending ? "Saving..." : submitLabel}
      </Button>
    </div>
  )
}

function ColorPicker({
  value,
  colors,
  onChange,
}: {
  value: string
  colors: readonly string[]
  onChange: (color: string) => void
}) {
  return (
    <div className="grid gap-2 text-sm font-semibold text-[#2b2824]">
      Color
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            type="button"
            key={color}
            aria-label={`Select ${color}`}
            onClick={() => onChange(color)}
            className={cn("grid size-8 place-items-center rounded-full border border-white shadow-sm", value === color && "ring-2 ring-[#2b2824]")}
            style={{ backgroundColor: color }}
          >
            {value === color && <Check className="size-4 text-white" />}
          </button>
        ))}
      </div>
    </div>
  )
}

function CheckboxTile({
  checked,
  icon: Icon,
  label,
  onClick,
}: {
  checked: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 items-center justify-between rounded-lg border bg-[#fffaf1] px-3 text-sm font-semibold transition-colors",
        checked ? "border-[#ef6f61] text-[#b84236]" : "border-[#ead8bf] text-[#2b2824] hover:bg-white"
      )}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-[#10a37f]" />
        <span className="truncate">{label}</span>
      </span>
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded border",
          checked ? "border-[#ef4d3f] bg-[#ef4d3f]" : "border-[#a29a91] bg-white"
        )}
      >
        {checked && <Check className="size-3 text-white" />}
      </span>
    </button>
  )
}

function ToggleButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-center gap-2 rounded-md border text-sm font-semibold transition-colors",
        active
          ? "border-[#f6b2aa] bg-[#fff0ed] text-[#b84236]"
          : "border-[#ded8ce] bg-[#fffaf1] text-[#625b53] hover:bg-white"
      )}
    >
      <Icon className="size-4" />
      {label}
      {active && <Link2 className="size-3.5" />}
    </button>
  )
}
