import { labourers, seededCollaborations, seededReports, seededSupervisorTasks } from "@/data/supervisor";
import { Classification, Collaboration, DailyReport, Labourer, SupervisorTask, TaskPriority } from "@/types/supervisor";

const keys = { tasks: "supervisor_tasks", collaborations: "supervisor_collaborations", reports: "supervisor_daily_reports" };

function getStored<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (!value) return fallback;
  try { return JSON.parse(value) as T[]; } catch { return fallback; }
}

function save<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const supervisorStore = {
  tasks: () => getStored<SupervisorTask & { suggestedTeamId?: string; assignedTeamId?: string }>(keys.tasks, seededSupervisorTasks).map(task => ({
    ...task,
    suggestedLabourerId: task.suggestedLabourerId ?? labourers.find(labourer => labourer.teamId === task.suggestedTeamId)?.id ?? "labourer-001",
    status: (task.status as string) === "Awaiting Approval" ? (task.assignedLabourerId ? "Assigned" : "Unassigned") : task.status,
    assignedLabourerId: task.assignedLabourerId ?? (task.assignedTeamId ? labourers.find(labourer => labourer.teamId === task.assignedTeamId)?.id : undefined),
  })),
  saveTasks: (tasks: SupervisorTask[]) => save(keys.tasks, tasks),
  collaborations: () => getStored<Collaboration>(keys.collaborations, seededCollaborations),
  saveCollaborations: (items: Collaboration[]) => save(keys.collaborations, items),
  reports: () => getStored<DailyReport>(keys.reports, seededReports),
  saveReports: (items: DailyReport[]) => save(keys.reports, items),
};

export function classifyTask(text: string): Classification {
  const normalized = text.toLowerCase();
  if (/(conduit|cable|electrical|panel|wire)/.test(normalized)) return { discipline: "Electrical", level: 6, hierarchyLabel: "Electrical Works › LV Distribution › Conduit installation", parentTaskId: "task-010", confidence: 91, reasoning: "The task describes an electrical installation or verification activity." };
  if (/(finish|paint|tile|masonry|plaster)/.test(normalized)) return { discipline: "Finishing", level: 6, hierarchyLabel: "Finishing Works › Architectural Finishes › Site activity", parentTaskId: "task-011", confidence: 88, reasoning: "The task relates to an executable finishing activity." };
  if (/(excavat|foundation|pile|earthwork)/.test(normalized)) return { discipline: "Civil", level: 6, hierarchyLabel: "Civil Works › Foundation Works › Site activity", parentTaskId: "task-006", confidence: 89, reasoning: "The task maps to civil and foundation work." };
  if (/(drain|plumb|pipe|sanitary|water supply)/.test(normalized)) return { discipline: "Plumbing", level: 6, hierarchyLabel: "Plumbing Works › Drainage & Water Supply › Site activity", parentTaskId: "task-012", confidence: 88, reasoning: "The task relates to a plumbing or drainage activity." };
  return { discipline: "Structural", level: 6, hierarchyLabel: "Structural Works › Superstructure › Site activity", parentTaskId: "task-009", confidence: /(beam|rebar|reinforcement|shutter|concrete|slab|column)/.test(normalized) ? 94 : 72, reasoning: "The task is being treated as a structural executable activity; review the proposed parent before approval." };
}

interface RecommendationResult {
  labourer: Labourer;
  score: number;
  reasons: string[];
}

function getTaskKeywords(classification: Classification, description: string): string[] {
  const keywords = description.toLowerCase().split(/\s+/);
  const disciplineKeywords: Record<string, string[]> = {
    Civil: ["shuttering", "formwork", "beam", "slab", "column", "concrete", "excavat", "foundation", "pile", "earthwork", "brickwork", "masonry"],
    Structural: ["reinforcement", "rebar", "steel", "rcc", "column", "beam", "slab", "formwork", "concrete"],
    Electrical: ["conduit", "cable", "electrical", "panel", "wire", "lighting", "tray", "conduit"],
    Plumbing: ["drain", "plumb", "pipe", "sanitary", "water supply", "drainage", "fitting", "pump"],
    Finishing: ["finish", "paint", "tile", "masonry", "plaster", "waterproof", "plastering"],
  };
  return [...new Set([...keywords, ...(disciplineKeywords[classification.discipline] || [])])];
}

