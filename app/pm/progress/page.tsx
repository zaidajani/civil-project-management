"use client";

import { useState, useMemo } from "react";
import { tasks } from "@/data/tasks";
import { schedules } from "@/data/schedule";
import { progressUpdates } from "@/data/progress";
import { 
  calculateVariance, 
  getHealthStatus, 
  getHealthStatusColor, 
  getVarianceColor,
  getVarianceLabel,
  calculateProjectVariance,
  computeActivityVariances,
  ActivityVariance,
  VarianceSummary,
  HealthStatus
} from "@/lib/progress";
import { Task } from "@/types/task";

const LEVEL_LABELS: Record<number, string> = {
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

function getStatusClass(status: string): string {
  const map: Record<string, string> = {
    "Not Started": "bg-status-atrisk-bg text-status-atrisk",
    "In Progress": "bg-active-bg text-primary",
    "Completed": "bg-status-ontrack-bg text-status-ontrack",
    "Delayed": "bg-status-delayed-bg text-status-delayed",
  };
  return map[status] || "bg-gray-100 text-gray-700";
}

function getLatestProgress(taskId: string): number {
  const updates = progressUpdates.filter(p => p.taskId === taskId);
  if (updates.length === 0) return 0;
  const latest = updates.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b);
  return latest.actualProgress;
}

