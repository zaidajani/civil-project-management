"use client";

import { useState, useMemo, useEffect } from "react";
import { tasks as defaultTasks } from "@/data/tasks";
import { Task } from "@/types/task";
import { ProgressEvent } from "@/types/ingestion";
import { ScheduleUpdateAudit } from "@/types/ingestion";
import { ActivityTimeline } from "@/components/progress/ActivityTimeline";

const LEVEL_LABELS: Record<number, string> = {
  5: "L5 — Work Package",
  6: "L6 — Executable Activity",
};

const DISCIPLINE_COLORS: Record<string, string> = {
  Civil: "bg-amber-100 text-amber-700",
  Structural: "bg-slate-100 text-slate-700",
  Electrical: "bg-cyan-100 text-cyan-700",
  Finishing: "bg-purple-100 text-purple-700",
  General: "bg-gray-100 text-gray-700",
};

function getParentPath(task: Task, allTasks: Task[]): string[] {
  const path: string[] = [];
  let current: Task | undefined = task;
  
  while (current) {
    if (!current.parentId) break;
    const parentId: string = current.parentId;
    const parent: Task | undefined = allTasks.find((t) => t.id === parentId);
    if (!parent) break;
    path.unshift(`${parent.activityCode} — ${parent.name}`);
    current = parent;
  }
  
  return path;
}

function getParentName(task: Task, allTasks: Task[]): string {
  if (!task.parentId) return "—";
  const parent = allTasks.find((t) => t.id === task.parentId);
  return parent ? `${parent.activityCode} — ${parent.name}` : "—";
}