function calculateScore(labourer: Labourer, classification: Classification, description: string, location: string): RecommendationResult {
  if (labourer.availability !== "Available") {
    return { labourer, score: 0, reasons: ["Not available"] };
  }

  let score = 0;
  const reasons: string[] = [];
  const normalizedDesc = description.toLowerCase();
  const normalizedLoc = location.toLowerCase();

  const taskKeywords = getTaskKeywords(classification, description);

  if (labourer.tradeCategory === classification.discipline) {
    score += 40;
    reasons.push(`✓ ${classification.discipline} specialist`);
  }

  const skillMatches = labourer.skills.filter(skill =>
    taskKeywords.some(kw => kw.includes(skill.toLowerCase()) || skill.toLowerCase().includes(kw))
  );
  if (skillMatches.length > 0) {
    score += Math.min(25, skillMatches.length * 8);
    reasons.push(`✓ Skills match: ${skillMatches.join(", ")}`);
  }

  const workMatches = labourer.previousWork.filter(work =>
    taskKeywords.some(kw => work.toLowerCase().includes(kw) || kw.includes(work.toLowerCase().split(" ")[0]))
  );
  if (workMatches.length > 0) {
    score += Math.min(20, workMatches.length * 10);
    reasons.push(`✓ Previous similar work: ${workMatches[0]}`);
  }

  if (labourer.experience >= 8) {
    score += 10;
    reasons.push(`✓ Highly experienced (${labourer.experience} years)`);
  } else if (labourer.experience >= 5) {
    score += 6;
    reasons.push(`✓ Experienced (${labourer.experience} years)`);
  } else {
    score += 3;
    reasons.push(`✓ ${labourer.experience} years experience`);
  }

  score += 5;
  reasons.push("✓ Currently available");

  if (labourer.zone.toLowerCase() === normalizedLoc || normalizedLoc.includes(labourer.zone.toLowerCase()) || labourer.zone.toLowerCase().includes(normalizedLoc)) {
    score += 5;
    reasons.push(`✓ Works in ${labourer.zone}`);
  }

  score = Math.min(100, score);

  return { labourer, score, reasons };
}

export function recommendLabourer(classification: Classification, description: string = "", location: string = ""): Labourer {
  const availableLabourers = labourers.filter(l => l.availability === "Available");
  const results = availableLabourers.map(l => calculateScore(l, classification, description, location));
  results.sort((a, b) => b.score - a.score);
  return results[0]?.labourer ?? labourers[0];
}

export function getRecommendations(classification: Classification, description: string = "", location: string = "", limit: number = 3): RecommendationResult[] {
  const availableLabourers = labourers.filter(l => l.availability === "Available");
  const results = availableLabourers.map(l => calculateScore(l, classification, description, location));
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

export function createSupervisorTask(input: { description: string; location: string; dueDate: string; priority: TaskPriority; source: "Manual" | "Converse" }): SupervisorTask {
  const classification = classifyTask(input.description);
  const recommendations = getRecommendations(classification, input.description, input.location, 1);
  const labourer = recommendations[0]?.labourer ?? labourers[0];
  const reasons = recommendations[0]?.reasons ?? [`${labourer.name} is available in ${labourer.zone} and is a suitable ${labourer.trade.toLowerCase()} for this task.`];
  const assigned = classification.confidence >= 80;
  return { id: `sup-task-${Date.now()}`, title: input.description.length > 58 ? `${input.description.slice(0, 58)}…` : input.description, description: input.description, location: input.location || "Location to be confirmed", dueDate: input.dueDate || "2026-09-05", priority: input.priority, status: assigned ? "Assigned" : "Unassigned", classification, suggestedLabourerId: labourer.id, assignedLabourerId: assigned ? labourer.id : undefined, assignmentReason: reasons.join("; "), dispatchStatus: assigned ? "Queued" : "Not sent", createdAt: new Date().toISOString(), source: input.source };
}