export default function ProgressPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<HealthStatus | "all">("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<ActivityVariance | null>(null);

  const tasksWithProgress = useMemo(() => {
    return tasks.map(task => {
      const schedule = schedules.find(s => s.taskId === task.id);
      const actualProgress = getLatestProgress(task.id);
      return {
        ...task,
        plannedProgress: schedule?.plannedProgress ?? task.plannedProgress,
        actualProgress,
      };
    });
  }, []);

  const summary = useMemo(() => calculateProjectVariance(tasksWithProgress), [tasksWithProgress]);

  const activityVariances = useMemo(() => computeActivityVariances(tasksWithProgress), [tasksWithProgress]);

  const disciplines = useMemo(() => 
    [...new Set(activityVariances.map(v => v.discipline))].sort(), 
    [activityVariances]
  );

  const filteredVariances = useMemo(() => {
    return activityVariances.filter(v => {
      const matchesSearch = 
        searchQuery === "" ||
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.activityCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDiscipline = disciplineFilter === "all" || v.discipline === disciplineFilter;
      const matchesHealth = healthFilter === "all" || v.healthStatus === healthFilter;
      const matchesLevel = levelFilter === "all" || v.level.toString() === levelFilter;
      return matchesSearch && matchesDiscipline && matchesHealth && matchesLevel;
    });
  }, [activityVariances, searchQuery, disciplineFilter, healthFilter, levelFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold text-text-primary tracking-tight">Progress & Variance</h1>
        <p className="mt-2 text-text-secondary text-base lg:text-lg max-w-3xl">
          Compare planned schedule performance with actual field progress and identify activities requiring attention.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Planned Progress</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{summary.plannedProgress}%</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Actual Progress</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{summary.actualProgress}%</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Overall Variance</p>
          <p className={`mt-1 text-2xl font-semibold ${getVarianceColor(summary.variance)}`}>
            {getVarianceLabel(summary.variance)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">L5/L6 Activities</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">
            {summary.onTrack + summary.atRisk + summary.delayed + summary.completed}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Completed</p>
          <p className="mt-1 text-2xl font-semibold text-status-ontrack">{summary.completed}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">On Track</p>
          <p className="mt-1 text-2xl font-semibold text-status-ontrack">{summary.onTrack}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">At Risk</p>
          <p className="mt-1 text-2xl font-semibold text-status-atrisk">{summary.atRisk}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Delayed</p>
          <p className="mt-1 text-2xl font-semibold text-status-delayed">{summary.delayed}</p>
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
              placeholder="Search activity by name or code..."
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
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value as HealthStatus | "all")}
              className="px-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Health</option>
              <option value="COMPLETED">Completed</option>
              <option value="ON_TRACK">On Track</option>
              <option value="AT_RISK">At Risk</option>
              <option value="DELAYED">Delayed</option>
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Levels</option>
              <option value="5">L5 — Work Package</option>
              <option value="6">L6 — Activity</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="grid">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Activity Code</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Activity</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Discipline</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Planned Start</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Planned End</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Actual Start</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Actual End</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Planned %</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Actual %</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Variance</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Health</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVariances.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-text-muted">
                    No activities found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredVariances.map(v => (
                  <tr
                    key={v.taskId}
                    onClick={() => setSelectedTask(v)}
                    className="cursor-pointer hover:bg-hover transition-colors"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedTask(v);
                      }
                    }}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-text-primary">{v.activityCode}</td>
                    <td className="px-4 py-3 text-text-primary font-medium max-w-xs truncate">{v.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${DISCIPLINE_COLORS[v.discipline] || DISCIPLINE_COLORS.General}`}>
                        {v.discipline}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{formatDate(v.plannedStart)}</td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{formatDate(v.plannedEnd)}</td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{formatDateOptional(v.actualStart)}</td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{formatDateOptional(v.actualEnd)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-border transition-all duration-300" style={{ width: `${v.plannedProgress}%` }} />
                        </div>
                        <span className="text-xs text-text-secondary font-mono">{v.plannedProgress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${v.actualProgress}%` }} />
                        </div>
                        <span className="text-xs text-text-primary font-mono">{v.actualProgress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <span className={getVarianceColor(v.variance)}>
                        {getVarianceLabel(v.variance)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getHealthStatusColor(v.healthStatus)}`}>
                        {v.healthStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`status-badge ${v.status.toLowerCase().replace(" ", "-")}`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border text-sm text-text-secondary">
          Showing {filteredVariances.length} of {activityVariances.length} L5/L6 activities (sorted by variance)
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
              <h2 id="detail-title" className="text-lg font-semibold text-text-primary">Activity Variance Details</h2>
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
                  <p className="mt-1 text-text-primary">{LEVEL_LABELS[selectedTask.level]}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Discipline</p>
                  <p className="mt-1 text-text-primary">{selectedTask.discipline}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Health Status</p>
                  <p className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getHealthStatusColor(selectedTask.healthStatus)}`}>
                      {selectedTask.healthStatus.replace("_", " ")}
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
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Planned Progress</p>
                  <p className="mt-1 text-text-primary">{selectedTask.plannedProgress}%</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Actual Progress</p>
                  <p className="mt-1 text-text-primary">{selectedTask.actualProgress}%</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Variance</p>
                  <p className={`mt-1 font-semibold ${getVarianceColor(selectedTask.variance)}`}>
                    {getVarianceLabel(selectedTask.variance)}
                  </p>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Schedule Status</p>
                  <p className="mt-1">
                    <span className={`status-badge ${selectedTask.status.toLowerCase().replace(" ", "-")}`}>
                      {selectedTask.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-text-secondary">
                  {selectedTask.variance < 0
                    ? `Actual progress is ${Math.abs(selectedTask.variance)} percentage point${Math.abs(selectedTask.variance) !== 1 ? "s" : ""} behind planned progress.`
                    : selectedTask.variance > 0
                    ? `Actual progress is ${selectedTask.variance} percentage point${selectedTask.variance !== 1 ? "s" : ""} ahead of planned progress.`
                    : "Actual progress matches planned progress."}
                </p>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Variance Explanation</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden flex-1">
                      <div className="h-full bg-border" style={{ width: `${selectedTask.plannedProgress}%` }} />
                    </div>
                    <span className="text-text-secondary font-mono w-16 text-right">{selectedTask.plannedProgress}%</span>
                    <span className="text-xs text-text-muted">Planned</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden flex-1">
                      <div className="h-full bg-accent" style={{ width: `${selectedTask.actualProgress}%` }} />
                    </div>
                    <span className="text-text-primary font-mono w-16 text-right">{selectedTask.actualProgress}%</span>
                    <span className="text-xs text-text-muted">Actual</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-24"></span>
                    <span className="text-text-muted font-mono w-16 text-right">{getVarianceLabel(selectedTask.variance)}</span>
                    <span className="text-xs text-text-muted">Variance</span>
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