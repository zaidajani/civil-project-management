"use client";

import { useState, useMemo, useEffect } from "react";
import { ProgressEvent, ActivityMatch, ReviewItem, ScheduleUpdateAudit } from "@/types/ingestion";
import { Task } from "@/types/task";
import { tasks } from "@/data/tasks";
import { updateTaskFromEvent } from "@/lib/schedule-update";
import { AuditTrail } from "@/components/review/AuditTrail";

const l5l6Tasks = tasks.filter((t) => t.level === 5 || t.level === 6);

function getReviewItems(
  events: ProgressEvent[],
  matches: ActivityMatch[]
): ReviewItem[] {
  return matches
    .filter((m) => m.matchStatus === "REVIEW" || m.confidence < 80)
    .map((m) => ({
      eventId: m.eventId,
      suggestedMatch: m,
      selectedActivityId: null,
      selectedActivityCode: null,
      selectedActivityName: null,
      reviewStatus: "PENDING" as const,
    }));
}

function getConfidenceClass(confidence: number): string {
  if (confidence >= 80) return "bg-status-ontrack-bg text-status-ontrack";
  if (confidence >= 50) return "bg-status-atrisk-bg text-status-atrisk";
  return "bg-status-delayed-bg text-status-delayed";
}

function getStatusClass(status: ReviewItem["reviewStatus"]): string {
  if (status === "REVIEWED") return "bg-status-ontrack-bg text-status-ontrack";
  if (status === "REJECTED") return "bg-status-delayed-bg text-status-delayed";
  return "bg-status-atrisk-bg text-status-atrisk";
}

