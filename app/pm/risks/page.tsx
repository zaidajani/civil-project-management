"use client";

import { useState, useMemo } from "react";
import { tasks } from "@/data/tasks";
import { schedules } from "@/data/schedule";
import { progressUpdates } from "@/data/progress";
import { risks } from "@/data/risks";
import { 
  calculateVariance, 
  getHealthStatus, 
  getHealthStatusColor, 
  getVarianceColor,
  getVarianceLabel,
  computeActivityVariances,
  getDelayedActivities,
  getAttentionItems,
  ActivityVariance,
  HealthStatus
} from "@/lib/progress";
import { Risk } from "@/types/risk";

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

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "bg-status-delayed-bg text-status-delayed",
  High: "bg-status-atrisk-bg text-status-atrisk",
  Medium: "bg-accent/20 text-accent",
  Low: "bg-status-ontrack-bg text-status-ontrack",
};

const RISK_STATUS_COLORS: Record<string, string> = {
  Open: "bg-status-delayed-bg text-status-delayed",
  Monitoring: "bg-status-atrisk-bg text-status-atrisk",
  Resolved: "bg-status-ontrack-bg text-status-ontrack",
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

export default function RisksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [riskStatusFilter, setRiskStatusFilter] = useState<string>("all");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const [delayFilter, setDelayFilter] = useState<"all" | "AT_RISK" | "DELAYED">("all");
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);

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

  const activityVariances = useMemo(() => computeActivityVariances(tasksWithProgress), [tasksWithProgress]);
  const delayedActivities = useMemo(() => getDelayedActivities(tasksWithProgress), [tasksWithProgress]);

  const disciplines = useMemo(() => 
    [...new Set([...activityVariances.map(v => v.discipline), ...risks.map(r => r.taskId)])].sort(), 
    [activityVariances, risks]
  );

  const openRisks = risks.filter(r => r.status === "Open" || r.status === "Monitoring");
  const criticalRisks = risks.filter(r => r.severity === "Critical" && (r.status === "Open" || r.status === "Monitoring"));

  const summary = useMemo(() => ({
    criticalRisks: criticalRisks.length,
    openRisks: openRisks.length,
    activitiesDelayed: delayedActivities.filter(a => a.healthStatus === "DELAYED").length,
    activitiesAtRisk: delayedActivities.filter(a => a.healthStatus === "AT_RISK").length,
    risksMonitored: risks.filter(r => r.status === "Monitoring").length,
  }), [risks, delayedActivities]);

  const filteredRisks = useMemo(() => {
    return risks.filter(r => {
      const matchesSearch = 
        searchQuery === "" ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity = severityFilter === "all" || r.severity === severityFilter;
      const matchesStatus = riskStatusFilter === "all" || r.status === riskStatusFilter;
      const task = tasks.find(t => t.id === r.taskId);
      const matchesDiscipline = disciplineFilter === "all" || (task && task.discipline === disciplineFilter);
      return matchesSearch && matchesSeverity && matchesStatus && matchesDiscipline;
    });
  }, [risks, searchQuery, severityFilter, riskStatusFilter, disciplineFilter, tasks]);

  const filteredDelayedActivities = useMemo(() => {
    return delayedActivities.filter(a => {
      const matchesSearch = 
        searchQuery === "" ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.activityCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDiscipline = disciplineFilter === "all" || a.discipline === disciplineFilter;
      const matchesDelay = delayFilter === "all" || a.healthStatus === delayFilter;
      return matchesSearch && matchesDiscipline && matchesDelay;
    });
  }, [delayedActivities, searchQuery, disciplineFilter, delayFilter]);

  const attentionItems = useMemo(() => getAttentionItems(tasksWithProgress, risks), [tasksWithProgress, risks]);

  const getRelatedDelayedActivities = (risk: Risk) => {
    if (!risk.relatedActivityIds) return [];
    return activityVariances.filter(a => 
      risk.relatedActivityIds!.includes(a.taskId) && 
      (a.healthStatus === "DELAYED" || a.healthStatus === "AT_RISK")
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold text-text-primary tracking-tight">Risks & Delays</h1>
        <p className="mt-2 text-text-secondary text-base lg:text-lg max-w-3xl">
          Monitor schedule delays, project risks and activities requiring immediate attention.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card p-5 border-l-4 border-status-delayed">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Critical Risks</p>
          <p className="mt-1 text-2xl font-semibold text-status-delayed">{summary.criticalRisks}</p>
        </div>
        <div className="card p-5 border-l-4 border-status-atrisk">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Open Risks</p>
          <p className="mt-1 text-2xl font-semibold text-status-atrisk">{summary.openRisks}</p>
        </div>
        <div className="card p-5 border-l-4 border-status-delayed">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Activities Delayed</p>
          <p className="mt-1 text-2xl font-semibold text-status-delayed">{summary.activitiesDelayed}</p>
        </div>
        <div className="card p-5 border-l-4 border-status-atrisk">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Activities At Risk</p>
          <p className="mt-1 text-2xl font-semibold text-status-atrisk">{summary.activitiesAtRisk}</p>
        </div>
        <div className="card p-5 border-l-4 border-accent">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Risks Being Monitored</p>
          <p className="mt-1 text-2xl font-semibold text-accent">{summary.risksMonitored}</p>
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
              placeholder="Search risks or delayed activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              value={riskStatusFilter}
              onChange={(e) => setRiskStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Risk Status</option>
              <option value="Open">Open</option>
              <option value="Monitoring">Monitoring</option>
              <option value="Resolved">Resolved</option>
            </select>
            <select
              value={disciplineFilter}
              onChange={(e) => setDisciplineFilter(e.target.value)}
              className="px-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Disciplines</option>
              <option value="Civil">Civil</option>
              <option value="Structural">Structural</option>
              <option value="Electrical">Electrical</option>
              <option value="Finishing">Finishing</option>
              <option value="General">General</option>
            </select>
            <select
              value={delayFilter}
              onChange={(e) => setDelayFilter(e.target.value as "all" | "AT_RISK" | "DELAYED")}
              className="px-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Delays</option>
              <option value="DELAYED">Delayed</option>
              <option value="AT_RISK">At Risk</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card p-6 lg:p-8 space-y-6">
        <h2 className="text-lg font-semibold text-text-primary">Requires Attention</h2>
        <div className="space-y-3">
          {attentionItems.length === 0 ? (
            <p className="text-text-muted text-center py-8">No items requiring immediate attention.</p>
          ) : (
            attentionItems.slice(0, 8).map((attention, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 bg-bg border border-border rounded-lg">
                <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${attention.type === "RISK" ? "bg-status-delayed-bg text-status-delayed" : "bg-active-bg text-primary"}`}>
                  {attention.type}
                </span>
                <div className="flex-1 min-w-0">
                  {attention.type === "RISK" ? (
                    <>
                      <p className="font-medium text-text-primary">{attention.item.title}</p>
                      <p className="text-sm text-text-secondary">{attention.item.description}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-text-primary">{attention.item.activityCode} — {attention.item.name}</p>
                      <p className="text-sm text-text-secondary">
                        Variance: <span className={getVarianceColor(attention.item.variance)} font-mono>{getVarianceLabel(attention.item.variance)}</span>
                        <span className="ml-2">Health: </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getHealthStatusColor(attention.item.healthStatus)}`}>
                          {attention.item.healthStatus.replace("_", " ")}
                        </span>
                      </p>
                    </>
                  )}
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${attention.type === "RISK" ? SEVERITY_COLORS[attention.item.severity] : getHealthStatusColor(attention.item.healthStatus)}`}>
                  {attention.type === "RISK" ? attention.item.severity : attention.item.healthStatus.replace("_", " ")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card space-y-6">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Schedule Delays</h2>
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-sm" role="grid">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Activity Code</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Activity</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Discipline</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Planned End</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Actual End</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Progress</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Variance</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDelayedActivities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-text-muted">
                    No delayed or at-risk activities found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredDelayedActivities.map(a => (
                  <tr key={a.taskId} className="hover:bg-hover/50">
                    <td className="px-4 py-3 font-mono text-xs text-text-primary">{a.activityCode}</td>
                    <td className="px-4 py-3 text-text-primary font-medium max-w-xs truncate">{a.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${DISCIPLINE_COLORS[a.discipline] || DISCIPLINE_COLORS.General}`}>
                        {a.discipline}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{formatDate(a.plannedEnd)}</td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{formatDateOptional(a.actualEnd)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-accent" style={{ width: `${a.actualProgress}%` }} />
                        </div>
                        <span className="text-xs text-text-primary font-mono">{a.actualProgress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <span className={getVarianceColor(a.variance)}>
                        {getVarianceLabel(a.variance)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getHealthStatusColor(a.healthStatus)}`}>
                        {a.healthStatus.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card space-y-6">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Risk Register</h2>
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-sm" role="grid">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Risk</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Discipline</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Severity</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Impact</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Identified</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Target Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRisks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                    No risks found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredRisks.map(risk => {
                  const task = tasks.find(t => t.id === risk.taskId);
                  const relatedDelayed = getRelatedDelayedActivities(risk);
                  return (
                    <tr
                      key={risk.id}
                      onClick={() => setSelectedRisk(risk)}
                      className="cursor-pointer hover:bg-hover transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-text-primary">{risk.title}</div>
                        <div className="text-xs text-text-muted max-w-xs truncate">{risk.description}</div>
                        {relatedDelayed.length > 0 && (
                          <div className="mt-1">
                            <span className="text-xs text-text-secondary">Related delays: </span>
                            <span className="text-xs text-text-primary font-mono">
                              {relatedDelayed.map(a => a.activityCode).join(", ")}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {task ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${DISCIPLINE_COLORS[task.discipline] || DISCIPLINE_COLORS.General}`}>
                            {task.discipline}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[risk.severity]}`}>
                          {risk.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${RISK_STATUS_COLORS[risk.status]}`}>
                          {risk.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary max-w-xs truncate">{risk.expectedImpact}</td>
                      <td className="px-4 py-3 text-text-secondary font-mono text-xs">{formatDate(risk.identifiedDate)}</td>
                      <td className="px-4 py-3 text-text-secondary font-mono text-xs">—</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRisk && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-in fade-in-0"
          onClick={() => setSelectedRisk(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="risk-detail-title"
        >
          <div
            className="card w-full max-w-3xl max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 id="risk-detail-title" className="text-lg font-semibold text-text-primary">Risk Details</h2>
              <button
                onClick={() => setSelectedRisk(null)}
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Risk Title</p>
                  <p className="mt-1 text-text-primary">{selectedRisk.title}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Severity</p>
                  <p className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[selectedRisk.severity]}`}>
                      {selectedRisk.severity}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Status</p>
                  <p className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${RISK_STATUS_COLORS[selectedRisk.status]}`}>
                      {selectedRisk.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Identified Date</p>
                  <p className="mt-1 text-text-secondary font-mono">{formatDate(selectedRisk.identifiedDate)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Description</p>
                  <p className="mt-1 text-text-primary">{selectedRisk.description}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Expected Impact</p>
                  <p className="mt-1 text-text-secondary">{selectedRisk.expectedImpact}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Related Task</p>
                  <p className="mt-1 text-text-secondary font-mono">
                    {(() => {
                      const task = tasks.find(t => t.id === selectedRisk.taskId);
                      return task ? `${task.activityCode} — ${task.name}` : selectedRisk.taskId;
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Related Delayed Activities</p>
                  <p className="mt-1 text-text-primary">
                    {(() => {
                      const related = getRelatedDelayedActivities(selectedRisk);
                      return related.length > 0
                        ? related.map(a => `${a.activityCode} (${a.healthStatus.replace("_", " ")})`).join(", ")
                        : "—";
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}