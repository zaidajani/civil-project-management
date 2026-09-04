export interface ProgressEvent {
  id: string;
  rawText: string;
  activityDescription: string;
  discipline: string;
  eventType: "START" | "END";
  eventTime?: string;
  sourceType: "DAILY_REPORT" | "SPREADSHEET";
  status: "EXTRACTED";
}

export interface SpreadsheetRow {
  date: string;
  discipline: string;
  activity: string;
  event: string;
  time?: string;
  quantity?: number;
  unit?: string;
  remarks?: string;
}

export interface ActivityMatch {
  eventId: string;
  matchedActivityId: string | null;
  matchedActivityCode: string | null;
  matchedActivityName: string;
  confidence: number;
  matchStatus: "EXACT" | "MATCHED" | "REVIEW";
}

export interface ReviewItem {
  eventId: string;
  suggestedMatch: ActivityMatch;
  selectedActivityId: string | null;
  selectedActivityCode: string | null;
  selectedActivityName: string | null;
  reviewStatus: "PENDING" | "REVIEWED";
  reviewedAt?: string;
}

export interface ScheduleUpdateAudit {
  id: string;
  eventId: string;
  activityId: string;
  activityCode: string;
  activityName: string;
  previousActualStart?: string;
  previousActualEnd?: string;
  newActualStart?: string;
  newActualEnd?: string;
  updateType: "ACTUAL_START" | "ACTUAL_END";
  confidence: number;
  sourceType: "DAILY_REPORT" | "SPREADSHEET";
  updatedAt: string;
  updatedBy: string;
}

export interface IngestionRecord {
  id: string;
  sourceType: "DAILY_REPORT" | "SPREADSHEET";
  sourceName: string;
  submittedAt: string;
  submittedBy: string;
  rawText: string;
  eventsExtracted: number;
  eventsMatched: number;
  eventsNeedingReview: number;
  status: "PROCESSED" | "PARTIAL" | "FAILED";
}