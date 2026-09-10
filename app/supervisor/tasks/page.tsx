"use client";

import { useMemo, useState } from "react";
import { labourers } from "@/data/supervisor";
import { createSupervisorTask, getRecommendations, supervisorStore } from "@/lib/supervisor";
import { RecommendationResult, SupervisorTask, TaskPriority } from "@/types/supervisor";

const priorityTone: Record<string, string> = { Low: "bg-status-ontrack-bg text-status-ontrack", Medium: "bg-bg text-text-secondary", High: "bg-status-atrisk-bg text-status-atrisk", Critical: "bg-status-delayed-bg text-status-delayed" };
const statusTone: Record<string, string> = { Unassigned: "bg-status-atrisk-bg text-status-atrisk", Assigned: "bg-active-bg text-primary", "In Progress": "bg-active-bg text-primary", Completed: "bg-status-ontrack-bg text-status-ontrack", Blocked: "bg-status-delayed-bg text-status-delayed" };

export default function TasksPage() {
  const [tasks, setTasks] = useState<SupervisorTask[]>(() => supervisorStore.tasks());
  const [text, setText] = useState(""); const [location, setLocation] = useState(""); const [dueDate, setDueDate] = useState("2026-09-05"); const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [filter, setFilter] = useState("All"); const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = tasks.find(t => t.id === selectedId) ?? null;
  const visible = useMemo(() => filter === "All" ? tasks : tasks.filter(t => t.status === filter), [tasks, filter]);
  const persist = (next: SupervisorTask[]) => { setTasks(next); supervisorStore.saveTasks(next); };
  const addTask = () => { if (!text.trim()) return; const next = createSupervisorTask({ description: text.trim(), location, dueDate, priority, source: "Manual" }); persist([next, ...tasks]); setSelectedId(next.id); setText(""); setLocation(""); };
  const assign = (task: SupervisorTask, labourerId = task.suggestedLabourerId) => persist(tasks.map(item => item.id === task.id ? { ...item, assignedLabourerId: labourerId, assignedToSelf: false, status: "Assigned", dispatchStatus: "Queued" } : item));
  const assignSelf = (task: SupervisorTask) => persist(tasks.map(item => item.id === task.id ? { ...item, assignedToSelf: true, assignedLabourerId: undefined, status: "In Progress", dispatchStatus: "Not sent" } : item));
  const assignLabour = (task: SupervisorTask, labourerId: string) => persist(tasks.map(item => item.id === task.id ? { ...item, assignedLabourerId: labourerId, assignedToSelf: false, status: "Assigned", dispatchStatus: "Sent" } : item));

  // Daily progress calculation
  const todayStr = new Date().toISOString().split("T")[0];
  const completedToday = tasks.filter(t => t.status === "Completed" && t.completedAt?.startsWith(todayStr)).length;
  const totalActiveToday = tasks.filter(t => t.dueDate === todayStr || t.status !== "Completed" || t.completedAt?.startsWith(todayStr)).length;

  const toggleComplete = (task: SupervisorTask) => {
    if (task.status === "Completed") {
      // Untick: restore previous status
      const prevStatus = task.previousStatus || (task.assignedToSelf ? "In Progress" : task.assignedLabourerId ? "Assigned" : "Unassigned");
      persist(tasks.map(item => item.id === task.id ? { 
        ...item, 
        status: prevStatus, 
        completedAt: undefined, 
        previousStatus: undefined,
        dispatchStatus: prevStatus === "Assigned" ? "Queued" : prevStatus === "In Progress" ? "Not sent" : "Not sent"
      } : item));
    } else {
      // Tick: mark completed
      persist(tasks.map(item => item.id === task.id ? { 
        ...item, 
        previousStatus: item.status,
        status: "Completed", 
        completedAt: new Date().toISOString(),
        dispatchStatus: "Not sent"
      } : item));
    }
  };

  return <div className="space-y-6">
    <div><h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">Todo List</h1><p className="mt-2 text-text-secondary text-base lg:text-lg">Create field work and let the prototype classify and assign it immediately.</p></div>
    
    {/* Daily Progress Summary */}
    <section className="card p-5 lg:p-6 bg-primary/5 border-primary/20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold">✓</span>
          <div>
            <p className="font-semibold text-text-primary">TODAY'S PROGRESS</p>
            <p className="text-sm text-text-secondary">{completedToday} / {totalActiveToday} tasks completed</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-32 h-4 bg-bg border border-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: totalActiveToday > 0 ? `${Math.round((completedToday / totalActiveToday) * 100)}%` : '0%' }}></div>
          </div>
          <span className="text-lg font-bold text-primary">{totalActiveToday > 0 ? Math.round((completedToday / totalActiveToday) * 100) : 0}%</span>
        </div>
      </div>
    </section>

    <section className="card p-5 lg:p-6"><div className="flex items-center gap-3 mb-4"><span className="w-9 h-9 rounded-lg bg-active-bg text-primary flex items-center justify-center font-semibold">AI</span><div><h2 className="font-semibold">Add a task</h2><p className="text-sm text-text-secondary">The prototype classifies the task and assigns the best-matched individual labourer.</p></div></div><textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Example: Complete shuttering for beam B12 before tomorrow afternoon." className="w-full px-3 py-2.5 border border-border rounded-lg bg-surface-elevated text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary" />
      <div className="grid gap-3 mt-3 md:grid-cols-4"><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location / work zone" className="px-3 py-2 border border-border rounded-lg bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-primary" /><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="px-3 py-2 border border-border rounded-lg bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-primary" /><select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="px-3 py-2 border border-border rounded-lg bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-primary"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select><button onClick={addTask} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light">Create and assign task</button></div>
    </section>
    <div className="flex flex-wrap gap-2">{["All", "Unassigned", "Assigned", "In Progress", "Completed", "Blocked"].map(item => <button key={item} onClick={() => setFilter(item)} className={`px-3 py-1.5 rounded-full text-sm border ${filter === item ? "bg-primary text-white border-primary" : "bg-surface-elevated text-text-secondary border-border hover:bg-hover"}`}>{item}</button>)}</div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]"><section className="card overflow-hidden"><div className="divide-y divide-border">{visible.length === 0 ? <p className="p-8 text-center text-text-secondary">No tasks match this filter.</p> : visible.map(task => { const labourer = labourers.find(item => item.id === (task.assignedLabourerId || task.suggestedLabourerId)); return <button key={task.id} onClick={() => setSelectedId(task.id)} className={`w-full text-left p-5 hover:bg-hover transition-colors ${selectedId === task.id ? "bg-active-bg/50 border-l-4 border-primary" : ""}`}><div className="flex gap-3 justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2 items-center"><input type="checkbox" checked={task.status === "Completed"} onChange={() => toggleComplete(task)} onClick={e => e.stopPropagation()} className="w-5 h-5 text-primary border-border rounded focus:ring-primary" aria-label="Mark complete" /><p className="font-semibold text-text-primary">{task.title}</p><span className={`status-badge ${priorityTone[task.priority]}`}>{task.priority}</span></div><p className="mt-1 text-sm text-text-secondary">{task.location} · Due {task.dueDate}</p><p className="mt-2 text-xs text-text-secondary">L{task.classification.level} · {task.classification.hierarchyLabel}</p></div><span className={`status-badge h-fit whitespace-nowrap ${statusTone[task.status]}`}>{task.status}</span></div><div className="mt-3 flex items-center justify-between text-xs"><span className="text-text-secondary">{task.assignedToSelf ? "Assigned to you" : `${labourer?.name ?? "Labourer pending"}`}</span><span className={task.dispatchStatus === "Not sent" ? "text-text-muted" : "text-status-ontrack"}>WhatsApp: {task.dispatchStatus}</span></div>{task.status === "Completed" && task.completedAt && <div className="mt-2 flex items-center gap-2 text-xs text-status-ontrack"><span>✓ COMPLETED</span><span>Completed today at {new Date(task.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div>}</button>; })}</div></section>
      <aside className="card p-5 h-fit xl:sticky xl:top-24">{selected ? <TaskInspector task={selected} onApprove={approve} onSelf={assignSelf} onAssign={assignLabour} /> : <div className="py-12 text-center text-text-secondary"><p className="text-lg">Select a task</p><p className="mt-2 text-sm">Its AI classification and labour recommendation will appear here.</p></div>}</aside>
    </div>
  </div>;
}

