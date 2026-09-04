"use client";

import { ProgressEvent } from "@/types/ingestion";
import { ScheduleUpdateAudit } from "@/types/ingestion";
import { Task } from "@/types/task";

interface TimelineEvent {
  id: string;
  date: string;
  type: "PLANNED_START" | "PLANNED_END" | "FIELD_START" | "FIELD_END" | "SCHEDULE_START_UPDATE" | "SCHEDULE_END_UPDATE";
  label: string;
  description: string;
  source?: string;
  confidence?: number;
  reviewStatus?: string;
  previousValue?: string;
  newValue?: string;
  updatedBy?: string;
}

function formatDateShort(isoString: string | undefined): string {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getConfidenceClass(confidence: number): string {
  if (confidence >= 80) return "bg-status-ontrack-bg text-status-ontrack";
  if (confidence >= 50) return "bg-status-atrisk-bg text-status-atrisk";
  return "bg-status-delayed-bg text-status-delayed";
}

function buildTimeline(
  activity: Task,
  progressEvents: ProgressEvent[],
  audits: ScheduleUpdateAudit[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Planned dates
  events.push({
    id: `planned-start-${activity.id}`,
    date: activity.plannedStart,
    type: "PLANNED_START",
    label: "Planned Start",
    description: "Baseline schedule start date",
  });

  events.push({
    id: `planned-end-${activity.id}`,
    date: activity.plannedEnd,
    type: "PLANNED_END",
    label: "Planned End",
    description: "Baseline schedule end date",
  });

  // Field events (ProgressEvents matched to this activity)
  progressEvents.forEach(event => {
    if (event.eventTime) {
      const dateStr = `${activity.plannedStart.split("T")[0]}T${event.eventTime}`;
      // We need to parse the event time properly - it's just HH:MM AM/PM
      // For sorting, we'll use the event's date context from the activity
      events.push({
        id: `field-${event.id}`,
        date: event.eventTime,
        type: event.eventType === "START" ? "FIELD_START" : "FIELD_END",
        label: `Field ${event.eventType}`,
        description: event.activityDescription,
        source: event.sourceType,
        confidence: undefined,
        reviewStatus: undefined,
      });
    }
  });

  // Schedule updates from audit trail
  audits
    .filter(audit => audit.activityId === activity.id)
    .forEach(audit => {
      if (audit.updateType === "ACTUAL_START" && audit.newActualStart) {
        events.push({
          id: `schedule-${audit.id}`,
          date: audit.newActualStart,
          type: "SCHEDULE_START_UPDATE",
          label: "Actual Start Updated",
          description: `Schedule updated from field event`,
          previousValue: audit.previousActualStart,
          newValue: audit.newActualStart,
          updatedBy: audit.updatedBy,
          confidence: audit.confidence,
        });
      }
      if (audit.updateType === "ACTUAL_END" && audit.newActualEnd) {
        events.push({
          id: `schedule-${audit.id}`,
          date: audit.newActualEnd,
          type: "SCHEDULE_END_UPDATE",
          label: "Actual End Updated",
          description: `Schedule updated from field event`,
          previousValue: audit.previousActualEnd,
          newValue: audit.newActualEnd,
          updatedBy: audit.updatedBy,
          confidence: audit.confidence,
        });
      }
    });

  // Sort chronologically
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return events;
}

interface ActivityTimelineProps {
  activity: Task;
  progressEvents: ProgressEvent[];
  audits: ScheduleUpdateAudit[];
}

export function ActivityTimeline({ activity, progressEvents, audits }: ActivityTimelineProps) {
  const timelineEvents = buildTimeline(activity, progressEvents, audits);

  if (timelineEvents.length === 2) {
    // Only planned dates
    return (
      <div className="card p-4">
        <div className="space-y-3">
          {timelineEvents.map((event) => (
            <div key={event.id} className="flex items-start gap-3 p-3 bg-bg border border-border rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary">{event.label}</p>
                <p className="text-sm text-text-secondary">{event.description}</p>
                <p className="text-sm text-text-primary font-mono mt-0.5">{formatDateShort(event.date)}</p>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">PLANNED</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="p-4 border-b border-border">
        <h3 className="font-medium text-text-primary">Execution Timeline</h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Shows the relationship between baseline plan, field events, and schedule updates
        </p>
      </div>
      <div className="overflow-y-auto max-h-96">
        <div className="p-4 space-y-3">
          {timelineEvents.map((event, index) => {
            const isLast = index === timelineEvents.length - 1;
            let typeLabel = "";
            let typeClass = "";
            let Icon: React.ReactNode;

            switch (event.type) {
              case "PLANNED_START":
              case "PLANNED_END":
                typeLabel = "PLANNED";
                typeClass = "bg-primary/10 text-primary";
                Icon = (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                  </svg>
                );
                break;
              case "FIELD_START":
              case "FIELD_END":
                typeLabel = "FIELD EVENT";
                typeClass = "bg-accent/10 text-accent";
                Icon = (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                );
                break;
              case "SCHEDULE_START_UPDATE":
              case "SCHEDULE_END_UPDATE":
                typeLabel = "SCHEDULE UPDATE";
                typeClass = "bg-status-ontrack-bg text-status-ontrack";
                Icon = (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-status-ontrack">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                );
                break;
              default:
                typeLabel = "EVENT";
                typeClass = "bg-gray-100 text-gray-700";
                Icon = (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                );
            }

            return (
              <div key={event.id} className="relative flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center">
                    {Icon}
                  </div>
                  {!isLast && <div className="flex-1 h-full w-0.5 bg-border/50" />}
                </div>
                <div className="flex-1 min-w-0 p-3 bg-bg border border-border rounded-lg">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-medium text-text-primary">{event.label}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeClass}`}>
                      {typeLabel}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">{event.description}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <span className="text-text-primary font-mono">{formatDateShort(event.date)}</span>
                    {event.source && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-text-muted bg-border">
                        {event.source}
                      </span>
                    )}
                    {event.confidence !== undefined && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getConfidenceClass(event.confidence)}`}>
                        {event.confidence}%
                      </span>
                    )}
                    {event.reviewStatus && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-text-muted bg-border">
                        {event.reviewStatus}
                      </span>
                    )}
                    {event.previousValue !== undefined && event.newValue !== undefined && (
                      <>
                        <span className="text-text-muted">Previous:</span>
                        <span className="text-text-secondary font-mono">{formatDateShort(event.previousValue)}</span>
                        <span className="text-text-muted">→</span>
                        <span className="text-text-primary font-mono">{formatDateShort(event.newValue)}</span>
                      </>
                    )}
                    {event.updatedBy && (
                      <span className="text-text-muted">by {event.updatedBy}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}