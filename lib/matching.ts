import { ProgressEvent, ActivityMatch } from "@/types/ingestion";
import { Task } from "@/types/task";

const FILLER_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
  "from", "up", "down", "out", "off", "over", "under", "again", "further", "then", "once",
  "here", "there", "when", "where", "why", "how", "all", "each", "few", "more", "most",
  "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
  "very", "s", "t", "can", "will", "just", "don", "should", "now", "d", "ll", "m", "o",
  "re", "ve", "y", "ain", "aren", "couldn", "didn", "doesn", "hadn", "hasn", "haven",
  "isn", "ma", "mightn", "mustn", "needn", "shan", "shouldn", "wasn", "weren", "won",
  "wouldn", "started", "completed", "finished", "installation", "pouring", "fixing",
  "concrete", "cable", "tray", "wall", "plastering", "zone", "grid", "level"
]);

function normalizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !FILLER_WORDS.has(word));
}

function extractLocationIdentifiers(text: string): string[] {
  const identifiers: string[] = [];
  const gridMatches = text.match(/grid\s+[a-z0-9-]+/gi);
  if (gridMatches) identifiers.push(...gridMatches.map((m) => m.toLowerCase()));
  const zoneMatches = text.match(/zone\s+[a-z0-9-]+/gi);
  if (zoneMatches) identifiers.push(...zoneMatches.map((m) => m.toLowerCase()));
  const levelMatches = text.match(/level\s+\d+/gi);
  if (levelMatches) identifiers.push(...levelMatches.map((m) => m.toLowerCase()));
  return identifiers;
}

function getActivitySearchText(activity: Task, allTasks: Task[]): string[] {
  const parts: string[] = [];
  parts.push(activity.name);
  parts.push(activity.activityCode);
  parts.push(activity.description);
  parts.push(activity.discipline);

  let parent = activity;
  while (parent.parentId) {
    const found = allTasks.find((t) => t.id === parent.parentId);
    if (found) {
      parts.push(found.name);
      parts.push(found.activityCode);
      parent = found;
    } else {
      break;
    }
  }

  return parts.flatMap(normalizeText);
}

function calculateMatchScore(
  event: ProgressEvent,
  activity: Task,
  allTasks: Task[]
): number {
  const eventWords = new Set(normalizeText(event.activityDescription));
  const eventLocations = new Set(extractLocationIdentifiers(event.activityDescription));
  const eventDiscipline = event.discipline.toLowerCase();

  const activityWords = new Set(getActivitySearchText(activity, allTasks));
  const activityLocations = new Set(extractLocationIdentifiers(activity.name + " " + activity.description));
  const activityDiscipline = activity.discipline.toLowerCase();

  if (eventWords.size === 0) return 0;

  let score = 0;
  let maxPossible = 0;

  const intersection = [...eventWords].filter((w) => activityWords.has(w));
  const wordMatchRatio = intersection.length / eventWords.size;
  score += wordMatchRatio * 50;
  maxPossible += 50;

  if (eventDiscipline === activityDiscipline) {
    score += 20;
  }
  maxPossible += 20;

  const locationIntersection = [...eventLocations].filter((loc) => activityLocations.has(loc));
  if (eventLocations.size > 0) {
    const locationMatchRatio = locationIntersection.length / eventLocations.size;
    score += locationMatchRatio * 30;
  }
  maxPossible += 30;

  return maxPossible > 0 ? Math.round((score / maxPossible) * 100) : 0;
}

export function matchProgressEvent(
  event: ProgressEvent,
  activities: Task[]
): ActivityMatch {
  const l5l6Activities = activities.filter((a) => a.level === 5 || a.level === 6);

  let bestMatch: { activity: Task; score: number } | null = null;

  for (const activity of l5l6Activities) {
    const score = calculateMatchScore(event, activity, activities);
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { activity, score };
    }
  }

  if (!bestMatch || bestMatch.score < 50) {
    return {
      eventId: event.id,
      matchedActivityId: null,
      matchedActivityCode: null,
      matchedActivityName: "No confident match",
      confidence: bestMatch?.score ?? 0,
      matchStatus: "REVIEW",
    };
  }

  let matchStatus: "EXACT" | "MATCHED" | "REVIEW" = "REVIEW";
  if (bestMatch.score >= 80) matchStatus = "MATCHED";
  if (bestMatch.score >= 95) matchStatus = "EXACT";

  return {
    eventId: event.id,
    matchedActivityId: bestMatch.activity.id,
    matchedActivityCode: bestMatch.activity.activityCode,
    matchedActivityName: bestMatch.activity.name,
    confidence: bestMatch.score,
    matchStatus,
  };
}

export function matchProgressEvents(
  events: ProgressEvent[],
  activities: Task[]
): ActivityMatch[] {
  return events.map((event) => matchProgressEvent(event, activities));
}