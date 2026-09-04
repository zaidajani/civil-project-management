"use client";

import { useState, useMemo } from "react";
import { tasks } from "@/data/tasks";
import { Task } from "@/types/task";

const LEVEL_LABELS: Record<number, string> = {
  1: "L1 — Project Root",
  2: "L2 — Work Package",
  3: "L3 — Work Package Group",
  4: "L4 — Trade Package",
  5: "L5 — Executable Work Package",
  6: "L6 — Executable Activity",
};

const DISCIPLINE_COLORS: Record<string, string> = {
  Civil: "bg-amber-100 text-amber-700",
  Structural: "bg-slate-100 text-slate-700",
  Electrical: "bg-cyan-100 text-cyan-700",
  Finishing: "bg-purple-100 text-purple-700",
  General: "bg-gray-100 text-gray-700",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateOptional(dateStr?: string) {
  return dateStr ? formatDate(dateStr) : "—";
}

function getStatusClass(status: Task["status"]): string {
  const map: Record<Task["status"], string> = {
    "Not Started": "bg-status-atrisk-bg text-status-atrisk",
    "In Progress": "bg-active-bg text-primary",
    "Completed": "bg-status-ontrack-bg text-status-ontrack",
    "Delayed": "bg-status-delayed-bg text-status-delayed",
  };
  return map[status] || "bg-gray-100 text-gray-700";
}

function getPriorityClass(priority: Task["priority"]): string {
  const map: Record<Task["priority"], string> = {
    Critical: "bg-status-delayed-bg text-status-delayed",
    High: "bg-status-atrisk-bg text-status-atrisk",
    Medium: "bg-accent/20 text-accent",
    Low: "bg-status-ontrack-bg text-status-ontrack",
  };
  return map[priority] || "bg-gray-100 text-gray-700";
}

export default function TasksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const disciplines = useMemo(() => [...new Set(tasks.map(t => t.discipline))].sort(), []);
  const levels = useMemo(() => [...new Set(tasks.map(t => t.level))].sort(), []);
  const statuses = useMemo(() => [...new Set(tasks.map(t => t.status))].sort(), []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch =
        searchQuery === "" ||
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.activityCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDiscipline = disciplineFilter === "all" || task.discipline === disciplineFilter;
      const matchesLevel = levelFilter === "all" || task.level.toString() === levelFilter;
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      return matchesSearch && matchesDiscipline && matchesLevel && matchesStatus;
    });
  }, [tasks, searchQuery, disciplineFilter, levelFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold text-text-primary tracking-tight">Tasks</h1>
        <p className="mt-2 text-text-secondary text-base lg:text-lg max-w-3xl">
          Complete project task register across all hierarchy levels (L1–L6).
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name or activity code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={disciplineFilter}
              onChange={(e) => setDisciplineFilter(e.target.value)}
              className="px-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Disciplines</option>
              {disciplines.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Levels</option>
              {levels.map(l => (
                <option key={l} value={l.toString()}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="grid">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Activity Code</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Task Name</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Level</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Discipline</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Planned Start</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Planned End</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Actual Start</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Actual End</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Progress</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-text-muted">
                    No tasks found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="cursor-pointer hover:bg-hover transition-colors"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedTask(task);
                      }
                    }}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-text-primary">{task.activityCode}</td>
                    <td className="px-4 py-3 text-text-primary font-medium max-w-xs truncate">{task.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {LEVEL_LABELS[task.level]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${DISCIPLINE_COLORS[task.discipline] || DISCIPLINE_COLORS.General}`}>
                        {task.discipline}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{formatDate(task.plannedStart)}</td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{formatDate(task.plannedEnd)}</td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{formatDateOptional(task.actualStart)}</td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{formatDateOptional(task.actualEnd)}</td>
                    <td className="px-4 py-3">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${task.actualProgress}%` }} />
                      </div>
                      <span className="text-xs text-text-secondary ml-1">{task.actualProgress}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`status-badge ${task.status.toLowerCase().replace(" ", "-")}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityClass(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-4 border-t border-border text-sm text-text-secondary">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </div>
      </div>

      {selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-in fade-in-0"
          onClick={() => setSelectedTask(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-title"
        >
          <div
            className="card w-full max-w-3xl max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 id="detail-title" className="text-lg font-semibold text-text-primary">Task Details</h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="btn-icon p-1.5 rounded-md focus-ring"
                aria-label="Close detail panel"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Activity Code</p>
                  <p className="mt-1 font-mono text-text-primary">{selectedTask.activityCode}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Level</p>
                  <p className="mt-1 text-text-primary">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {LEVEL_LABELS[selectedTask.level]}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Discipline</p>
                  <p className="mt-1 text-text-primary">{selectedTask.discipline}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Priority</p>
                  <p className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityClass(selectedTask.priority)}`}>
                      {selectedTask.priority}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Planned Start</p>
                  <p className="mt-1 text-text-primary">{formatDate(selectedTask.plannedStart)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Planned End</p>
                  <p className="mt-1 text-text-primary">{formatDate(selectedTask.plannedEnd)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Actual Start</p>
                  <p className="mt-1 text-text-primary">{formatDateOptional(selectedTask.actualStart)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Actual End</p>
                  <p className="mt-1 text-text-primary">{formatDateOptional(selectedTask.actualEnd)}</p>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Progress</p>
                  <p className="mt-1 text-text-primary">{selectedTask.actualProgress}%</p>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Status</p>
                  <p className="mt-1">
                    <span className={`status-badge ${selectedTask.status.toLowerCase().replace(" ", "-")}`}>
                      {selectedTask.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Hierarchy Path</p>
                <div className="space-y-2 text-sm">
                  {(() => {
                    const path: string[] = [];
                    let current: Task | undefined = selectedTask;
                    while (current) {
                      if (!current.parentId) break;
                      const parent = tasks.find(t => t.id === current!.parentId);
                      if (!parent) break;
                      path.unshift(`${parent.activityCode} — ${parent.name}`);
                      current = parent;
                    }
                    return path.length === 0 ? (
                      <p className="text-text-muted">Root level task</p>
                    ) : (
                      path.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-text-secondary">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted" aria-hidden="true">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                          <span>{p}</span>
                        </div>
                      ))
                    );
                  })()}
                  <div className="flex items-center gap-2 text-text-primary font-medium">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent" aria-hidden="true">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                    <span>{selectedTask.activityCode} — {selectedTask.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}