"use client";

import { useState, useMemo, useEffect } from "react";
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
  calculateProjectVariance,
  computeActivityVariances,
  getDelayedActivities,
  ActivityVariance,
  HealthStatus
} from "@/lib/progress";
import { IngestionRecord, ReviewItem } from "@/types/ingestion";
import { ScheduleUpdateAudit } from "@/types/ingestion";
import { Risk } from "@/types/risk";

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

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

export default function ReportsPage() {
  const [ingestionRecords, setIngestionRecords] = useState<IngestionRecord[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [auditTrail, setAuditTrail] = useState<ScheduleUpdateAudit[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRecords = localStorage.getItem("ingestion_records");
      if (storedRecords) {
        setIngestionRecords(JSON.parse(storedRecords) as IngestionRecord[]);
      }
      const storedReviews = localStorage.getItem("review_items");
      if (storedReviews) {
        setReviewItems(JSON.parse(storedReviews) as ReviewItem[]);
      }
      const storedAudits = localStorage.getItem("schedule_audits");
      if (storedAudits) {
        setAuditTrail(JSON.parse(storedAudits) as ScheduleUpdateAudit[]);
      }
    }
  }, []);

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

  const projectVariance = useMemo(() => calculateProjectVariance(tasksWithProgress), [tasksWithProgress]);
  const activityVariances = useMemo(() => computeActivityVariances(tasksWithProgress), [tasksWithProgress]);
  const delayedActivities = useMemo(() => getDelayedActivities(tasksWithProgress), [tasksWithProgress]);

  const dailyReports = ingestionRecords.filter(r => r.sourceType === "DAILY_REPORT");
  const spreadsheets = ingestionRecords.filter(r => r.sourceType === "SPREADSHEET");
  const totalEventsExtracted = ingestionRecords.reduce((sum, r) => sum + r.eventsExtracted, 0);
  const totalEventsMatched = ingestionRecords.reduce((sum, r) => sum + r.eventsMatched, 0);
  const totalEventsNeedingReview = ingestionRecords.reduce((sum, r) => sum + r.eventsNeedingReview, 0);
  const matchRate = totalEventsExtracted > 0 ? Math.round((totalEventsMatched / totalEventsExtracted) * 100) : 0;
  const reviewRate = totalEventsExtracted > 0 ? Math.round((totalEventsNeedingReview / totalEventsExtracted) * 100) : 0;

  const reviewedCount = reviewItems.filter(r => r.reviewStatus === "REVIEWED").length;
  const pendingReviewCount = reviewItems.filter(r => r.reviewStatus === "PENDING").length;
  const highConfidenceMatches = ingestionRecords.reduce((sum, r) => sum + r.eventsMatched, 0);
  const lowConfidenceMatches = ingestionRecords.reduce((sum, r) => sum + r.eventsNeedingReview, 0);

  const criticalRisks = risks.filter(r => r.severity === "Critical").length;
  const highRisks = risks.filter(r => r.severity === "High").length;
  const mediumRisks = risks.filter(r => r.severity === "Medium").length;
  const openRisks = risks.filter(r => r.status === "Open").length;
  const monitoringRisks = risks.filter(r => r.status === "Monitoring").length;
  const resolvedRisks = risks.filter(r => r.status === "Resolved").length;

  const topPriorityActivities = useMemo(() => {
    return activityVariances
      .filter(a => a.healthStatus === "DELAYED" || a.healthStatus === "AT_RISK")
      .slice(0, 10);
  }, [activityVariances]);

  const recentAudits = useMemo(() => {
    return [...auditTrail].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 10);
  }, [auditTrail]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-text-primary tracking-tight">Project Control Report</h1>
          <p className="mt-2 text-text-secondary text-base lg:text-lg max-w-3xl">
            Consolidated view of schedule performance, field updates, matching quality and project risks.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light transition-colors focus-ring hidden print:block"
        >
          Print Report
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        <div className="card p-5 print:shadow-none">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Planned Progress</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{projectVariance.plannedProgress}%</p>
        </div>
        <div className="card p-5 print:shadow-none">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Actual Progress</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{projectVariance.actualProgress}%</p>
        </div>
        <div className="card p-5 print:shadow-none">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Overall Variance</p>
          <p className={`mt-1 text-2xl font-semibold ${getVarianceColor(projectVariance.variance)}`}>
            {getVarianceLabel(projectVariance.variance)}
          </p>
        </div>
        <div className="card p-5 print:shadow-none">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">L5/L6 Activities</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">
            {projectVariance.onTrack + projectVariance.atRisk + projectVariance.delayed + projectVariance.completed}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        <div className="card p-4 border-l-4 border-status-ontrack print:shadow-none">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Completed</p>
          <p className="mt-1 text-2xl font-semibold text-status-ontrack">{projectVariance.completed}</p>
        </div>
        <div className="card p-4 border-l-4 border-status-ontrack print:shadow-none">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">On Track</p>
          <p className="mt-1 text-2xl font-semibold text-status-ontrack">{projectVariance.onTrack}</p>
        </div>
        <div className="card p-4 border-l-4 border-status-atrisk print:shadow-none">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">At Risk</p>
          <p className="mt-1 text-2xl font-semibold text-status-atrisk">{projectVariance.atRisk}</p>
        </div>
        <div className="card p-4 border-l-4 border-status-delayed print:shadow-none">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Delayed</p>
          <p className="mt-1 text-2xl font-semibold text-status-delayed">{projectVariance.delayed}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6 print:shadow-none">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Data Ingestion Summary</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 bg-bg border border-border rounded-lg">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Daily Reports</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{dailyReports.length}</p>
            </div>
            <div className="p-4 bg-bg border border-border rounded-lg">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Spreadsheets</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{spreadsheets.length}</p>
            </div>
            <div className="p-4 bg-bg border border-border rounded-lg">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Total Events</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{totalEventsExtracted}</p>
            </div>
            <div className="p-4 bg-bg border border-border rounded-lg sm:col-span-2">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Matched</p>
              <p className="mt-1 text-2xl font-semibold text-status-ontrack">{totalEventsMatched}</p>
            </div>
            <div className="p-4 bg-bg border border-border rounded-lg sm:col-span-2">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Requiring Review</p>
              <p className="mt-1 text-2xl font-semibold text-status-atrisk">{totalEventsNeedingReview}</p>
            </div>
            <div className="p-4 bg-bg border border-border rounded-lg sm:col-span-2">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Match Rate</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{matchRate}%</p>
            </div>
            <div className="p-4 bg-bg border border-border rounded-lg sm:col-span-2">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Review Rate</p>
              <p className="mt-1 text-2xl font-semibold text-status-atrisk">{reviewRate}%</p>
            </div>
          </div>
        </div>

        <div className="card p-6 print:shadow-none">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Review Queue Summary</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 bg-bg border border-border rounded-lg">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Total Reviewed</p>
              <p className="mt-1 text-2xl font-semibold text-status-ontrack">{reviewedCount}</p>
            </div>
            <div className="p-4 bg-bg border border-border rounded-lg">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Pending Review</p>
              <p className="mt-1 text-2xl font-semibold text-status-atrisk">{pendingReviewCount}</p>
            </div>
            <div className="p-4 bg-bg border border-border rounded-lg">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">High-Confidence Matches</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{highConfidenceMatches}</p>
            </div>
            <div className="p-4 bg-bg border border-border rounded-lg">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Low-Confidence Matches</p>
              <p className="mt-1 text-2xl font-semibold text-status-atrisk">{lowConfidenceMatches}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6 print:shadow-none">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Risk Summary</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 bg-bg border border-border rounded-lg">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Critical</p>
              <p className="mt-1 text-2xl font-semibold text-status-delayed">{criticalRisks}</p>
            </div>
            <div className="p-4 bg-bg border border-border rounded-lg">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">High</p>
              <p className="mt-1 text-2xl font-semibold text-status-atrisk">{highRisks}</p>
            </div>
            <div className="p-4 bg-bg border border-border rounded-lg">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Medium</p>
              <p className="mt-1 text-2xl font-semibold text-accent">{mediumRisks}</p>
            </div>
            <div className="p-4 bg-bg border border-border rounded-lg">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Open</p>
              <p className="mt-1 text-2xl font-semibold text-status-delayed">{openRisks}</p>
            </div>
            <div className="p-4 bg-bg border border-border rounded-lg">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Monitoring</p>
              <p className="mt-1 text-2xl font-semibold text-status-atrisk">{monitoringRisks}</p>
            </div>
            <div className="p-4 bg-bg border border-border rounded-lg">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Resolved</p>
              <p className="mt-1 text-2xl font-semibold text-status-ontrack">{resolvedRisks}</p>
            </div>
          </div>
        </div>

        <div className="card p-6 print:shadow-none">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Schedule Performance (Priority Activities)</h2>
          <div className="overflow-x-auto">
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
                {topPriorityActivities.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-text-muted">
                      No delayed or at-risk activities.
                    </td>
                  </tr>
                ) : (
                  topPriorityActivities.map(a => (
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
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
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
      </div>

      <div className="card p-6 print:shadow-none">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Schedule Updates (Audit Trail)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="grid">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Activity</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Update</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Previous</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">New Value</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Source</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentAudits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                    No schedule updates yet.
                  </td>
                </tr>
              ) : (
                recentAudits.map(audit => (
                  <tr key={audit.id} className="hover:bg-hover/50">
                    <td className="px-4 py-3 text-text-secondary font-mono">{formatDateTime(audit.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">{audit.activityCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        audit.updateType === "ACTUAL_START"
                          ? "bg-active-bg text-primary"
                          : "bg-status-ontrack-bg text-status-ontrack"
                      }`}>
                        {audit.updateType === "ACTUAL_START" ? "Actual Start" : "Actual End"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono">
                      {audit.updateType === "ACTUAL_START"
                        ? formatDateOptional(audit.previousActualStart)
                        : formatDateOptional(audit.previousActualEnd)}
                    </td>
                    <td className="px-4 py-3 text-text-primary font-mono">
                      {audit.updateType === "ACTUAL_START"
                        ? formatDateOptional(audit.newActualStart)
                        : formatDateOptional(audit.newActualEnd)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{audit.sourceType}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        audit.confidence >= 80 ? "bg-status-ontrack-bg text-status-ontrack" :
                        audit.confidence >= 50 ? "bg-status-atrisk-bg text-status-atrisk" :
                        "bg-status-delayed-bg text-status-delayed"
                      }`}>
                        {audit.confidence}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="print:hidden" style={{ pageBreakAfter: 'always' }}>
        <button
          onClick={handlePrint}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light transition-colors focus-ring"
        >
          Print Report
        </button>
      </div>
    </div>
  );
}