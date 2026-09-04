"use client";

import { ProgressEvent } from "@/types/ingestion";

export interface SupervisorDailyReport {
  id: string;
  submittedAt: string;
  submittedBy: string;
  source: "SUPERVISOR";
  projectId: string;
  reportText: string;
  status: "PENDING" | "PROCESSED";
}

const STORAGE_KEY = "project_daily_reports";

function getStored(): SupervisorDailyReport[] {
  if (typeof window === "undefined") return [];
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (!value) return [];
  try {
    return JSON.parse(value) as SupervisorDailyReport[];
  } catch {
    return [];
  }
}

function save(reports: SupervisorDailyReport[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

export function getSupervisorReports(): SupervisorDailyReport[] {
  return getStored();
}

export function getPendingSupervisorReports(): SupervisorDailyReport[] {
  return getStored().filter((r) => r.status === "PENDING");
}

export function saveSupervisorReport(report: Omit<SupervisorDailyReport, "id" | "submittedAt" | "status">): SupervisorDailyReport {
  const reports = getStored();
  const newReport: SupervisorDailyReport = {
    ...report,
    id: `sup-report-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    status: "PENDING",
  };
  save([newReport, ...reports]);
  return newReport;
}

export function markSupervisorReportProcessed(id: string): void {
  const reports = getStored();
  const updated = reports.map((r) => (r.id === id ? { ...r, status: "PROCESSED" as const } : r));
  save(updated);
}

export function convertSupervisorReportToProgressEvents(report: SupervisorDailyReport): ProgressEvent[] {
  const { extractProgressEvents } = require("@/lib/extraction");
  return extractProgressEvents(report.reportText);
}