import { Task } from "@/types/task";
import { ProgressEvent } from "@/types/ingestion";
import { ScheduleUpdateAudit } from "@/types/ingestion";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function parseEventTime(eventTime: string | undefined, reportDate: string = "2026-09-04"): string {
  if (!eventTime) return reportDate;
  
  const timeMatch = eventTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!timeMatch) return reportDate;
  
  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const period = timeMatch[3].toUpperCase();
  
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  
  const date = new Date(reportDate);
  date.setHours(hours, minutes, 0, 0);
  
  return date.toISOString().split("T")[0];
}

function determineStatus(task: Task, event: ProgressEvent): Task["status"] {
  if (event.eventType === "END") {
    return "Completed";
  }
  if (event.eventType === "START") {
    if (task.status === "Not Started") return "In Progress";
    if (task.status === "Delayed") return "In Progress";
    return task.status;
  }
  return task.status;
}

function determineProgress(task: Task, event: ProgressEvent): number {
  if (event.eventType === "END") {
    return 100;
  }
  if (event.eventType === "START" && task.actualProgress === 0) {
    return 10;
  }
  return task.actualProgress;
}

export function applyProgressEvent(task: Task, event: ProgressEvent): Task {
  const reportDate = "2026-09-04";
  const eventDate = parseEventTime(event.eventTime, reportDate);
  
  const updated: Task = { ...task };
  
  if (event.eventType === "START") {
    if (!updated.actualStart) {
      updated.actualStart = eventDate;
    }
  }
  
  if (event.eventType === "END") {
    updated.actualEnd = eventDate;
    if (!updated.actualStart) {
      updated.actualStart = eventDate;
    }
  }
  
  updated.status = determineStatus(updated, event);
  updated.actualProgress = determineProgress(updated, event);
  
  return updated;
}

export function updateTaskFromEvent(
  task: Task,
  event: ProgressEvent,
  confidence: number,
  updatedBy: string = "Project Manager"
): { updatedTask: Task; audit: ScheduleUpdateAudit } {
  const previousActualStart = task.actualStart;
  const previousActualEnd = task.actualEnd;
  
  const updatedTask = applyProgressEvent(task, event);
  
  const updateType = event.eventType === "START" ? "ACTUAL_START" : "ACTUAL_END";
  
  const audit: ScheduleUpdateAudit = {
    id: generateId(),
    eventId: event.id,
    activityId: task.id,
    activityCode: task.activityCode,
    activityName: task.name,
    previousActualStart,
    previousActualEnd,
    newActualStart: updatedTask.actualStart,
    newActualEnd: updatedTask.actualEnd,
    updateType,
    confidence,
    sourceType: "DAILY_REPORT",
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  
  return { updatedTask, audit };
}