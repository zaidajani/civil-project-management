import { ProgressEvent } from "@/types/ingestion";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function extractTime(text: string): string | undefined {
  const timeRegex = /(\d{1,2}:\d{2}\s*(?:AM|PM))/i;
  const match = text.match(timeRegex);
  return match ? match[1].toUpperCase() : undefined;
}

function extractActivityDescription(text: string): string {
  let desc = text.trim();
  desc = desc.replace(/^(Civil|Electrical|Finishing|Mechanical|Plumbing|Structural):\s*/i, "");
  desc = desc.replace(/^(Concrete|Pile|Cable|Wall|Plastering|Installation|Pouring)\s+/i, "");
  desc = desc.replace(/^(started|completed|finished)\s+(at\s+)?/i, "");
  desc = desc.replace(/^(at\s+)/i, "");
  desc = desc.replace(/^(\d{1,2}:\d{2}\s*(?:AM|PM)\s*)/i, "");
  desc = desc.replace(/\.$/, "");
  return desc.trim();
}

function inferDiscipline(text: string, currentDiscipline: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("concrete") || lower.includes("pile")) return "Civil";
  if (lower.includes("cable") || lower.includes("electrical")) return "Electrical";
  if (lower.includes("plastering") || lower.includes("finishing") || lower.includes("wall")) return "Finishing";
  return currentDiscipline;
}

function determineEventType(text: string): "START" | "END" {
  const lower = text.toLowerCase();
  if (lower.includes("started")) return "START";
  if (lower.includes("completed") || lower.includes("finished")) return "END";
  return "START";
}

export function extractProgressEvents(text: string): ProgressEvent[] {
  const events: ProgressEvent[] = [];
  let currentDiscipline = "General";

  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const disciplineMatch = trimmed.match(/^(Civil|Electrical|Finishing|Mechanical|Plumbing|Structural):/i);
    if (disciplineMatch) {
      currentDiscipline = disciplineMatch[1].charAt(0).toUpperCase() + disciplineMatch[1].slice(1).toLowerCase();
      continue;
    }

    const lower = trimmed.toLowerCase();
    if (lower.includes("started") || lower.includes("completed") || lower.includes("finished")) {
      const eventTime = extractTime(trimmed);
      const activityDescription = extractActivityDescription(trimmed);
      const discipline = inferDiscipline(trimmed, currentDiscipline);
      const eventType = determineEventType(trimmed);

      const event: ProgressEvent = {
        id: generateId(),
        rawText: trimmed,
        activityDescription,
        discipline,
        eventType,
        eventTime,
        sourceType: "DAILY_REPORT",
        status: "EXTRACTED",
      };

      events.push(event);
    }
  }

  return events;
}