import { labourers, seededCollaborations, seededReports, seededSupervisorTasks } from "@/data/supervisor";
import { Classification, Collaboration, DailyReport, SupervisorTask, TaskPriority } from "@/types/supervisor";

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
  return { discipline: "Structural", level: 6, hierarchyLabel: "Structural Works › Superstructure › Site activity", parentTaskId: "task-009", confidence: /(beam|rebar|reinforcement|shutter|concrete|slab|column)/.test(normalized) ? 94 : 72, reasoning: "The task is being treated as a structural executable activity; review the proposed parent before approval." };
}

export function recommendLabourer(classification: Classification) {
  const labourerId = classification.discipline === "Electrical" ? "labourer-006" : classification.discipline === "Finishing" ? "labourer-008" : classification.discipline === "Civil" ? "labourer-005" : "labourer-001";
  return labourers.find(labourer => labourer.id === labourerId) ?? labourers[0];
}

export function createSupervisorTask(input: { description: string; location: string; dueDate: string; priority: TaskPriority; source: "Manual" | "Converse" }): SupervisorTask {
  const classification = classifyTask(input.description);
  const labourer = recommendLabourer(classification);
  return { id: `sup-task-${Date.now()}`, title: input.description.length > 58 ? `${input.description.slice(0, 58)}…` : input.description, description: input.description, location: input.location || "Location to be confirmed", dueDate: input.dueDate || "2026-09-05", priority: input.priority, status: "Awaiting Approval", classification, suggestedLabourerId: labourer.id, assignmentReason: `${labourer.name} is available in ${labourer.zone} and is a suitable ${labourer.trade.toLowerCase()} for this task.`, dispatchStatus: "Not sent", createdAt: new Date().toISOString(), source: input.source };
}
