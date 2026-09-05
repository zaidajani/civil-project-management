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

  const totalL5L6 = projectVariance.onTrack + projectVariance.atRisk + projectVariance.delayed + projectVariance.completed;

  return (
    <div className="space-y-8">
      {/* 01 PROJECT HEADER */}
      <header className="border-b border-border pb-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-primary tracking-widest uppercase">01 Project Control Center</p>
            <h1 className="mt-2 text-3xl lg:text-4xl font-semibold text-text-primary tracking-tight">{getProjectName()}</h1>
            <p className="mt-1 text-text-secondary text-base lg:text-lg">CivilManager Project Control Center · SIH PS 26122</p>
          </div>
          <div className="flex items-center gap-4 lg:ml-auto">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Status</p>
              <p className="mt-1 inline-flex items-center gap-2 font-semibold text-primary">
                <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true"></span>
                IN PROGRESS
              </p>
            </div>
            <div className="hidden lg:block text-right border-l border-border pl-6">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Baseline Period</p>
              <p className="mt-1 font-medium text-text-primary">Jan 2026 — Dec 2027</p>
            </div>
          </div>
        </div>
      </header>

      {/* 02 EXECUTION SNAPSHOT — Plan vs Actual */}
      <section className="panel" aria-labelledby="execution-snapshot">
        <div className="panel-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 id="execution-snapshot" className="flex items-center gap-3">
            <span className="text-xs font-semibold text-primary tracking-widest uppercase">02</span>
            <span>Execution Snapshot</span>
          </h2>
          <div className="text-sm text-text-secondary">
            Plan vs Actual progress across all L5/L6 activities
          </div>
        </div>
        <div className="panel-body">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-label">PLANNED PROGRESS</p>
                    <p className="text-2xl font-semibold text-text-primary">{projectVariance.plannedProgress}%</p>
                  </div>
                  <div className="h-3 bg-border rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${projectVariance.plannedProgress}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-label">ACTUAL PROGRESS</p>
                    <p className="text-2xl font-semibold text-text-primary">{projectVariance.actualProgress}%</p>
                  </div>
                  <div className="h-3 bg-border rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-secondary rounded-full transition-all duration-500"
                      style={{ width: `${projectVariance.actualProgress}%` }}
                    ></div>
                    {projectVariance.variance < 0 && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-6 bg-terracotta" aria-hidden="true"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-1 flex items-center justify-center lg:justify-start lg:border-l border-border lg:pl-8">
              <div className="text-center lg:text-left">
                <p className="text-label mb-1">VARIANCE</p>
                <p className={`text-5xl lg:text-6xl font-semibold ${getVarianceColor(projectVariance.variance)}`}>
                  {getVarianceLabel(projectVariance.variance)}
                </p>
                <p className="mt-2 text-sm text-text-secondary max-w-xs">
                  {projectVariance.variance < 0 
                    ? `Actual is ${Math.abs(projectVariance.variance)}pp behind plan`
                    : projectVariance.variance > 0
                    ? `Actual is ${projectVariance.variance}pp ahead of plan`
                    : "Execution on plan"}
                </p>
                <p className="mt-3 text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Match Rate: <span className="font-medium text-text-primary">{matchRate}%</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 03 L5/L6 EXECUTION CONTROL */}
      <section className="panel" aria-labelledby="execution-control">
        <div className="panel-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 id="execution-control" className="flex items-center gap-3">
            <span className="text-xs font-semibold text-primary tracking-widest uppercase">03</span>
            <span>L5/L6 Execution Control</span>
          </h2>
          <div className="text-sm text-text-secondary">
            {totalL5L6} executable activities across all work packages
          </div>
        </div>
        <div className="panel-body">
          <div className="flex flex-wrap items-center gap-4 lg:gap-8">
            <div className="flex-1 min-w-[180px]">
              <p className="text-4xl lg:text-5xl font-semibold text-text-primary">{totalL5L6}</p>
              <p className="text-label">Total L5/L6 Activities</p>
            </div>
            <div className="flex items-center gap-6 lg:gap-8 border-l border-border pl-6 lg:pl-8">
              <div className="flex flex-col items-center gap-1">
                <p className="text-2xl font-semibold text-status-ontrack">{projectVariance.completed}</p>
                <p className="text-label text-status-ontrack">Completed</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-2xl font-semibold text-status-ontrack">{projectVariance.onTrack}</p>
                <p className="text-label text-status-ontrack">On Track</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-2xl font-semibold text-status-atrisk">{projectVariance.atRisk}</p>
                <p className="text-label text-status-atrisk">At Risk</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-2xl font-semibold text-status-delayed">{projectVariance.delayed}</p>
                <p className="text-label text-status-delayed">Delayed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 04 TODAY'S EXECUTION — Data Pipeline */}
      <section className="panel" aria-labelledby="todays-execution">
        <div className="panel-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 id="todays-execution" className="flex items-center gap-3">
            <span className="text-xs font-semibold text-primary tracking-widest uppercase">04</span>
            <span>Today's Execution Pipeline</span>
          </h2>
          <div className="text-sm text-text-secondary">
            Field data → structured events → matched activities → planner review
          </div>
        </div>
        <div className="panel-body">
          <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-0 overflow-x-auto pb-2">
            <div className="flex-1 min-w-[180px] lg:min-w-0 flex flex-col items-center lg:items-start p-4 lg:p-6 bg-surface-elevated border border-border rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true"></span>
                <p className="text-label">INPUT</p>
              </div>
              <p className="text-3xl font-semibold text-text-primary">{dailyReports.length + spreadsheets.length}</p>
              <p className="text-sm text-text-secondary mt-1">
                {dailyReports.length} Daily Report{dailyReports.length !== 1 ? "s" : ""}
                {spreadsheets.length > 0 && (
                  <> · {spreadsheets.length} Spreadsheet{spreadsheets.length !== 1 ? "s" : ""}</>
                )}
              </p>
            </div>
            <div className="flex items-center lg:px-4 text-text-muted" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 5v14M19 12H5" />
              </svg>
            </div>
            <div className="flex-1 min-w-[180px] lg:min-w-0 flex flex-col items-center lg:items-start p-4 lg:p-6 bg-surface-elevated border border-border rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-secondary" aria-hidden="true"></span>
                <p className="text-label">EXTRACTED</p>
              </div>
              <p className="text-3xl font-semibold text-text-primary">{totalEventsExtracted}</p>
              <p className="text-sm text-text-secondary mt-1">Progress events from reports</p>
            </div>
            <div className="flex items-center lg:px-4 text-text-muted" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 5v14M19 12H5" />
              </svg>
            </div>
            <div className="flex-1 min-w-[180px] lg:min-w-0 flex flex-col items-center lg:items-start p-4 lg:p-6 bg-surface-elevated border border-border rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true"></span>
                <p className="text-label">MATCHED</p>
              </div>
              <p className="text-3xl font-semibold text-status-ontrack">{totalEventsMatched}</p>
              <p className="text-sm text-text-secondary mt-1">
                Linked to L5/L6 activities
              </p>
            </div>
            <div className="flex items-center lg:px-4 text-text-muted" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 5v14M19 12H5" />
              </svg>
            </div>
            <div className="flex-1 min-w-[180px] lg:min-w-0 flex flex-col items-center lg:items-start p-4 lg:p-6 bg-surface-elevated border border-border rounded-md border-l-4 border-terracotta">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-terracotta" aria-hidden="true"></span>
                <p className="text-label">REVIEW</p>
              </div>
              <p className="text-3xl font-semibold text-status-atrisk">{totalEventsNeedingReview}</p>
              <p className="text-sm text-text-secondary mt-1">
                {pendingReviewCount > 0 
                  ? `${pendingReviewCount} pending planner review`
                  : "No items awaiting review"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 05 ATTENTION REQUIRED */}
      <section className="panel" aria-labelledby="attention-required">
        <div className="panel-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 id="attention-required" className="flex items-center gap-3">
            <span className="text-xs font-semibold text-primary tracking-widest uppercase">05</span>
            <span>Attention Required</span>
          </h2>
          <div className="text-sm text-text-secondary">
            Items needing Project Manager action
          </div>
        </div>
        <div className="panel-body">
          {(criticalRisks.length > 0 || delayedL5L6.length > 0 || atRiskL5L6.length > 0 || pendingReviewCount > 0) ? (
            <div className="space-y-3">
              {criticalRisks.slice(0, 2).map(risk => (
                <div key={risk.id} className="p-4 bg-status-delayed-bg/30 border border-status-delayed/30 rounded-md">
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[risk.severity]} flex-shrink-0`}>
                      RISK
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary">{risk.title}</p>
                      <p className="text-sm text-text-secondary mt-1">{risk.description}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${RISK_STATUS_COLORS[risk.status]} flex-shrink-0`}>
                      {risk.status}
                    </span>
                  </div>
                </div>
              ))}
              {delayedL5L6.slice(0, 3).map(activity => (
                <div key={activity.taskId} className="p-4 border border-border rounded-md">
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getHealthStatusColor(activity.healthStatus)} flex-shrink-0`}>
                      ACTIVITY
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary">{activity.activityCode} — {activity.name}</p>
                      <p className="text-sm text-text-secondary mt-1">
                        Variance: <span className={getVarianceColor(activity.variance)} font-mono>{getVarianceLabel(activity.variance)}</span>
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getHealthStatusColor(activity.healthStatus)} flex-shrink-0`}>
                      {activity.healthStatus.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
              {atRiskL5L6.slice(0, 2).map(activity => (
                <div key={activity.taskId} className="p-4 border border-border rounded-md">
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getHealthStatusColor(activity.healthStatus)} flex-shrink-0`}>
                      ACTIVITY
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary">{activity.activityCode} — {activity.name}</p>
                      <p className="text-sm text-text-secondary mt-1">
                        Variance: <span className={getVarianceColor(activity.variance)} font-mono>{getVarianceLabel(activity.variance)}</span>
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getHealthStatusColor(activity.healthStatus)} flex-shrink-0`}>
                      {activity.healthStatus.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
              {pendingReviewCount > 0 && (
                <div className="p-4 border border-border rounded-md bg-accent/5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/20 text-accent">
                        REVIEW
                      </span>
                      <div>
                        <p className="font-medium text-text-primary">{pendingReviewCount} planner review{pendingReviewCount !== 1 ? "s" : ""} pending</p>
                        <p className="text-sm text-text-secondary">Low-confidence matches awaiting planner validation</p>
                      </div>
                    </div>
                    <Link href="/pm/review" className="px-3 py-1.5 text-xs font-medium text-primary bg-active-bg border border-primary/20 rounded-md hover:bg-primary/10 transition-colors focus-ring flex-shrink-0">
                      Review Now
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto text-text-muted mb-3" aria-hidden="true">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-text-muted">No items requiring immediate attention.</p>
            </div>
          )}
        </div>
      </section>

      {/* 06 RECENT EXECUTION ACTIVITY */}
      <section className="panel" aria-labelledby="recent-activity">
        <div className="panel-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 id="recent-activity" className="flex items-center gap-3">
            <span className="text-xs font-semibold text-primary tracking-widest uppercase">06</span>
            <span>Recent Execution Activity</span>
          </h2>
          <Link href="/pm/progress" className="text-sm font-medium text-primary hover:text-primary-light transition-colors">
            View all →
          </Link>
        </div>
        <div className="panel-body">
          {recentAudits.length > 0 ? (
            <div className="space-y-2">
              {recentAudits.map(audit => (
                <div key={audit.id} className="flex items-center gap-4 p-3 border border-border rounded-md hover:bg-hover transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-active-bg flex items-center justify-center flex-shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      audit.confidence >= 80 ? "bg-status-ontrack-bg text-status-ontrack" :
                      audit.confidence >= 50 ? "bg-status-atrisk-bg text-status-atrisk" :
                      "bg-status-delayed-bg text-status-delayed"
                    }`}>
                      {audit.confidence}%
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">{audit.activityCode} — {audit.activityName}</p>
                    <p className="text-sm text-text-secondary">
                      {audit.updateType === "ACTUAL_START" ? "Actual Start" : "Actual End"} set to{" "}
                      <span className="font-mono">
                        {audit.updateType === "ACTUAL_START"
                          ? formatDateOptional(audit.newActualStart)
                          : formatDateOptional(audit.newActualEnd)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-text-secondary flex-shrink-0">
                    <span className="font-mono">{formatDateTime(audit.updatedAt)}</span>
                    <span className="text-text-muted">{audit.sourceType}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto text-text-muted mb-3" aria-hidden="true">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-text-muted">No recent schedule updates.</p>
              <p className="text-xs text-text-muted mt-1">Activity appears here when field data is approved in Review.</p>
            </div>
          )}
        </div>
      </section>

      {/* 07 QUICK ACTIONS */}
      <section className="panel" aria-labelledby="quick-actions">
        <div className="panel-header">
          <h2 id="quick-actions" className="flex items-center gap-3">
            <span className="text-xs font-semibold text-primary tracking-widest uppercase">07</span>
            <span>Quick Actions</span>
          </h2>
        </div>
        <div className="panel-body">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <Link href="/pm/schedule" className="p-4 border border-border rounded-md hover:bg-hover transition-colors group">
              <p className="font-medium text-text-primary group-hover:text-primary transition-colors">View Schedule</p>
              <p className="text-sm text-text-secondary mt-0.5">L5/L6 Activity Registry</p>
            </Link>
            <Link href="/pm/ingestion" className="p-4 border border-border rounded-md hover:bg-hover transition-colors group">
              <p className="font-medium text-text-primary group-hover:text-primary transition-colors">Process Data</p>
              <p className="text-sm text-text-secondary mt-0.5">Daily Reports & Spreadsheets</p>
            </Link>
            <Link href="/pm/review" className="p-4 border border-border rounded-md hover:bg-hover transition-colors group">
              <p className="font-medium text-text-primary group-hover:text-primary transition-colors">Review Matches</p>
              <p className="text-sm text-text-secondary mt-0.5">Planner Review Queue</p>
            </Link>
            <Link href="/pm/progress" className="p-4 border border-border rounded-md hover:bg-hover transition-colors group">
              <p className="font-medium text-text-primary group-hover:text-primary transition-colors">View Progress</p>
              <p className="text-sm text-text-secondary mt-0.5">Variance Analysis</p>
            </Link>
            <Link href="/pm/risks" className="p-4 border border-border rounded-md hover:bg-hover transition-colors group">
              <p className="font-medium text-text-primary group-hover:text-primary transition-colors">View Risks</p>
              <p className="text-sm text-text-secondary mt-0.5">Risks & Delays</p>
            </Link>
            <Link href="/pm/reports" className="p-4 border border-border rounded-md hover:bg-hover transition-colors group">
              <p className="font-medium text-text-primary group-hover:text-primary transition-colors">View Reports</p>
              <p className="text-sm text-text-secondary mt-0.5">Project Control Report</p>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border pt-4">
        <p className="text-xs text-text-muted text-center tracking-wide">
          BASELINE PLAN → FIELD DATA → STRUCTURED ACTUALS → L5/L6 LINKING → PLANNER VALIDATION → LIVE SCHEDULE → VARIANCE / RISK
        </p>
      </footer>
    </div>
  );
}