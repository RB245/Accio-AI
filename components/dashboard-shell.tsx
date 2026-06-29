"use client"

import {
  Bot,
  Building2,
  CalendarDays,
  CircleUserRound,
  FileText,
  Gauge,
  Grid3X3,
  Home,
  Layers3,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PenTool,
  Plus,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  X,
} from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ActivePage = "dashboard" | "calendar" | "kanban"

type DashboardShellProps = {
  activePage?: ActivePage
  children?: React.ReactNode
}

const navItems = [
  {
    label: "Workspace",
    items: [
      { name: "Dashboard", href: "/", icon: Home, color: "text-[#ef6f61]", page: "dashboard" },
      { name: "AI Assistant", href: "#", icon: Bot, color: "text-[#7c5cff]" },
      { name: "Calendar", href: "/calendar", icon: CalendarDays, color: "text-[#10a37f]", page: "calendar" },
      { name: "Task / Kanban", href: "/kanban", icon: Grid3X3, color: "text-[#f59e0b]", page: "kanban" },
    ],
  },
  {
    label: "Create",
    items: [
      { name: "Notes", href: "#", icon: FileText, color: "text-[#0ea5e9]" },
      { name: "Whiteboard", href: "#", icon: PenTool, color: "text-[#f97316]" },
      { name: "Pages / Spaces", href: "#", icon: Layers3, color: "text-[#22c55e]" },
      { name: "AI Template Builder", href: "#", icon: Gauge, color: "text-[#d946ef]" },
    ],
  },
  {
    label: "System",
    items: [{ name: "Settings", href: "#", icon: Settings, color: "text-stone-500" }],
  },
]

const footerItems = [
  { name: "User Profile", icon: CircleUserRound, color: "text-[#84a11f]" },
  { name: "Workspace / Team", icon: Building2, color: "text-[#10a37f]" },
  { name: "Logout", icon: LogOut, color: "text-[#ef6f61]" },
]

const metrics = [
  { label: "Open tasks", value: "24", accent: "bg-[#ffe1dc] text-[#b84236]" },
  { label: "Notes drafted", value: "18", accent: "bg-[#dff7ec] text-[#08785f]" },
  { label: "Spaces active", value: "7", accent: "bg-[#fff1c7] text-[#946200]" },
  { label: "AI templates", value: "12", accent: "bg-[#eadfff] text-[#6747c7]" },
]

const pulseItems = [
  { title: "Design review", meta: "Today", border: "border-l-[#ef6f61]" },
  { title: "Sprint notes", meta: "2 drafts", border: "border-l-[#10a37f]" },
  { title: "Whiteboard ideas", meta: "14 objects", border: "border-l-[#f59e0b]" },
]

const activity = [
  "Product roadmap board updated",
  "AI summarized weekly planning notes",
  "Calendar focus block moved to 2:00 PM",
]

const notes = [
  {
    title: "Launch narrative",
    body: "Tighten the product story around focused teams, visual planning, and AI templates.",
  },
  {
    title: "Meeting takeaways",
    body: "Convert design critique into three kanban actions before tomorrow's review.",
  },
]