function TaskInspector({ task, onApprove, onSelf, onAssign }: { task: SupervisorTask; onApprove: (task: SupervisorTask, labourerId?: string) => void; onSelf: (task: SupervisorTask) => void; onAssign: (task: SupervisorTask, labourerId: string) => void }) {
  const [labourerId, setLabourerId] = useState(task.assignedLabourerId || task.suggestedLabourerId);
  const labourer = labourers.find(item => item.id === labourerId);
  const recommendations = getRecommendations(task.classification, task.description, task.location, 5);
  const topRecommendation = recommendations[0];
  const otherRecommendations = recommendations.slice(1);

  const getDisciplineLabel = (discipline: string) => {
    const labels: Record<string, string> = {
      Civil: "Civil Work",
      Structural: "Structural Work",
      Electrical: "Electrical Work",
      Plumbing: "Plumbing Work",
      Finishing: "Finishing Work",
      General: "General Work",
    };
    return labels[discipline] || discipline;
  };

  const getWorkTypeLabel = (description: string, discipline: string) => {
    const normalized = description.toLowerCase();
    if (discipline === "Civil" || discipline === "Structural") {
      if (/(shutter|formwork)/.test(normalized)) return "Beam / Shuttering";
      if (/(reinforcement|rebar|steel)/.test(normalized)) return "Reinforcement / Rebar";
      if (/(concrete|pour)/.test(normalized)) return "Concrete Work";
      if (/(excavat|foundation|pile|earthwork)/.test(normalized)) return "Excavation / Foundation";
      if (/(brickwork|masonry|block)/.test(normalized)) return "Masonry / Brickwork";
    }
    if (discipline === "Electrical") {
      if (/(conduit|cable)/.test(normalized)) return "Conduit / Cable";
      if (/(panel|board)/.test(normalized)) return "Panel Installation";
      if (/(lighting|fixture)/.test(normalized)) return "Lighting Installation";
    }
    if (discipline === "Plumbing") {
      if (/(drain|drainage)/.test(normalized)) return "Drainage / Pipes";
      if (/(water supply|water)/.test(normalized)) return "Water Supply";
      if (/(sanitary|fixture)/.test(normalized)) return "Sanitary Installation";
    }
    if (discipline === "Finishing") {
      if (/(plaster)/.test(normalized)) return "Plastering";
      if (/(tile|tiling)/.test(normalized)) return "Tiling";
      if (/(paint|painting)/.test(normalized)) return "Painting";
      if (/(waterproof)/.test(normalized)) return "Waterproofing";
    }
    return discipline;
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wide font-medium text-text-secondary">AI recommendation</p>
        <h2 className="mt-1 text-lg font-semibold">{task.title}</h2>
        <p className="mt-2 text-sm text-text-secondary">{task.description}</p>
      </div>

      <div className="p-4 bg-bg border border-border rounded-lg space-y-3">
        <div className="flex justify-between gap-4">
          <span className="text-sm text-text-secondary">Hierarchy</span>
          <span className="text-sm font-medium text-right">L{task.classification.level}</span>
        </div>
        <p className="text-sm font-medium text-primary">{task.classification.hierarchyLabel}</p>
        <p className="text-xs text-text-secondary">{task.classification.reasoning}</p>
        <div className="pt-3 border-t flex justify-between">
          <span className="text-sm text-text-secondary">Confidence</span>
          <span className="text-sm font-semibold text-status-ontrack">{task.classification.confidence}%</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-primary">Task classification</span>
            <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded">AI</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-text-secondary">Type:</span> <span className="font-medium ml-1">{getDisciplineLabel(task.classification.discipline)}</span></div>
            <div><span className="text-text-secondary">Work:</span> <span className="font-medium ml-1">{getWorkTypeLabel(task.description, task.classification.discipline)}</span></div>
          </div>
        </div>

        {topRecommendation && (
          <div className="p-4 bg-surface-elevated border border-border rounded-lg space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {topRecommendation.labourer.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="font-semibold text-text-primary">{topRecommendation.labourer.name}</p>
                  <p className="text-sm text-text-secondary">{topRecommendation.labourer.trade} · {topRecommendation.labourer.experience} years experience</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{topRecommendation.score}% Match</p>
                <p className="text-xs text-text-secondary">AI Recommendation</p>
              </div>
            </div>

            <div className="pt-3 border-t space-y-2">
              <p className="text-xs font-medium text-text-secondary">Why this worker?</p>
              <ul className="space-y-1 text-xs text-text-secondary">
                {topRecommendation.reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">{reason}</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t text-xs">
              <div><span className="text-text-secondary">Trade</span> <p className="font-medium">{topRecommendation.labourer.tradeCategory}</p></div>
              <div><span className="text-text-secondary">Experience</span> <p className="font-medium">{topRecommendation.labourer.experience} years</p></div>
              <div><span className="text-text-secondary">Availability</span> <p className="font-medium text-status-ontrack">{topRecommendation.labourer.availability}</p></div>
            </div>

            {task.status === "Unassigned" && (
              <button
                onClick={() => onAssign(task, topRecommendation.labourer.id)}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light mt-2"
              >
                Assign Labour
              </button>
            )}
          </div>
        )}

        {otherRecommendations.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-text-secondary">OTHER SUITABLE LABOUR</p>
            {otherRecommendations.map((rec, idx) => (
              <button
                key={rec.labourer.id}
                onClick={() => setLabourerId(rec.labourer.id)}
                className={`w-full p-3 rounded-lg border text-left transition-colors ${
                  labourerId === rec.labourer.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-hover"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-bg flex items-center justify-center text-text-secondary font-medium text-sm">
                      {rec.labourer.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{rec.labourer.name}</p>
                      <p className="text-xs text-text-secondary">{rec.labourer.trade} · {rec.labourer.experience} years · {rec.labourer.availability}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">{rec.score}% Match</p>
                    <p className="text-xs text-text-secondary">{rec.reasons[0]?.replace("✓ ", "")}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {task.status === "Unassigned" && (
        <div className="space-y-2">
          <button onClick={() => onApprove(task, labourerId)} className="w-full px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light">Approve & send on WhatsApp</button>
          <button onClick={() => onSelf(task)} className="w-full px-4 py-2.5 text-sm font-medium border border-border bg-surface-elevated rounded-lg hover:bg-hover">Assign to myself</button>
        </div>
      )}

      {task.status !== "Unassigned" && task.status !== "Completed" && (
        <div className="p-3 bg-status-ontrack-bg/10 border border-status-ontrack/20 rounded-lg text-sm text-status-ontrack">
          Task is <span className="font-medium">{task.status}</span>. Assignment cannot be changed.
        </div>
      )}

      {task.status === "Completed" && (
        <div className="p-3 bg-status-ontrack-bg/10 border border-status-ontrack/20 rounded-lg text-sm text-status-ontrack">
          ✓ Task completed {task.completedAt ? `at ${new Date(task.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
        </div>
      )}
    </div>
  );
}

// Helper function for approve (from PR changes - not used in new flow but kept for compatibility)
const approve = (task: SupervisorTask, labourerId?: string) => {};