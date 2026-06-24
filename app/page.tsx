import { auth } from "@clerk/nextjs/server"

import { DashboardShell } from "@/components/dashboard-shell"
import { syncCurrentUserByEmail } from "@/lib/sync-user"

export default async function Home() {
  const { userId } = await auth()

  if (userId) {
    await syncCurrentUserByEmail()
  }

  return <DashboardShell />
}
