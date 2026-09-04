"use client";

import { IngestionRecord } from "@/types/ingestion";

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClass(status: IngestionRecord["status"]): string {
  if (status === "PROCESSED") return "bg-status-ontrack-bg text-status-ontrack";
  if (status === "PARTIAL") return "bg-status-atrisk-bg text-status-atrisk";
  return "bg-status-delayed-bg text-status-delayed";
}

interface IngestionHistoryProps {
  records: IngestionRecord[];
  onViewRecord: (record: IngestionRecord) => void;
}

export function IngestionHistory({ records, onViewRecord }: IngestionHistoryProps) {
  if (records.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-text-muted">No reports processed yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="p-5 border-b border-border">
        <h3 className="text-lg font-semibold text-text-primary">Ingestion History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                Source
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                Submitted At
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                Events
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                Matched
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                Needs Review
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-secondary uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {records.map((record) => (
              <tr
                key={record.id}
                onClick={() => onViewRecord(record)}
                className="cursor-pointer hover:bg-hover transition-colors"
              >
                <td className="px-4 py-3 font-medium text-text-primary">{record.sourceName}</td>
                <td className="px-4 py-3 text-text-secondary font-mono">{formatDateTime(record.submittedAt)}</td>
                <td className="px-4 py-3 text-text-primary">{record.eventsExtracted}</td>
                <td className="px-4 py-3 text-text-secondary">{record.eventsMatched}</td>
                <td className="px-4 py-3 text-text-secondary">{record.eventsNeedingReview}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusClass(record.status)}`}>
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}