"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { labourers } from "@/data/supervisor";
import { supervisorStore } from "@/lib/supervisor";
import { SupervisorTask } from "@/types/supervisor";

const statusColor: Record<string, string> = { "Awaiting Approval": "bg-status-atrisk-bg text-status-atrisk", Assigned: "bg-active-bg text-primary", "In Progress": "bg-active-bg text-primary", Completed: "bg-status-ontrack-bg text-status-ontrack", Blocked: "bg-status-delayed-bg text-status-delayed" };

export default function SupervisorPage() {
  const [tasks, setTasks] = useState<SupervisorTask[]>([]);
  useEffect(() => {
    const load = window.setTimeout(() => setTasks(supervisorStore.tasks()), 0);
    return () => window.clearTimeout(load);
  }, []);
  const summary = useMemo(() => ({ pending: tasks.filter(t => t.status === "Awaiting Approval").length, today: tasks.filter(t => t.dueDate === "2026-09-04").length, inProgress: tasks.filter(t => t.status === "In Progress" || t.status === "Assigned").length, availableLabourers: labourers.filter(labourer => labourer.availability === "Available").length }), [tasks]);
  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"><div><h1 className="text-2xl lg:text-3xl font-semibold text-text-primary tracking-tight">Good morning, Rahul</h1><p className="mt-2 text-text-secondary text-base lg:text-lg">Keep today’s crews aligned, safe, and moving.</p></div><div className="flex gap-3"><Link href="/supervisor/converse" className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-hover">Converse to Task</Link><Link href="/supervisor/tasks" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light">Add task</Link></div></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[{ label: "Due today", value: summary.today, tone: "text-text-primary" }, { label: "Awaiting approval", value: summary.pending, tone: "text-status-atrisk" }, { label: "Work in motion", value: summary.inProgress, tone: "text-primary" }, { label: "Available labourers", value: summary.availableLabourers, tone: "text-status-ontrack" }].map(card => <div key={card.label} className="card p-5"><p className="text-xs font-medium text-text-secondary uppercase tracking-wide">{card.label}</p><p className={`mt-1 text-3xl font-semibold ${card.tone}`}>{card.value}</p></div>)}
    </div>
    <div className="grid gap-6 lg:grid-cols-3"><section className="card p-6 lg:col-span-2"><div className="flex justify-between items-center mb-4"><div><h2 className="text-lg font-semibold">Today’s task queue</h2><p className="text-sm text-text-secondary mt-1">Prioritise approvals before dispatching work.</p></div><Link className="text-sm text-primary font-medium" href="/supervisor/tasks">View all</Link></div><div className="space-y-3">{tasks.slice(0, 4).map(task => <div key={task.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-bg border border-border rounded-lg"><div className="flex-1 min-w-0"><p className="font-medium truncate">{task.title}</p><p className="text-sm text-text-secondary truncate">{task.location} · {task.classification.hierarchyLabel}</p></div><span className={`status-badge ${statusColor[task.status]}`}>{task.status}</span></div>)}</div></section>
      <section className="card p-6"><h2 className="text-lg font-semibold">Labour availability</h2><div className="mt-4 space-y-4">{labourers.filter(labourer => labourer.availability !== "Engaged").slice(0, 4).map(labourer => <div key={labourer.id}><div className="flex justify-between gap-2 text-sm"><span className="font-medium">{labourer.name}</span><span className={labourer.availability === "Available" ? "text-status-ontrack" : "text-status-atrisk"}>{labourer.availability}</span></div><p className="text-xs text-text-secondary mt-0.5">{labourer.trade} · {labourer.zone}</p></div>)}</div></section></div>
    <section className="card p-6"><div className="flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-status-inprogress-bg text-primary flex items-center justify-center text-xl">◌</span><div><h2 className="text-lg font-semibold">AI task assistant</h2><p className="text-sm text-text-secondary">Enter field instructions in plain language. The prototype recommends the hierarchy and the best-matched labourer before you approve.</p></div><Link href="/supervisor/converse" className="ml-auto text-sm font-medium text-primary">Open assistant →</Link></div></section>
  </div>;
}