export default function SchedulePage() {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTasks = localStorage.getItem("schedule_tasks");
      if (storedTasks) {
        try {
          const parsed = JSON.parse(storedTasks) as Task[];
          setAllTasks(parsed);
        } catch {
          setAllTasks(defaultTasks);
        }
      } else {
        setAllTasks(defaultTasks);
      }
    }
  }, []);

  const l5l6Tasks = useMemo(
    () => allTasks.filter((t) => t.level === 5 || t.level === 6),
    [allTasks]
  );

  const [progressEvents, setProgressEvents] = useState<ProgressEvent[]>([]);
  const [auditTrail, setAuditTrail] = useState<ScheduleUpdateAudit[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedEvents = localStorage.getItem("ingestion_events");
      const storedMatches = localStorage.getItem("ingestion_matches");
      const storedAudits = localStorage.getItem("schedule_audits");
      if (storedEvents) {
        setProgressEvents(JSON.parse(storedEvents) as ProgressEvent[]);
      }
      if (storedMatches) {
        // We need matches to filter events by activity
        // For now, we'll use all events and the timeline component will filter by activityId
      }
      if (storedAudits) {
        setAuditTrail(JSON.parse(storedAudits) as ScheduleUpdateAudit[]);
      }
    }
  }, []);

  const disciplines = useMemo(
    () => [...new Set(l5l6Tasks.map((t) => t.discipline))].sort(),
    [l5l6Tasks]
  );

  const filteredTasks = useMemo(() => {
    return l5l6Tasks.filter((task) => {
      const matchesSearch =
        searchQuery === "" ||
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.activityCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDiscipline =
        disciplineFilter === "all" || task.discipline === disciplineFilter;
      const matchesLevel =
        levelFilter === "all" || task.level.toString() === levelFilter;
      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;
      return matchesSearch && matchesDiscipline && matchesLevel && matchesStatus;
    });
  }, [l5l6Tasks, searchQuery, disciplineFilter, levelFilter, statusFilter]);

  const totalActivities = l5l6Tasks.length;
  const l5Count = l5l6Tasks.filter((t) => t.level === 5).length;
  const l6Count = l5l6Tasks.filter((t) => t.level === 6).length;
  const startedCount = l5l6Tasks.filter((t) => t.actualStart).length;
  const completedCount = l5l6Tasks.filter((t) => t.status === "Completed").length;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold text-text-primary tracking-tight">
          Schedule & Activity Registry
        </h1>
        <p className="mt-2 text-text-secondary text-base lg:text-lg max-w-3xl">
          Baseline activity register for L5 work packages and L6 executable activities.
          Used to link actual site progress reports back to the planned schedule.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card p-5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Total Activities
          </p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{totalActivities}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            L5 Work Packages
          </p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{l5Count}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            L6 Executable Activities
          </p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{l6Count}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Started
          </p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{startedCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Completed
          </p>
          <p className="mt-1 text-2xl font-semibold text-status-ontrack">{completedCount}</p>
        </div>
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
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-md bg-white text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={disciplineFilter}
              onChange={(e) => setDisciplineFilter(e.target.value)}
              className="px-4 py-2.5 border border-border rounded-md bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="all">All Disciplines</option>
              {disciplines.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-4 py-2.5 border border-border rounded-md bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="all">All Levels</option>
              <option value="5">L5 — Work Package</option>
              <option value="6">L6 — Executable Activity</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-border rounded-md bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Delayed">Delayed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="grid">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                  Activity Code
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                  Activity Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                  Level
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                  Discipline
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                  Parent / Work Package
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                  Planned Start
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                  Planned End
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                  Actual Start
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                  Actual End
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-text-muted">
                    No activities found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
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
                    <td className="px-4 py-3 font-mono text-xs text-text-primary">
                      {task.activityCode}
                    </td>
                    <td className="px-4 py-3 text-text-primary font-medium max-w-xs truncate">
                      {task.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        {LEVEL_LABELS[task.level]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          DISCIPLINE_COLORS[task.discipline] || DISCIPLINE_COLORS.General
                        }`}
                      >
                        {task.discipline}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary max-w-xs truncate">
                      {getParentName(task, allTasks)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                      {formatDate(task.plannedStart)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                      {formatDate(task.plannedEnd)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                      {task.actualStart ? formatDate(task.actualStart) : "—"}
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                      {task.actualEnd ? formatDate(task.actualEnd) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-300"
                          style={{ width: `${task.actualProgress}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-secondary ml-1">
                        {task.actualProgress}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`status-badge ${task.status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {task.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-4 border-t border-border text-sm text-text-secondary">
          Showing {filteredTasks.length} of {l5l6Tasks.length} activities
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
              <h2 id="detail-title" className="text-lg font-semibold text-text-primary">
                Activity Details
              </h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="btn-icon p-1.5 rounded-md focus-ring"
                aria-label="Close detail panel"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Activity Code
                  </p>
                  <p className="mt-1 font-mono text-text-primary">{selectedTask.activityCode}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Level
                  </p>
                  <p className="mt-1 text-text-primary">
                    {LEVEL_LABELS[selectedTask.level]}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Discipline
                  </p>
                  <p className="mt-1 text-text-primary">{selectedTask.discipline}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Priority
                  </p>
                  <p className="mt-1 text-text-primary">{selectedTask.priority}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Planned Start
                  </p>
                  <p className="mt-1 text-text-primary">{formatDate(selectedTask.plannedStart)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Planned End
                  </p>
                  <p className="mt-1 text-text-primary">{formatDate(selectedTask.plannedEnd)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Actual Start
                  </p>
                  <p className="mt-1 text-text-primary">
                    {selectedTask.actualStart ? formatDate(selectedTask.actualStart) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Actual End
                  </p>
                  <p className="mt-1 text-text-primary">
                    {selectedTask.actualEnd ? formatDate(selectedTask.actualEnd) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Progress
                  </p>
                  <p className="mt-1 text-text-primary">{selectedTask.actualProgress}%</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Status
                  </p>
                  <p className="mt-1">
                    <span
                      className={`status-badge ${selectedTask.status
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      {selectedTask.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">
                  Hierarchy Path
                </p>
                <div className="space-y-2 text-sm">
                  {(() => {
                    const path = getParentPath(selectedTask, allTasks);
                    return path.length === 0 ? (
                      <p className="text-text-muted">Root level activity</p>
                    ) : (
                      path.map((p, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-text-secondary"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-text-muted"
                            aria-hidden="true"
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                          <span>{p}</span>
                        </div>
                      ))
                    );
                  })()}
                  <div className="flex items-center gap-2 text-text-primary font-medium">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-accent"
                      aria-hidden="true"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                    <span>{selectedTask.activityCode} — {selectedTask.name}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <ActivityTimeline
                  activity={selectedTask}
                  progressEvents={progressEvents}
                  audits={auditTrail}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}