"use client";

import { useState } from "react";
import { ScheduleUpdateAudit } from "@/types/ingestion";

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(isoString: string | undefined): string {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getConfidenceClass(confidence: number): string {
  if (confidence >= 80) return "bg-status-ontrack-bg text-status-ontrack";
  if (confidence >= 50) return "bg-status-atrisk-bg text-status-atrisk";
  return "bg-status-delayed-bg text-status-delayed";
}

interface AuditTrailProps {
  audits: ScheduleUpdateAudit[];
}

export function AuditTrail({ audits }: AuditTrailProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [updateTypeFilter, setUpdateTypeFilter] = useState<"all" | "ACTUAL_START" | "ACTUAL_END">("all");

  const filteredAudits = audits.filter((audit) => {
    const matchesSearch =
      searchQuery === "" ||
      audit.activityCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.activityName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      updateTypeFilter === "all" || audit.updateType === updateTypeFilter;
    return matchesSearch && matchesType;
  });

  if (filteredAudits.length === 0 && audits.length > 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-text-muted">No audit records match the current filters.</p>
      </div>
    );
  }

  if (audits.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-text-muted">No schedule updates yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="p-5 border-b border-border">
        <div className="flex flex-col sm:flex-row gap-3">
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
              placeholder="Search by activity code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <select
            value={updateTypeFilter}
            onChange={(e) => setUpdateTypeFilter(e.target.value as "all" | "ACTUAL_START" | "ACTUAL_END")}
            className="w-48 px-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Update Types</option>
            <option value="ACTUAL_START">Actual Start</option>
            <option value="ACTUAL_END">Actual End</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                Activity Code
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                Activity
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                Update
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                Previous Value
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                New Value
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                Source
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                Confidence
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                Updated By
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filteredAudits.map((audit) => (
              <tr key={audit.id} className="hover:bg-hover/50 transition-colors">
                <td className="px-4 py-3 text-text-secondary font-mono">{formatDateTime(audit.updatedAt)}</td>
                <td className="px-4 py-3 font-mono text-text-primary">{audit.activityCode}</td>
                <td className="px-4 py-3 text-text-primary">{audit.activityName}</td>
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
                    ? formatDateShort(audit.previousActualStart)
                    : formatDateShort(audit.previousActualEnd)}
                </td>
                <td className="px-4 py-3 text-text-primary font-mono">
                  {audit.updateType === "ACTUAL_START"
                    ? formatDateShort(audit.newActualStart)
                    : formatDateShort(audit.newActualEnd)}
                </td>
                <td className="px-4 py-3 text-text-secondary">{audit.sourceType}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getConfidenceClass(audit.confidence)}`}>
                    {audit.confidence}%
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{audit.updatedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}