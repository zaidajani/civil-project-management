import { ProgressEvent, SpreadsheetRow } from "@/types/ingestion";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function parseDate(dateStr: string): string {
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (year.length === 4) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    if (day.length === 4) {
      return `${day}-${month.padStart(2, "0")}-${year.padStart(2, "0")}`;
    }
  }
  return dateStr;
}

function parseTime(timeStr: string | undefined): string | undefined {
  if (!timeStr) return undefined;
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!timeMatch) return undefined;
  
  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const period = timeMatch[3]?.toUpperCase();
  
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function normalizeEventType(eventStr: string): "START" | "END" {
  const lower = eventStr.toLowerCase().trim();
  if (lower === "start" || lower === "started" || lower === "begin" || lower === "beginning") {
    return "START";
  }
  if (lower === "end" || lower === "completed" || lower === "finished" || lower === "complete" || lower === "finish") {
    return "END";
  }
  return "START";
}

function normalizeDiscipline(disciplineStr: string): string {
  const lower = disciplineStr.toLowerCase().trim();
  if (lower === "civil" || lower === "civl") return "Civil";
  if (lower === "electrical" || lower === "elec") return "Electrical";
  if (lower === "finishing" || lower === "finish") return "Finishing";
  if (lower === "structural" || lower === "struc") return "Structural";
  if (lower === "mechanical" || lower === "mech") return "Mechanical";
  if (lower === "plumbing") return "Plumbing";
  return disciplineStr.charAt(0).toUpperCase() + disciplineStr.slice(1).toLowerCase();
}

export function parseSpreadsheetData(rows: SpreadsheetRow[]): ProgressEvent[] {
  const events: ProgressEvent[] = [];
  
  for (const row of rows) {
    if (!row.date || !row.discipline || !row.activity || !row.event) {
      continue;
    }
    
    const eventDate = parseDate(row.date);
    const eventTime = parseTime(row.time);
    const eventType = normalizeEventType(row.event);
    const discipline = normalizeDiscipline(row.discipline);
    
    let rawText = `${row.date} | ${row.discipline} | ${row.activity} | ${row.event}`;
    if (row.time) rawText += ` | ${row.time}`;
    if (row.quantity) rawText += ` | ${row.quantity} ${row.unit ?? ""}`;
    if (row.remarks) rawText += ` | ${row.remarks}`;
    
    const event: ProgressEvent = {
      id: generateId(),
      rawText,
      activityDescription: row.activity.trim(),
      discipline,
      eventType,
      eventTime,
      sourceType: "SPREADSHEET",
      status: "EXTRACTED",
    };
    
    events.push(event);
  }
  
  return events;
}

export function validateSpreadsheetHeaders(headers: string[]): { valid: boolean; missing: string[] } {
  const required = ["date", "discipline", "activity", "event"];
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  const missing = required.filter(r => !normalizedHeaders.includes(r));
  return { valid: missing.length === 0, missing };
}