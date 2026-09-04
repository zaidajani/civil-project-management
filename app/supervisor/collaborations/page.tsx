"use client";

import { useEffect, useState } from "react";
import { seededCollaborations } from "@/data/supervisor";
import { supervisorStore } from "@/lib/supervisor";
import { Collaboration } from "@/types/supervisor";

const tone: Record<Collaboration["status"], string> = { Active: "bg-active-bg text-primary", Pending: "bg-status-atrisk-bg text-status-atrisk", Completed: "bg-status-ontrack-bg text-status-ontrack" };
export default function CollaborationsPage() {
  const [items, setItems] = useState<Collaboration[]>([]); const [showForm, setShowForm] = useState(false); const [title, setTitle] = useState(""); const [partner, setPartner] = useState("Anita Verma");
  useEffect(() => {
    const load = window.setTimeout(() => setItems(supervisorStore.collaborations()), 0);
    return () => window.clearTimeout(load);
  }, []);
  const create = () => { if (!title.trim()) return; const next: Collaboration = { id: `collab-${Date.now()}`, title, objective: "Shared coordination required — add details in the collaboration workspace.", partner, partnerTeam: partner === "Anita Verma" ? "Electrical Team D" : "Structural Team", dueDate: "2026-09-05", status: "Pending", taskCount: 0, updates: 0 }; const updated = [next, ...items]; setItems(updated); supervisorStore.saveCollaborations(updated); setShowForm(false); setTitle(""); };
  return <div className="space-y-6"><div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4"><div><h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">Collaborations</h1><p className="mt-2 text-text-secondary text-base lg:text-lg">Coordinate handoffs, shared readiness checks, and dependencies with other supervisor teams.</p></div><button onClick={() => setShowForm(!showForm)} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light">New collaboration</button></div>
    {showForm && <section className="card p-5"><h2 className="font-semibold">Set up a collaboration</h2><div className="mt-4 grid gap-3 md:grid-cols-3"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Collaboration title" className="px-3 py-2 border border-border rounded-lg bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-primary" /><select value={partner} onChange={e => setPartner(e.target.value)} className="px-3 py-2 border border-border rounded-lg bg-surface-elevated text-sm"><option>Anita Verma</option><option>Vikram Singh</option><option>Neha Kapoor</option></select><button onClick={create} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg">Send invitation</button></div></section>}
    <div className="grid gap-5 lg:grid-cols-2">{(items.length ? items : seededCollaborations).map(item => <article key={item.id} className="card p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">{item.title}</h2><p className="mt-2 text-sm text-text-secondary">{item.objective}</p></div><span className={`status-badge whitespace-nowrap ${tone[item.status]}`}>{item.status}</span></div><div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t text-sm"><div><p className="text-xs text-text-secondary">Partner</p><p className="mt-1 font-medium">{item.partner}</p><p className="text-xs text-text-secondary">{item.partnerTeam}</p></div><div><p className="text-xs text-text-secondary">Shared tasks</p><p className="mt-1 font-semibold">{item.taskCount}</p></div><div><p className="text-xs text-text-secondary">Updates</p><p className="mt-1 font-semibold">{item.updates}</p></div></div><div className="mt-5 flex justify-between items-center"><span className="text-xs text-text-secondary">Due {item.dueDate}</span><button className="text-sm font-medium text-primary">Open workspace →</button></div></article>)}</div>
  </div>;
}