export default function ReviewPage() {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [matches, setMatches] = useState<ActivityMatch[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState<string>("All");
  const [auditTrail, setAuditTrail] = useState<ScheduleUpdateAudit[]>([]);

  const loadFromIngestion = () => {
    if (typeof window !== "undefined") {
      const storedEvents = localStorage.getItem("ingestion_events");
      const storedMatches = localStorage.getItem("ingestion_matches");
      const storedReviewItems = localStorage.getItem("review_items");
      const storedAudits = localStorage.getItem("schedule_audits");
      if (storedEvents && storedMatches) {
        const parsedEvents = JSON.parse(storedEvents) as ProgressEvent[];
        const parsedMatches = JSON.parse(storedMatches) as ActivityMatch[];
        setEvents(parsedEvents);
        setMatches(parsedMatches);
        if (storedReviewItems) {
          setReviewItems(JSON.parse(storedReviewItems) as ReviewItem[]);
        } else {
          const items = getReviewItems(parsedEvents, parsedMatches);
          setReviewItems(items);
        }
        if (storedAudits) {
          setAuditTrail(JSON.parse(storedAudits) as ScheduleUpdateAudit[]);
        }
      }
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("review_items", JSON.stringify(reviewItems));
    }
  }, [reviewItems]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("schedule_audits", JSON.stringify(auditTrail));
    }
  }, [auditTrail]);

  const filteredTasks = useMemo(() => {
    return l5l6Tasks.filter((task) => {
      const matchesSearch =
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.activityCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDiscipline =
        filterDiscipline === "All" || task.discipline === filterDiscipline;
      return matchesSearch && matchesDiscipline;
    });
  }, [searchQuery, filterDiscipline]);

  const disciplines = useMemo(
    () => ["All", ...new Set(l5l6Tasks.map((t) => t.discipline))],
    []
  );

  const selectedItem = reviewItems.find((item) => item.eventId === selectedItemId);
  const selectedEvent = selectedItem ? events.find((e) => e.id === selectedItem.eventId) : null;

  const handleSelectActivity = (task: Task) => {
    if (!selectedItemId) return;
    setReviewItems((prev) =>
      prev.map((item) =>
        item.eventId === selectedItemId
          ? {
              ...item,
              selectedActivityId: task.id,
              selectedActivityCode: task.activityCode,
              selectedActivityName: task.name,
            }
          : item
      )
    );
  };

  const handleApprove = () => {
    if (!selectedItemId || !selectedItem?.selectedActivityId) return;
    
    const event = events.find((e) => e.id === selectedItemId);
    if (!event) return;

    const selectedTask = l5l6Tasks.find((t) => t.id === selectedItem.selectedActivityId);
    if (!selectedTask) return;

    const confidence = selectedItem.suggestedMatch.confidence;
    
    const { updatedTask, audit } = updateTaskFromEvent(selectedTask, event, confidence);
    
    if (typeof window !== "undefined") {
      const storedTasks = localStorage.getItem("schedule_tasks");
      let allTasks: Task[] = [];
      if (storedTasks) {
        allTasks = JSON.parse(storedTasks) as Task[];
      } else {
        allTasks = [...tasks];
      }
      
      const updatedTasks = allTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
      localStorage.setItem("schedule_tasks", JSON.stringify(updatedTasks));
    }

    setAuditTrail((prev) => [audit, ...prev]);

    const now = new Date().toISOString();
    setReviewItems((prev) =>
      prev.map((item) =>
        item.eventId === selectedItemId
          ? { ...item, reviewStatus: "REVIEWED" as const, reviewedAt: now }
          : item
      )
    );
    setSelectedItemId(null);
    setSearchQuery("");
  };

  const handleReject = () => {
    if (!selectedItemId) return;

    const now = new Date().toISOString();
    setReviewItems((prev) =>
      prev.map((item) =>
        item.eventId === selectedItemId
          ? { ...item, reviewStatus: "REJECTED" as const, reviewedAt: now }
          : item
      )
    );
    setSelectedItemId(null);
    setSearchQuery("");
  };

  const summary = useMemo(() => ({
    total: reviewItems.length,
    unmatched: reviewItems.filter((i) => !i.suggestedMatch.matchedActivityId).length,
    lowConfidence: reviewItems.filter((i) => i.suggestedMatch.confidence < 80 && i.suggestedMatch.matchedActivityId).length,
    reviewed: reviewItems.filter((i) => i.reviewStatus === "REVIEWED").length,
    rejected: reviewItems.filter((i) => i.reviewStatus === "REJECTED").length,
  }), [reviewItems]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold text-text-primary tracking-tight">Planner Review Queue</h1>
        <p className="mt-2 text-text-secondary text-base lg:text-lg">
          Review low-confidence activity matches before they are committed to the project schedule.
        </p>
      </div>

      {events.length === 0 && reviewItems.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-text-secondary mb-4">No review data available.</p>
          <p className="text-text-muted text-sm mb-6">Process a daily report on the Data Ingestion page to generate review items.</p>
          <button
            onClick={loadFromIngestion}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light transition-colors focus-ring"
          >
            Load from Data Ingestion
          </button>
        </div>
      )}

      {reviewItems.length > 0 && (
        <>
          <div className="card p-6 lg:p-8">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Summary</h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 bg-bg border border-border rounded-lg">
                <div className="text-2xl font-semibold text-text-primary">{summary.total}</div>
                <div className="text-sm text-text-secondary">Total Reviews</div>
              </div>
              <div className="p-4 bg-bg border border-border rounded-lg">
                <div className="text-2xl font-semibold text-status-delayed">{summary.unmatched}</div>
                <div className="text-sm text-text-secondary">Unmatched</div>
              </div>
              <div className="p-4 bg-bg border border-border rounded-lg">
                <div className="text-2xl font-semibold text-status-atrisk">{summary.lowConfidence}</div>
                <div className="text-sm text-text-secondary">Low Confidence</div>
              </div>
              <div className="p-4 bg-bg border border-border rounded-lg">
                <div className="text-2xl font-semibold text-status-ontrack">{summary.reviewed}</div>
                <div className="text-sm text-text-secondary">Reviewed</div>
              </div>
              <div className="p-4 bg-bg border border-border rounded-lg">
                <div className="text-2xl font-semibold text-status-delayed">{summary.rejected}</div>
                <div className="text-sm text-text-secondary">Rejected</div>
              </div>
            </div>
          </div>

          <div className="card p-6 lg:p-8">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Items Requiring Review ({reviewItems.filter((i) => i.reviewStatus === "PENDING").length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-2 font-medium text-text-secondary">Source Event</th>
                    <th className="text-left pb-2 font-medium text-text-secondary">Discipline</th>
                    <th className="text-left pb-2 font-medium text-text-secondary">Event</th>
                    <th className="text-left pb-2 font-medium text-text-secondary">Time</th>
                    <th className="text-left pb-2 font-medium text-text-secondary">Suggested Match</th>
                    <th className="text-left pb-2 font-medium text-text-secondary">Confidence</th>
                    <th className="text-left pb-2 font-medium text-text-secondary">Status</th>
                    <th className="text-left pb-2 font-medium text-text-secondary">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewItems
                    .filter((i) => i.reviewStatus === "PENDING")
                    .map((item) => {
                      const event = events.find((e) => e.id === item.eventId);
                      return (
                        <tr key={item.eventId} className="border-b border-border/50">
                          <td className="py-3 text-text-primary font-mono max-w-xs truncate">
                            {event?.activityDescription ?? "—"}
                          </td>
                          <td className="py-3 text-text-secondary">{event?.discipline ?? "—"}</td>
                          <td className="py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                event?.eventType === "START"
                                  ? "bg-active-bg text-primary"
                                  : "bg-status-ontrack-bg text-status-ontrack"
                              }`}
                            >
                              {event?.eventType ?? "—"}
                            </span>
                          </td>
                          <td className="py-3 text-text-secondary font-mono">{event?.eventTime ?? "—"}</td>
                          <td className="py-3 text-text-secondary">
                            {item.suggestedMatch.matchedActivityId ? (
                              <>
                                <div className="font-medium">{item.suggestedMatch.matchedActivityName}</div>
                                <div className="text-xs text-text-muted font-mono">{item.suggestedMatch.matchedActivityCode}</div>
                              </>
                            ) : (
                              <span className="text-text-muted">No confident match</span>
                            )}
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getConfidenceClass(item.suggestedMatch.confidence)}`}>
                              {item.suggestedMatch.confidence}%
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusClass(item.reviewStatus)}`}>
                              {item.reviewStatus === "REVIEWED" ? "Reviewed" : item.reviewStatus === "REJECTED" ? "Rejected" : "Needs Review"}
                            </span>
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => setSelectedItemId(item.eventId)}
                              className="px-3 py-1.5 text-xs font-medium text-primary bg-active-bg border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors focus-ring"
                            >
                              Review Match
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {reviewItems.some((i) => i.reviewStatus === "REVIEWED") && (
            <div className="card p-6 lg:p-8">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Reviewed Items</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 font-medium text-text-secondary">Source Event</th>
                      <th className="text-left pb-2 font-medium text-text-secondary">Original Match</th>
                      <th className="text-left pb-2 font-medium text-text-secondary">Selected Activity</th>
                      <th className="text-left pb-2 font-medium text-text-secondary">Original Confidence</th>
                      <th className="text-left pb-2 font-medium text-text-secondary">Reviewed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewItems
                      .filter((i) => i.reviewStatus === "REVIEWED")
                      .map((item) => {
                        const event = events.find((e) => e.id === item.eventId);
                        return (
                          <tr key={item.eventId} className="border-b border-border/50">
                            <td className="py-3 text-text-primary font-mono max-w-xs truncate">
                              {event?.activityDescription ?? "—"}
                            </td>
                            <td className="py-3 text-text-secondary">
                              {item.suggestedMatch.matchedActivityId ? (
                                <>
                                  <div className="font-medium">{item.suggestedMatch.matchedActivityName}</div>
                                  <div className="text-xs text-text-muted font-mono">{item.suggestedMatch.matchedActivityCode}</div>
                                </>
                              ) : (
                                <span className="text-text-muted">No confident match</span>
                              )}
                            </td>
                            <td className="py-3">
                              {item.selectedActivityId ? (
                                <>
                                  <div className="font-medium text-text-primary">{item.selectedActivityName}</div>
                                  <div className="text-xs text-text-muted font-mono">{item.selectedActivityCode}</div>
                                </>
                              ) : (
                                <span className="text-text-muted">—</span>
                              )}
                            </td>
                            <td className="py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getConfidenceClass(item.suggestedMatch.confidence)}`}>
                                {item.suggestedMatch.confidence}%
                              </span>
                            </td>
                            <td className="py-3 text-text-secondary font-mono">
                              {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : "—"}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reviewItems.some((i) => i.reviewStatus === "REJECTED") && (
            <div className="card p-6 lg:p-8">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Rejected Items</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 font-medium text-text-secondary">Source Event</th>
                      <th className="text-left pb-2 font-medium text-text-secondary">Original Match</th>
                      <th className="text-left pb-2 font-medium text-text-secondary">Original Confidence</th>
                      <th className="text-left pb-2 font-medium text-text-secondary">Rejected At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewItems
                      .filter((i) => i.reviewStatus === "REJECTED")
                      .map((item) => {
                        const event = events.find((e) => e.id === item.eventId);
                        return (
                          <tr key={item.eventId} className="border-b border-border/50">
                            <td className="py-3 text-text-primary font-mono max-w-xs truncate">
                              {event?.activityDescription ?? "—"}
                            </td>
                            <td className="py-3 text-text-secondary">
                              {item.suggestedMatch.matchedActivityId ? (
                                <>
                                  <div className="font-medium">{item.suggestedMatch.matchedActivityName}</div>
                                  <div className="text-xs text-text-muted font-mono">{item.suggestedMatch.matchedActivityCode}</div>
                                </>
                              ) : (
                                <span className="text-text-muted">No confident match</span>
                              )}
                            </td>
                            <td className="py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getConfidenceClass(item.suggestedMatch.confidence)}`}>
                                {item.suggestedMatch.confidence}%
                              </span>
                            </td>
                            <td className="py-3 text-text-secondary font-mono">
                              {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : "—"}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {auditTrail.length > 0 && (
        <div className="card p-6 lg:p-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Schedule Update Audit Trail</h2>
          <AuditTrail audits={auditTrail} />
        </div>
      )}

      {selectedItem && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-surface-elevated rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Review Match</h2>
              <button
                onClick={() => setSelectedItemId(null)}
                className="p-1 text-text-secondary hover:text-text-primary"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-bg border border-border rounded-lg p-4">
                <h3 className="font-medium text-text-primary mb-3">Source Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-text-secondary">Original Text:</span>
                    <p className="font-mono text-text-primary mt-1">{selectedEvent.rawText}</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Discipline:</span>
                    <p className="text-text-primary mt-1">{selectedEvent.discipline}</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Event Type:</span>
                    <p className="text-text-primary mt-1">{selectedEvent.eventType}</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Time:</span>
                    <p className="text-text-primary mt-1">{selectedEvent.eventTime ?? "Not specified"}</p>
                  </div>
                </div>
              </div>

              <div className="bg-bg border border-border rounded-lg p-4">
                <h3 className="font-medium text-text-primary mb-3">Suggested Match</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-text-secondary">Activity:</span>
                    <p className="text-text-primary mt-1">
                      {selectedItem.suggestedMatch.matchedActivityId
                        ? selectedItem.suggestedMatch.matchedActivityName
                        : "No confident match"}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Code:</span>
                    <p className="text-text-primary font-mono mt-1">
                      {selectedItem.suggestedMatch.matchedActivityCode ?? "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Confidence:</span>
                    <p className="mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getConfidenceClass(selectedItem.suggestedMatch.confidence)}`}>
                        {selectedItem.suggestedMatch.confidence}%
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Match Status:</span>
                    <p className="text-text-primary mt-1">{selectedItem.suggestedMatch.matchStatus}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-text-primary mb-3">Select Correct Activity</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or code..."
                        className="w-full p-3 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      />
                    </div>
                    <select
                      value={filterDiscipline}
                      onChange={(e) => setFilterDiscipline(e.target.value)}
                      className="w-48 p-3 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    >
                      {disciplines.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
                    {filteredTasks.length === 0 ? (
                      <div className="p-4 text-center text-text-muted">No activities match your search</div>
                    ) : (
                      filteredTasks.map((task) => {
                        const isSelected = selectedItem.selectedActivityId === task.id;
                        return (
                          <button
                            key={task.id}
                            onClick={() => handleSelectActivity(task)}
                            className={`w-full px-4 py-3 text-left border-b last:border-0 transition-colors ${
                              isSelected
                                ? "bg-active-bg border-primary"
                                : "hover:bg-hover"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-text-primary">{task.name}</div>
                                <div className="text-xs text-text-muted font-mono">{task.activityCode}</div>
                              </div>
                              {isSelected && (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary" aria-hidden="true">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {selectedItem.selectedActivityId && (
                    <div className="p-4 bg-active-bg border border-primary rounded-lg">
                      <div className="font-medium text-text-primary mb-1">Selected Activity:</div>
                      <div className="text-text-primary">{selectedItem.selectedActivityName}</div>
                      <div className="text-xs text-text-muted font-mono">{selectedItem.selectedActivityCode}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  onClick={() => setSelectedItemId(null)}
                  className="px-4 py-2 text-sm font-medium text-text-primary bg-hover border border-border rounded-lg hover:bg-border transition-colors focus-ring"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 text-sm font-medium text-status-delayed bg-status-delayed-bg border border-status-delayed/30 rounded-lg hover:bg-status-delayed-bg/20 transition-colors focus-ring"
                >
                  Reject / Skip
                </button>
                <button
                  onClick={handleApprove}
                  disabled={!selectedItem.selectedActivityId}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Approve Match
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}