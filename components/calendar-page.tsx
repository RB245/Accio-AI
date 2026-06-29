"use client"

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  GripVertical,
  ListTodo,
  Plus,
  X,
} from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  calendarCategories,
  type CalendarCategory,
  type CalendarItemInput,
  type CalendarItemView,
  type CalendarKind,
} from "@/lib/calendar-types"
import { cn } from "@/lib/utils"

type CalendarPageProps = {
  initialItems: CalendarItemView[]
  saveCalendarItem: (input: CalendarItemInput) => Promise<CalendarItemView>
  moveCalendarItem: (itemId: number, scheduledDate: string | null) => Promise<CalendarItemView>
}

type CalendarMode = "month" | "week"

type DialogState = {
  open: boolean
  itemId?: number
  date: string | null
  title: string
  description: string
  kind: CalendarKind
  category: CalendarCategory
  startTime: string
  durationMinutes: number
}

const emptyDialog: DialogState = {
  open: false,
  date: null,
  title: "",
  description: "",
  kind: "task",
  category: "work",
  startTime: "09:00",
  durationMinutes: 30,
}

const categoryStyles: Record<
  string,
  { label: string; dot: string; chip: string; border: string; soft: string }
> = {
  work: {
    label: "Work",
    dot: "bg-[#10a37f]",
    chip: "bg-[#dff7ec] text-[#08785f]",
    border: "border-[#a7dfca]",
    soft: "bg-[#eefaf5]",
  },
  personal: {
    label: "Personal",
    dot: "bg-[#ef6f61]",
    chip: "bg-[#ffe1dc] text-[#b84236]",
    border: "border-[#f6b2aa]",
    soft: "bg-[#fff0ed]",
  },
  focus: {
    label: "Focus",
    dot: "bg-[#0ea5e9]",
    chip: "bg-[#dff3ff] text-[#036b98]",
    border: "border-[#9ed8f5]",
    soft: "bg-[#eef9ff]",
  },
  meeting: {
    label: "Meeting",
    dot: "bg-[#f59e0b]",
    chip: "bg-[#fff1c7] text-[#946200]",
    border: "border-[#f6d47b]",
    soft: "bg-[#fff8e2]",
  },
  reminder: {
    label: "Reminder",
    dot: "bg-[#8b5cf6]",
    chip: "bg-[#ede7ff] text-[#6d42cf]",
    border: "border-[#cbbcff]",
    soft: "bg-[#f5f0ff]",
  },
  design: {
    label: "Focus",
    dot: "bg-[#0ea5e9]",
    chip: "bg-[#dff3ff] text-[#036b98]",
    border: "border-[#9ed8f5]",
    soft: "bg-[#eef9ff]",
  },
  planning: {
    label: "Work",
    dot: "bg-[#10a37f]",
    chip: "bg-[#dff7ec] text-[#08785f]",
    border: "border-[#a7dfca]",
    soft: "bg-[#eefaf5]",
  },
  client: {
    label: "Meeting",
    dot: "bg-[#f59e0b]",
    chip: "bg-[#fff1c7] text-[#946200]",
    border: "border-[#f6d47b]",
    soft: "bg-[#fff8e2]",
  },
  content: {
    label: "Focus",
    dot: "bg-[#0ea5e9]",
    chip: "bg-[#dff3ff] text-[#036b98]",
    border: "border-[#9ed8f5]",
    soft: "bg-[#eef9ff]",
  },
  product: {
    label: "Work",
    dot: "bg-[#10a37f]",
    chip: "bg-[#dff7ec] text-[#08785f]",
    border: "border-[#a7dfca]",
    soft: "bg-[#eefaf5]",
  },
  other: {
    label: "Reminder",
    dot: "bg-[#8b5cf6]",
    chip: "bg-[#ede7ff] text-[#6d42cf]",
    border: "border-[#cbbcff]",
    soft: "bg-[#f5f0ff]",
  },
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const monthFormatter = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" })
const shortMonthFormatter = new Intl.DateTimeFormat("en", { month: "short" })

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function fromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function startOfWeek(date: Date) {
  const next = new Date(date)
  next.setDate(date.getDate() - date.getDay())
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(date.getDate() + days)
  return next
}

function buildMonthDays(anchorDate: Date) {
  const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
  const gridStart = startOfWeek(monthStart)

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
}

function buildWeekDays(anchorDate: Date) {
  const weekStart = startOfWeek(anchorDate)
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
}

function sortItems(items: CalendarItemView[]) {
  return [...items].sort((a, b) => {
    const timeCompare = (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99")
    return timeCompare || a.title.localeCompare(b.title)
  })
}

function upsertItem(items: CalendarItemView[], item: CalendarItemView) {
  const exists = items.some((current) => current.id === item.id)
  return exists ? items.map((current) => (current.id === item.id ? item : current)) : [...items, item]
}

function formatDateHeading(dateKey: string | null) {
  if (!dateKey) {
    return "Draft task"
  }

  const date = fromDateKey(dateKey)
  return `${shortMonthFormatter.format(date)} ${date.getDate()}, ${date.getFullYear()}`
}

function getCategoryStyle(category: string) {
  return categoryStyles[category] ?? categoryStyles.work
}

export function CalendarPage({ initialItems, saveCalendarItem, moveCalendarItem }: CalendarPageProps) {
  const today = React.useMemo(() => new Date(), [])
  const todayKey = toDateKey(today)
  const [items, setItems] = React.useState(initialItems)
  const [mode, setMode] = React.useState<CalendarMode>("month")
  const [anchorDate, setAnchorDate] = React.useState(today)
  const [dialog, setDialog] = React.useState<DialogState>(emptyDialog)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  const visibleDays = mode === "month" ? buildMonthDays(anchorDate) : buildWeekDays(anchorDate)
  const draftItems = sortItems(items.filter((item) => !item.scheduledDate))

  const itemsByDate = React.useMemo(() => {
    return items.reduce<Record<string, CalendarItemView[]>>((groups, item) => {
      if (!item.scheduledDate) {
        return groups
      }

      groups[item.scheduledDate] = [...(groups[item.scheduledDate] ?? []), item]
      return groups
    }, {})
  }, [items])

  function openNewDialog(date: string | null) {
    setError(null)
    setDialog({ ...emptyDialog, open: true, date })
  }

  function openEditDialog(item: CalendarItemView) {
    setError(null)
    setDialog({
      open: true,
      itemId: item.id,
      date: item.scheduledDate,
      title: item.title,
      description: item.description ?? "",
      kind: item.kind,
      category: item.category,
      startTime: item.startTime?.slice(0, 5) || "09:00",
      durationMinutes: item.durationMinutes,
    })
  }

  function closeDialog() {
    setDialog(emptyDialog)
    setError(null)
  }

  function saveDialog(asDraft = false) {
    setError(null)
    const payload: CalendarItemInput = {
      id: dialog.itemId,
      title: dialog.title,
      description: dialog.description,
      kind: dialog.kind,
      category: dialog.category,
      scheduledDate: asDraft ? null : dialog.date,
      startTime: asDraft ? null : dialog.startTime,
      durationMinutes: dialog.durationMinutes,
    }

    startTransition(async () => {
      try {
        const saved = await saveCalendarItem(payload)
        setItems((current) => upsertItem(current, saved))
        closeDialog()
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Could not save the calendar item.")
      }
    })
  }

  function moveItem(itemId: number, dateKey: string | null) {
    setError(null)
    startTransition(async () => {
      try {
        const moved = await moveCalendarItem(itemId, dateKey)
        setItems((current) => upsertItem(current, moved))
      } catch (moveError) {
        setError(moveError instanceof Error ? moveError.message : "Could not move the calendar item.")
      }
    })
  }

  function navigate(step: number) {
    setAnchorDate((current) => {
      const next = new Date(current)
      if (mode === "month") {
        next.setMonth(current.getMonth() + step)
      } else {
        next.setDate(current.getDate() + step * 7)
      }
      return next
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[#ded8ce] px-4 py-4 md:px-6 md:py-5">
        <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_560px] xl:items-start xl:gap-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#10a37f]">Calendar</p>
            <h1 className="mt-2 text-[1.9rem] font-semibold leading-[1.06] tracking-normal text-[#2b2824] md:text-[2.15rem] xl:text-[2.35rem]">
              Schedule the work, hold the maybes.
            </h1>
            <p className="mt-2 max-w-xl text-[0.98rem] leading-7 text-[#756d64] md:text-base">
              Add tasks and reminders to dates, keep unscheduled drafts nearby, and drag work into place when the plan firms up.
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:w-[560px] xl:shrink-0 xl:items-end">
            <div className="flex w-full items-center justify-end gap-2 overflow-hidden">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Previous"
                onClick={() => navigate(-1)}
                className="size-9 shrink-0 border-[#ded8ce] bg-[#f8f5ef] text-[#625b53] hover:bg-white"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="min-w-[110px] shrink-0 text-center text-[1.05rem] font-semibold text-[#2b2824]">{monthFormatter.format(anchorDate)}</div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Next"
                onClick={() => navigate(1)}
                className="size-9 shrink-0 border-[#ded8ce] bg-[#f8f5ef] text-[#625b53] hover:bg-white"
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAnchorDate(new Date())}
                className="h-9 shrink-0 border-[#ded8ce] bg-[#f8f5ef] px-3.5 text-[#625b53] hover:bg-white"
              >
                <CalendarDays className="mr-2 size-4" />
                Today
              </Button>
              <div className="flex h-9 shrink-0 rounded-md border border-[#ded8ce] bg-[#f8f5ef] p-1">
                {(["month", "week"] as const).map((view) => (
                  <button
                    type="button"
                    key={view}
                    onClick={() => setMode(view)}
                    className={cn(
                      "rounded px-3.5 text-sm font-medium capitalize text-[#625b53] transition-colors",
                      mode === view && "bg-white text-[#b84236] shadow-sm"
                    )}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex w-full justify-start xl:justify-end">
              <Button type="button" onClick={() => openNewDialog(toDateKey(anchorDate))} className="h-10 bg-[#ef6f61] px-5 text-white hover:bg-[#df5e50]">
                <Plus className="mr-2 size-4" />
                New task
              </Button>
            </div>
          </div>
        </div>
        {error && <p className="mt-4 rounded-md border border-[#f6b2aa] bg-[#fff0ed] px-3 py-2 text-sm text-[#b84236]">{error}</p>}
      </header>

      <div className="grid min-w-0 flex-1 gap-4 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(290px,320px)]">
        <section className="min-w-0 overflow-hidden rounded-lg border border-[#ded8ce] bg-[#fdfbf7] shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-[#ded8ce] bg-white px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-[1.1rem] font-semibold text-[#2b2824]">{monthFormatter.format(anchorDate)}</h2>
              <p className="mt-1 text-sm text-[#756d64]">Drop drafts or scheduled items onto any date.</p>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-[#ded8ce] bg-white text-center text-[0.78rem] font-semibold uppercase tracking-normal text-[#837b72]">
            {weekdayLabels.map((day) => (
              <div key={day} className="px-2 py-4">
                {day}
              </div>
            ))}
          </div>

          <div className={cn("grid grid-cols-7", mode === "month" ? "auto-rows-[minmax(130px,1fr)]" : "auto-rows-[minmax(420px,1fr)]")}>
            {visibleDays.map((date) => {
              const dateKey = toDateKey(date)
              const dayItems = sortItems(itemsByDate[dateKey] ?? [])
              const muted = mode === "month" && date.getMonth() !== anchorDate.getMonth()
              const isToday = dateKey === todayKey

              return (
                <button
                  type="button"
                  key={dateKey}
                  onClick={() => openNewDialog(dateKey)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    const itemId = Number(event.dataTransfer.getData("text/plain"))
                    if (itemId) {
                      moveItem(itemId, dateKey)
                    }
                  }}
                className={cn(
                    "flex min-w-0 flex-col border-b border-r border-[#ded8ce] bg-[#fdfbf7] p-2 text-left transition-colors hover:bg-white",
                    muted && "bg-[#f4eee5] text-[#a29a91]",
                    isToday && "ring-1 ring-inset ring-[#ef6f61]"
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={cn("flex size-7 items-center justify-center rounded-full text-xs font-semibold", isToday && "bg-[#ef6f61] text-white")}>
                      {date.getDate()}
                    </span>
                    {mode === "week" && (
                      <span className="truncate text-xs font-semibold text-[#837b72]">
                        {shortMonthFormatter.format(date)}
                      </span>
                    )}
                  </div>

                  <div className="min-h-0 space-y-1 overflow-y-auto pr-1">
                    {dayItems.map((item) => (
                      <TaskChip key={item.id} item={item} onEdit={openEditDialog} />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <aside
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const itemId = Number(event.dataTransfer.getData("text/plain"))
            if (itemId) {
              moveItem(itemId, null)
            }
          }}
          className="rounded-lg border border-[#ded8ce] bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[1.05rem] font-semibold text-[#2b2824]">Draft Task Panel</p>
              <p className="mt-1 text-sm text-[#756d64]">Drag drafts onto any date.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Create draft"
              onClick={() => openNewDialog(null)}
              className="size-10 border-[#ded8ce] bg-[#fdfbf7] text-[#625b53] hover:bg-white"
            >
              <Plus className="size-5" />
            </Button>
          </div>

          <div className="mt-5 space-y-2">
            {draftItems.length === 0 ? (
              <div className="grid min-h-[122px] place-items-center rounded-md border border-dashed border-[#d7cec4] bg-[#fdfbf7] p-5 text-sm leading-6 text-[#756d64]">
                <div className="max-w-[240px] text-center">
                  <ListTodo className="mx-auto mb-2 size-5 text-[#71788a]" />
                  <p className="text-[1rem] font-medium text-[#2b2824]">No drafts waiting</p>
                  <p className="mt-1">Save unscheduled tasks here, then drag them onto any date.</p>
                </div>
              </div>
            ) : (
              draftItems.map((item) => <DraftItem key={item.id} item={item} onEdit={openEditDialog} />)
            )}
          </div>
        </aside>
      </div>

      {dialog.open && (
        <TaskDialog
          dialog={dialog}
          setDialog={setDialog}
          pending={pending}
          onClose={closeDialog}
          onSave={() => saveDialog(false)}
          onDraft={() => saveDialog(true)}
        />
      )}
    </div>
  )
}

function TaskChip({ item, onEdit }: { item: CalendarItemView; onEdit: (item: CalendarItemView) => void }) {
  const styles = getCategoryStyle(item.category)

  return (
    <div
      draggable
      onDragStart={(event) => event.dataTransfer.setData("text/plain", String(item.id))}
      onClick={(event) => {
        event.stopPropagation()
        onEdit(item)
      }}
      className={cn("w-full rounded-md border px-2 py-1 text-xs shadow-sm", styles.chip, styles.border)}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <GripVertical className="size-3 shrink-0 opacity-60" />
        <span className="truncate font-semibold">{item.title}</span>
      </div>
      <div className="mt-1 flex items-center gap-1 text-[0.68rem] opacity-80">
        <Clock className="size-3" />
        <span>{item.startTime?.slice(0, 5) || "Any time"}</span>
      </div>
    </div>
  )
}

function DraftItem({ item, onEdit }: { item: CalendarItemView; onEdit: (item: CalendarItemView) => void }) {
  const styles = getCategoryStyle(item.category)

  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => event.dataTransfer.setData("text/plain", String(item.id))}
      onClick={() => onEdit(item)}
      className={cn("w-full rounded-md border p-3 text-left shadow-sm transition-colors hover:bg-white", styles.border, styles.soft)}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 size-4 shrink-0 text-[#837b72]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#2b2824]">{item.title}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#756d64]">
            {item.description || `${item.kind === "task" ? "Task" : "Reminder"} waiting to be scheduled`}
          </p>
          <span className={cn("mt-2 inline-flex rounded px-2 py-1 text-xs font-semibold", styles.chip)}>
            {styles.label}
          </span>
        </div>
      </div>
    </button>
  )
}

function TaskDialog({
  dialog,
  setDialog,
  pending,
  onClose,
  onSave,
  onDraft,
}: {
  dialog: DialogState
  setDialog: React.Dispatch<React.SetStateAction<DialogState>>
  pending: boolean
  onClose: () => void
  onSave: () => void
  onDraft: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 p-3 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-[452px] overflow-y-auto rounded-lg border border-[#ded8ce] bg-[#f8f5ef] shadow-xl">
        <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5">
          <div>
            <h2 className="text-base font-semibold text-[#2b2824]">
              {dialog.itemId ? "Edit calendar item" : "Create calendar item"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#756d64]">Selected date: {formatDateHeading(dialog.date)}</p>
          </div>
          <button type="button" onClick={onClose} className="pt-0.5 text-xs font-semibold text-[#2b2824] hover:text-[#ef6f61]">
            Close
          </button>
        </div>

        <div className="grid gap-3 px-5 pb-4">
          <label className="grid gap-2 text-sm font-semibold text-[#2b2824]">
            Task title
            <input
              value={dialog.title}
              onChange={(event) => setDialog((current) => ({ ...current, title: event.target.value }))}
              placeholder="Design review"
              className="h-9 rounded-md border border-[#ded8ce] bg-[#fffaf1] px-3 text-sm font-normal outline-none shadow-inner shadow-stone-200/40 focus:border-[#ef6f61]"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[#2b2824]">
            Description
            <textarea
              value={dialog.description}
              onChange={(event) => setDialog((current) => ({ ...current, description: event.target.value }))}
              placeholder="Add details, links, or notes."
              rows={4}
              className="resize-none rounded-md border border-[#ded8ce] bg-[#fffaf1] px-3 py-2 text-sm font-normal leading-6 outline-none shadow-inner shadow-stone-200/40 focus:border-[#ef6f61]"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-[#2b2824]">
              Time
              <input
                type="time"
                value={dialog.startTime}
                onChange={(event) => setDialog((current) => ({ ...current, startTime: event.target.value }))}
                className="h-9 rounded-md border border-[#ded8ce] bg-[#fffaf1] px-3 text-sm font-normal outline-none shadow-inner shadow-stone-200/40 focus:border-[#ef6f61]"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#2b2824]">
              Type
              <select
                value={dialog.kind}
                onChange={(event) =>
                  setDialog((current) => ({ ...current, kind: event.target.value as CalendarKind }))
                }
                className="h-9 rounded-md border border-[#ded8ce] bg-[#fffaf1] px-3 text-sm font-normal capitalize outline-none shadow-inner shadow-stone-200/40 focus:border-[#ef6f61]"
              >
                <option value="task">Task</option>
                <option value="reminder">Reminder</option>
              </select>
            </label>
          </div>

          <div className="grid gap-2 text-sm font-semibold text-[#2b2824]">
            Category
            <div className="flex flex-wrap gap-2">
              {calendarCategories.map((category) => {
                const styles = categoryStyles[category]
                const selected = dialog.category === category

                return (
                  <button
                    type="button"
                    key={category}
                    onClick={() => setDialog((current) => ({ ...current, category }))}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition-colors",
                      selected ? `border-[#ef6f61] ${styles.soft} text-[#2b2824] shadow-sm` : `${styles.border} ${styles.chip}`
                    )}
                  >
                    <span className={cn("size-2.5 rounded-full", styles.dot)} />
                    <span>{styles.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 px-5 pb-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDraft} disabled={pending} className="border-[#ded8ce] bg-[#fffaf1] text-[#625b53] hover:bg-white">
            Save draft
          </Button>
          <Button type="button" onClick={onSave} disabled={pending} className="bg-[#ef6f61] text-white hover:bg-[#df5e50]">
            {pending ? "Saving..." : dialog.date ? "Schedule" : "Save task"}
          </Button>
        </div>
      </div>
    </div>
  )
}
