import { asc, eq } from "drizzle-orm"

import { moveCalendarItem, saveCalendarItem } from "@/app/calendar/actions"
import { CalendarPage } from "@/components/calendar-page"
import { DashboardShell } from "@/components/dashboard-shell"
import { db, calendarItems } from "@/db"
import type { CalendarItemView } from "@/lib/calendar-types"
import { syncCurrentUserByEmail } from "@/lib/sync-user"

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

export default async function CalendarRoute() {
  const result = await syncCurrentUserByEmail()

  if (!result.ok) {
    return (
      <DashboardShell activePage="calendar">
        <div className="grid min-h-screen place-items-center p-6">
          <div className="max-w-md rounded-lg border border-[#ded8ce] bg-[#f8f5ef] p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-[#d95345]">Calendar</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#2b2824]">Sign in to plan your schedule.</h1>
            <p className="mt-3 text-sm leading-6 text-[#756d64]">{result.error}</p>
          </div>
        </div>
      </DashboardShell>
    )
  }

  const items = await db
    .select()
    .from(calendarItems)
    .where(eq(calendarItems.userId, result.user.id))
    .orderBy(asc(calendarItems.scheduledDate), asc(calendarItems.startTime), asc(calendarItems.createdAt))

  return (
    <DashboardShell activePage="calendar">
      <CalendarPage
        initialItems={items.map(serializeCalendarItem)}
        moveCalendarItem={moveCalendarItem}
        saveCalendarItem={saveCalendarItem}
      />
    </DashboardShell>
  )
}
