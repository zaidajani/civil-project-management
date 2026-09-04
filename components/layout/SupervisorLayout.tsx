"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/supervisor", label: "Overview", mark: "▦" },
  { href: "/supervisor/tasks", label: "Todo List", mark: "✓" },
  { href: "/supervisor/converse", label: "Converse to Task", mark: "◌" },
  { href: "/supervisor/collaborations", label: "Collaborations", mark: "⇄" },
  { href: "/supervisor/reports", label: "Daily Reports", mark: "▤" },
];

export function SupervisorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return <div className="min-h-screen bg-bg flex">
    <aside className="sidebar fixed top-0 left-0 z-40 h-screen w-64 flex flex-col border-r">
      <div className="flex h-16 items-center px-5 border-b">
        <Link href="/supervisor" className="flex items-center gap-2.5" aria-label="CivilManager Supervisor Home">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-semibold">CM</div>
          <span className="text-lg font-semibold text-text-primary tracking-tight">CivilManager</span>
        </Link>
      </div>
      <div className="px-5 py-4 border-b bg-active-bg/40">
        <p className="text-xs uppercase tracking-wide text-text-secondary font-medium">Workspace</p>
        <p className="mt-1 text-sm font-semibold text-primary">Supervisor Portal</p>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-0.5" aria-label="Supervisor navigation">
        {navigation.map(item => {
          const active = pathname === item.href;
          return <Link key={item.href} href={item.href} className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-md focus-ring ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
            <span className="w-5 text-center text-base leading-none" aria-hidden="true">{item.mark}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>;
        })}
      </nav>
      <div className="border-t p-3">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">RS</div>
          <div className="min-w-0"><p className="text-sm font-medium text-text-primary truncate">Rahul Sharma</p><p className="text-xs text-text-secondary truncate">Site Supervisor</p></div>
        </div>
      </div>
    </aside>
    <div className="flex-1 flex flex-col lg:ml-64">
      <header className="header fixed top-0 left-64 right-0 z-30 h-16 flex items-center justify-between px-5 lg:px-6 border-b">
        <div><h1 className="text-base font-semibold text-text-primary">Mumbai Metro Station</h1><p className="text-xs text-text-secondary">Supervisor workspace</p></div>
        <div className="flex items-center gap-3 relative">
          <span className="status-badge status-in-progress hidden sm:inline-flex">Day shift</span>
          <button onClick={() => setNotificationsOpen(!notificationsOpen)} className="btn-icon p-2 rounded-md focus-ring relative" aria-label="Notifications">
            <span aria-hidden="true">♧</span><span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-status-delayed rounded-full" />
          </button>
          {notificationsOpen && <div className="absolute right-0 top-12 w-80 card-elevated bg-surface-elevated border rounded-md overflow-hidden"><p className="px-4 py-3 text-sm font-medium border-b">Notifications</p><div className="p-4 text-sm text-text-secondary">2 tasks are awaiting your assignment approval.</div></div>}
        </div>
      </header>
      <main className="flex-1 p-6 lg:p-8 pt-20 lg:pt-24"><div className="max-w-7xl mx-auto w-full">{children}</div></main>
    </div>
  </div>;
}