export function DashboardShell({ activePage = "dashboard", children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <main className="flex min-h-screen bg-[#f7f3ea] text-[#27231f]">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-stone-950/25 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col border-r border-[#ded8ce] bg-[#f8f5ef] px-4 py-5 transition-[transform,width] duration-300 lg:sticky lg:z-auto lg:translate-x-0",
          collapsed ? "w-[74px]" : "w-[252px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#ef6f61] text-white shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <div className={cn("min-w-0", collapsed && "sr-only")}>
            <p className="truncate text-sm font-semibold">Flowbase</p>
            <p className="truncate text-xs text-[#837b72]">Cozy workspace</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close sidebar"
            onClick={() => setMobileOpen(false)}
            className="ml-auto size-8 text-stone-500 lg:hidden"
          >
            <X className="size-4" />
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((value) => !value)}
          className="absolute -right-4 top-20 hidden size-8 rounded-full border border-[#ded8ce] bg-[#f8f5ef] text-[#837b72] shadow-sm hover:bg-white lg:inline-flex"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>

        <div
          className={cn(
            "mt-5 flex h-8 items-center gap-2 rounded-md border border-[#ded8ce] bg-[#fdfbf7] px-2.5 text-xs text-[#837b72]",
            collapsed && "justify-center px-0"
          )}
        >
          <Search className="size-4 shrink-0" />
          <span className={cn("truncate", collapsed && "sr-only")}>Search everything</span>
        </div>

        <nav className="mt-5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
          <div className="space-y-4">
            {navItems.map((group) => (
              <div key={group.label}>
                <p
                  className={cn(
                    "mb-1.5 px-2 text-[0.65rem] font-semibold uppercase tracking-normal text-[#a29a91]",
                    collapsed && "sr-only"
                  )}
                >
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = item.page === activePage
                    const Icon = item.icon

                    return (
                      <Link
                        href={item.href}
                        key={item.name}
                        title={collapsed ? item.name : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-[0.82rem] font-medium text-[#625b53] transition-colors hover:bg-[#eee7df] hover:text-[#27231f]",
                          active && "bg-[#ffe1dc] text-[#b84236] shadow-sm",
                          collapsed && "justify-center px-0"
                        )}
                      >
                        <Icon className={cn("size-3.5 shrink-0", active ? "text-[#ef6f61]" : item.color)} />
                        <span className={cn("truncate", collapsed && "sr-only")}>{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="mt-3 shrink-0 border-t border-[#ded8ce] pt-3">
          {footerItems.map((item) => (
            <button
              type="button"
              key={item.name}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-[0.82rem] font-medium text-[#625b53] hover:bg-[#eee7df] hover:text-[#27231f]",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon className={cn("size-3.5 shrink-0", item.color)} />
              <span className={cn("truncate", collapsed && "sr-only")}>{item.name}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Open sidebar"
          onClick={() => setMobileOpen(true)}
          className="fixed left-4 top-4 z-30 size-9 border border-[#ded8ce] bg-[#f8f5ef] text-[#625b53] shadow-sm lg:hidden"
        >
          <Menu className="size-5" />
        </Button>
        {children ?? <DashboardContent />}
      </section>
    </main>
  )
}

function DashboardContent() {
  return (
    <>
      <header className="border-b border-[#ded8ce] px-5 py-6 md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 pl-12 lg:pl-0">
            <p className="text-sm font-semibold text-[#d95345]">Dashboard</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-normal text-[#2b2824]">
              Plan, write, and map your work in one calm place.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#756d64]">
              A focused home for tasks, notes, whiteboards, pages, and AI-assisted workflows.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Button variant="outline" className="border-[#ded8ce] bg-[#f8f5ef] text-[#625b53] hover:bg-white">
              <CalendarDays className="mr-2 size-4" />
              Today
            </Button>
            <Button className="bg-[#ef6f61] text-white hover:bg-[#df5e50]">
              <Plus className="mr-2 size-4" />
              New space
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-5 p-5 md:p-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-[#ded8ce] bg-[#f8f5ef] p-5 shadow-sm">
              <span className={cn("rounded-md px-2 py-1 text-xs font-semibold", metric.accent)}>
                {metric.label}
              </span>
              <p className="mt-5 text-3xl font-semibold tracking-normal text-[#2b2824]">{metric.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <div className="rounded-lg border border-[#ded8ce] bg-[#f8f5ef] p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#2b2824]">Workspace pulse</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {pulseItems.map((item) => (
                <div
                  key={item.title}
                  className={cn("rounded-md border border-[#ded8ce] border-l-4 bg-[#fdfbf7] p-4", item.border)}
                >
                  <p className="text-sm font-semibold text-[#2b2824]">{item.title}</p>
                  <p className="mt-1 text-xs text-[#756d64]">{item.meta}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#ded8ce] bg-[#f8f5ef] p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#2b2824]">Recent activity</h2>
            <div className="mt-4 space-y-3">
              {activity.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-[#625b53]">
                  <span className="size-2 rounded-full bg-[#ef6f61]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-lg border border-[#ded8ce] bg-[#f8f5ef] p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#2b2824]">Pinned notes</h2>
            <div className="mt-4 space-y-3">
              {notes.map((note) => (
                <div key={note.title} className="rounded-md border border-[#ded8ce] bg-[#fdfbf7] p-4">
                  <div className="flex items-center gap-2">
                    <StickyNote className="size-4 text-[#ef6f61]" />
                    <p className="text-sm font-semibold text-[#2b2824]">{note.title}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#625b53]">{note.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#ded8ce] bg-[#f8f5ef] p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#2b2824]">Whiteboard preview</h2>
            <div className="relative mt-4 h-72 overflow-hidden rounded-md border border-[#ded8ce] bg-[#fdfbf7]">
              <div className="absolute left-[10%] top-[22%] rounded-md bg-[#ffe1dc] px-4 py-3 text-sm font-semibold text-[#b84236] shadow-sm">
                Ideas
              </div>
              <div className="absolute left-[42%] top-[47%] rounded-md bg-[#dff7ec] px-4 py-3 text-sm font-semibold text-[#08785f] shadow-sm">
                Tasks
              </div>
              <div className="absolute right-[12%] top-[26%] rounded-md bg-[#fff1c7] px-4 py-3 text-sm font-semibold text-[#946200] shadow-sm">
                Pages
              </div>
              <div className="absolute left-[23%] top-[38%] h-px w-[31%] rotate-[18deg] bg-[#d6cec3]" />
              <div className="absolute right-[24%] top-[42%] h-px w-[24%] -rotate-[16deg] bg-[#d6cec3]" />
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
