"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
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
  getAttentionItems,
  ActivityVariance,
  HealthStatus
} from "@/lib/progress";
import { IngestionRecord } from "@/types/ingestion";
import { ReviewItem } from "@/types/ingestion";
import { ScheduleUpdateAudit } from "@/types/ingestion";

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

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOptional(dateStr?: string) {
  return dateStr ? formatDate(dateStr) : "—";
}

function getLatestProgress(taskId: string): number {
  const updates = progressUpdates.filter(p => p.taskId === taskId);
  if (updates.length === 0) return 0;
  const latest = updates.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b);
  return latest.actualProgress;
}

function getProjectName(): string {
  const rootTask = tasks.find(t => t.level === 1);
  return rootTask?.name ?? "Mumbai Metro Station";
}

export default function PMPage() {
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
  const attentionItems = useMemo(() => getAttentionItems(tasksWithProgress, risks), [tasksWithProgress, risks]);

  const dailyReports = ingestionRecords.filter(r => r.sourceType === "DAILY_REPORT");
  const spreadsheets = ingestionRecords.filter(r => r.sourceType === "SPREADSHEET");
  const totalEventsExtracted = ingestionRecords.reduce((sum, r) => sum + r.eventsExtracted, 0);
  const totalEventsMatched = ingestionRecords.reduce((sum, r) => sum + r.eventsMatched, 0);
  const totalEventsNeedingReview = ingestionRecords.reduce((sum, r) => sum + r.eventsNeedingReview, 0);
  const matchRate = totalEventsExtracted > 0 ? Math.round((totalEventsMatched / totalEventsExtracted) * 100) : 0;

  const reviewedCount = reviewItems.filter(r => r.reviewStatus === "REVIEWED").length;
  const pendingReviewCount = reviewItems.filter(r => r.reviewStatus === "PENDING").length;

  const criticalRisks = risks.filter(r => r.severity === "Critical" && (r.status === "Open" || r.status === "Monitoring"));
  const delayedL5L6 = delayedActivities.filter(a => a.healthStatus === "DELAYED");
  const atRiskL5L6 = delayedActivities.filter(a => a.healthStatus === "AT_RISK");

  const recentAudits = useMemo(() => {
    return [...auditTrail].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);
  }, [auditTrail]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold text-text-primary tracking-tight">{getProjectName()}</h1>
        <p className="mt-2 text-text-secondary text-base lg:text-lg">CivilManager Project Manager Portal — SIH PS 26122</p>
      </div>

      <div className="card p-6 lg:p-8 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Plan → Actual</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-bg border border-border rounded-lg text-center">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">PLANNED</p>
            <p className="mt-2 text-4xl font-semibold text-text-primary">{projectVariance.plannedProgress}%</p>
          </div>
          <div className="p-4 bg-bg border border-border rounded-lg text-center">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">ACTUAL</p>
            <p className="mt-2 text-4xl font-semibold text-text-primary">{projectVariance.actualProgress}%</p>
          </div>
          <div className={`p-4 bg-bg border border-border rounded-lg text-center ${projectVariance.variance < 0 ? "border-l-4 border-status-delayed" : "border-l-4 border-status-ontrack"}`}>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">VARIANCE</p>
            <p className={`mt-2 text-4xl font-semibold ${getVarianceColor(projectVariance.variance)}`}>
              {getVarianceLabel(projectVariance.variance)}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {projectVariance.variance < 0 
                ? `Actual progress is ${Math.abs(projectVariance.variance)}pp behind plan`
                : projectVariance.variance > 0
                ? `Actual progress is ${projectVariance.variance}pp ahead of plan`
                : "On plan"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card p-5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Total L5/L6 Activities</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">
            {projectVariance.onTrack + projectVariance.atRisk + projectVariance.delayed + projectVariance.completed}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Completed</p>
          <p className="mt-1 text-2xl font-semibold text-status-ontrack">{projectVariance.completed}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">On Track</p>
          <p className="mt-1 text-2xl font-semibold text-status-ontrack">{projectVariance.onTrack}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">At Risk</p>
          <p className="mt-1 text-2xl font-semibold text-status-atrisk">{projectVariance.atRisk}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Delayed</p>
          <p className="mt-1 text-2xl font-semibold text-status-delayed">{projectVariance.delayed}</p>
        </div>
      </div>

      <div className="card p-6 lg:p-8 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Today's Data</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 bg-bg border border-border rounded-lg">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Daily Reports</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">{dailyReports.length}</p>
          </div>
          <div className="p-4 bg-bg border border-border rounded-lg">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Spreadsheets</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">{spreadsheets.length}</p>
          </div>
          <div className="p-4 bg-bg border border-border rounded-lg">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Events Extracted</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">{totalEventsExtracted}</p>
          </div>
          <div className="p-4 bg-bg border border-border rounded-lg">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Matched</p>
            <p className="mt-1 text-2xl font-semibold text-status-ontrack">{totalEventsMatched}</p>
          </div>
          <div className="p-4 bg-bg border border-border rounded-lg">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Needs Review</p>
            <p className="mt-1 text-2xl font-semibold text-status-atrisk">{totalEventsNeedingReview}</p>
          </div>
        </div>
        {totalEventsExtracted > 0 && (
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-text-secondary">
              Match Rate: <span className="font-medium text-text-primary">{matchRate}%</span>
            </p>
          </div>
        )}
      </div>

      <div className="card p-6 lg:p-8 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Attention Required</h2>
        {(criticalRisks.length > 0 || delayedL5L6.length > 0 || atRiskL5L6.length > 0 || pendingReviewCount > 0) ? (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {criticalRisks.slice(0, 2).map(risk => (
              <div key={risk.id} className="flex items-center gap-3 p-3 bg-bg border border-border rounded-lg">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[risk.severity]}`}>
                  RISK
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">{risk.title}</p>
                  <p className="text-sm text-text-secondary truncate">{risk.description}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${RISK_STATUS_COLORS[risk.status]}`}>
                  {risk.status}
                </span>
              </div>
            ))}
            {delayedL5L6.slice(0, 3).map(activity => (
              <div key={activity.taskId} className="flex items-center gap-3 p-3 bg-bg border border-border rounded-lg">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getHealthStatusColor(activity.healthStatus)}`}>
                  ACTIVITY
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">{activity.activityCode} — {activity.name}</p>
                  <p className="text-sm text-text-secondary">
                    Variance: <span className={getVarianceColor(activity.variance)} font-mono>{getVarianceLabel(activity.variance)}</span>
                  </p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getHealthStatusColor(activity.healthStatus)}`}>
                  {activity.healthStatus.replace("_", " ")}
                </span>
              </div>
            ))}
            {atRiskL5L6.slice(0, 2).map(activity => (
              <div key={activity.taskId} className="flex items-center gap-3 p-3 bg-bg border border-border rounded-lg">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getHealthStatusColor(activity.healthStatus)}`}>
                  ACTIVITY
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">{activity.activityCode} — {activity.name}</p>
                  <p className="text-sm text-text-secondary">
                    Variance: <span className={getVarianceColor(activity.variance)} font-mono>{getVarianceLabel(activity.variance)}</span>
                  </p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getHealthStatusColor(activity.healthStatus)}`}>
                  {activity.healthStatus.replace("_", " ")}
                </span>
              </div>
            ))}
            {pendingReviewCount > 0 && (
              <div className="flex items-center gap-3 p-3 bg-bg border border-border rounded-lg">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/20 text-accent">
                  REVIEW
                </span>
                <div className="flex-1">
                  <p className="font-medium text-text-primary">{pendingReviewCount} planner review{pendingReviewCount !== 1 ? "s" : ""} pending</p>
                  <p className="text-sm text-text-secondary">Low-confidence matches awaiting planner validation</p>
                </div>
                <Link href="/pm/review" className="px-3 py-1.5 text-xs font-medium text-primary bg-active-bg border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors focus-ring">
                  Review Now
                </Link>
              </div>
            )}
          </div>
        ) : (
          <p className="text-text-muted text-center py-8">No items requiring immediate attention.</p>
        )}
      </div>

      <div className="card p-6 lg:p-8 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Recent Activity</h2>
        {recentAudits.length > 0 ? (
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {recentAudits.map(audit => (
              <div key={audit.id} className="flex items-center gap-3 p-3 bg-bg border border-border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">{audit.activityCode} — {audit.activityName}</p>
                  <p className="text-sm text-text-secondary">
                    {audit.updateType === "ACTUAL_START" ? "Actual Start" : "Actual End"} set to
                    <span className="font-mono ml-1">
                      {audit.updateType === "ACTUAL_START"
                        ? formatDateOptional(audit.newActualStart)
                        : formatDateOptional(audit.newActualEnd)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    audit.confidence >= 80 ? "bg-status-ontrack-bg text-status-ontrack" :
                    audit.confidence >= 50 ? "bg-status-atrisk-bg text-status-atrisk" :
                    "bg-status-delayed-bg text-status-delayed"
                  }`}>
                    {audit.confidence}%
                  </span>
                  <span className="text-text-secondary font-mono">{formatDateTime(audit.updatedAt)}</span>
                  <span className="text-text-muted">{audit.sourceType}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-center py-8">No recent schedule updates.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/pm/schedule" className="card p-6 hover:shadow-lg transition-shadow">
          <h3 className="font-semibold text-text-primary mb-1">View Schedule</h3>
          <p className="text-sm text-text-secondary">L5/L6 Activity Registry</p>
        </Link>
        <Link href="/pm/ingestion" className="card p-6 hover:shadow-lg transition-shadow">
          <h3 className="font-semibold text-text-primary mb-1">Process Data</h3>
          <p className="text-sm text-text-secondary">Daily Reports & Spreadsheets</p>
        </Link>
        <Link href="/pm/review" className="card p-6 hover:shadow-lg transition-shadow">
          <h3 className="font-semibold text-text-primary mb-1">Review Matches</h3>
          <p className="text-sm text-text-secondary">Planner Review Queue</p>
        </Link>
        <Link href="/pm/progress" className="card p-6 hover:shadow-lg transition-shadow">
          <h3 className="font-semibold text-text-primary mb-1">View Progress</h3>
          <p className="text-sm text-text-secondary">Variance Analysis</p>
        </Link>
        <Link href="/pm/risks" className="card p-6 hover:shadow-lg transition-shadow">
          <h3 className="font-semibold text-text-primary mb-1">View Risks</h3>
          <p className="text-sm text-text-secondary">Risks & Delays</p>
        </Link>
        <Link href="/pm/reports" className="card p-6 hover:shadow-lg transition-shadow">
          <h3 className="font-semibold text-text-primary mb-1">View Reports</h3>
          <p className="text-sm text-text-secondary">Project Control Report</p>
        </Link>
      </div>

      <div className="pt-6 border-t border-border">
        <p className="text-xs text-text-muted text-center">
          BASELINE PLAN → FIELD DATA → STRUCTURED ACTUALS → L5/L6 LINKING → PLANNER VALIDATION → LIVE SCHEDULE → VARIANCE / RISK
        </p>
      </div>
    </div>
  );
}