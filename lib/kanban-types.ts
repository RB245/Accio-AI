export const kanbanPriorities = ["low", "medium", "high"] as const

export const boardColors = [
  "#ef6f61",
  "#10a37f",
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#22c55e",
] as const

export const labelColors = [
  "#ef6f61",
  "#10a37f",
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#84a11f",
] as const

export type KanbanPriority = (typeof kanbanPriorities)[number]

export type KanbanLabel = {
  name: string
  color: string
}

export type KanbanBoardView = {
  id: number
  userId: number
  name: string
  color: string
  createdAt: string
  updatedAt: string
}

export type KanbanColumnView = {
  id: number
  boardId: number
  name: string
  color: string
  position: number
  createdAt: string
  updatedAt: string
}

export type KanbanTaskView = {
  id: number
  boardId: number
  columnId: number
  linkedCalendarItemId: number | null
  title: string
  description: string | null
  dueDate: string | null
  priority: KanbanPriority
  labels: KanbanLabel[]
  position: number
  syncCalendar: boolean
  syncNotes: boolean
  syncAi: boolean
  createdAt: string
  updatedAt: string
}

export type KanbanCurrentUserView = {
  id: number
  name: string | null
  email: string
}

export type KanbanCollaboratorView = {
  id: number
  boardId: number
  userId: number | null
  email: string
  name: string | null
  role: "editor"
  status: "active" | "pending"
  isOwner: boolean
  createdAt: string
}

export type KanbanBoardInput = {
  name: string
  color: string
}

export type KanbanBoardCreateResult = {
  board: KanbanBoardView
  columns: KanbanColumnView[]
}

export type KanbanBoardUpdateInput = {
  id: number
  name: string
  color: string
}

export type KanbanColumnInput = {
  id?: number
  boardId: number
  name: string
  color: string
}

export type KanbanTaskInput = {
  id?: number
  boardId: number
  columnId: number
  title: string
  description?: string | null
  dueDate?: string | null
  priority: KanbanPriority
  labels: KanbanLabel[]
  syncCalendar: boolean
  syncNotes: boolean
  syncAi: boolean
}

export type KanbanInviteInput = {
  boardId: number
  email: string
}
