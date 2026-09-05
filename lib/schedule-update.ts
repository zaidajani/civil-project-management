import { Task } from "@/types/task";
import { ProgressEvent } from "@/types/ingestion";
import { ScheduleUpdateAudit } from "@/types/ingestion";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function parseEventTime(eventTime: string | undefined, reportDate: string): string {
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

function extractReportDate(rawText: string): string {
  const dateMatch = rawText.match(/(\d{1,2}\s+\w+\s+\d{4})/);
  if (dateMatch) {
    const parts = dateMatch[1].split(" ");
    const day = parts[0].padStart(2, "0");
    const monthMap: Record<string, string> = {
      "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
      "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
      "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12",
      "January": "01", "February": "02", "March": "03", "April": "04",
      "June": "06", "July": "07", "August": "08", "September": "09",
      "October": "10", "November": "11", "December": "12"
    };
    const month = monthMap[parts[1]] || "01";
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return "2026-09-04";
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

export function applyProgressEvent(task: Task, event: ProgressEvent, reportDate?: string): Task {
  const parsedReportDate = reportDate || extractReportDate(event.rawText);
  const eventDate = parseEventTime(event.eventTime, parsedReportDate);
  
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
  updatedBy: string = "Project Manager",
  reportDate?: string
): { updatedTask: Task; audit: ScheduleUpdateAudit } {
  const previousActualStart = task.actualStart;
  const previousActualEnd = task.actualEnd;
  
  const updatedTask = applyProgressEvent(task, event, reportDate);
  
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
    sourceType: event.sourceType,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  
  return { updatedTask, audit };
}