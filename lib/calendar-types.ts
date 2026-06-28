export const calendarKinds = ["task", "reminder"] as const

export const calendarCategories = [
  "work",
  "personal",
  "focus",
  "meeting",
  "reminder",
] as const

export const legacyCalendarCategories = [
  "design",
  "planning",
  "client",
  "content",
  "product",
  "other",
] as const

export const allCalendarCategories = [
  ...calendarCategories,
  ...legacyCalendarCategories,
] as const

export type CalendarKind = (typeof calendarKinds)[number]
export type CalendarCategory = (typeof allCalendarCategories)[number]
export type CalendarStatus = "draft" | "scheduled"

export type CalendarItemView = {
  id: number
  userId: number
  title: string
  description: string | null
  kind: CalendarKind
  category: CalendarCategory
  scheduledDate: string | null
  startTime: string | null
  durationMinutes: number
  status: CalendarStatus
  createdAt: string
  updatedAt: string
}

export type CalendarItemInput = {
  id?: number
  title: string
  description?: string | null
  kind: CalendarKind
  category: CalendarCategory
  scheduledDate?: string | null
  startTime?: string | null
  durationMinutes: number
}
