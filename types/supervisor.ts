export type SupervisorTaskStatus = "Awaiting Approval" | "Assigned" | "In Progress" | "Completed" | "Blocked";
export type DispatchStatus = "Not sent" | "Queued" | "Sent" | "Delivered" | "Read" | "Accepted";
export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

export interface LabourTeam {
  id: string;
  name: string;
  trade: string;
  members: number;
  lead: string;
  phone: string;
  zone: string;
  availability: "Available" | "Limited" | "Engaged";
  activeTasks: number;
}

export interface Labourer {
  id: string;
  name: string;
  trade: string;
  teamId: string;
  phone: string;
  zone: string;
  availability: "Available" | "Limited" | "Engaged";
  activeTasks: number;
}

export interface Classification {
  discipline: "Civil" | "Structural" | "Electrical" | "Finishing" | "General";
  level: 5 | 6;
  hierarchyLabel: string;
  parentTaskId: string;
  confidence: number;
  reasoning: string;
}

export interface SupervisorTask {
  id: string;
  title: string;
  description: string;
  location: string;
  dueDate: string;
  priority: TaskPriority;
  status: SupervisorTaskStatus;
  classification: Classification;
  suggestedLabourerId: string;
  assignedLabourerId?: string;
  assignedToSelf?: boolean;
  assignmentReason: string;
  dispatchStatus: DispatchStatus;
  createdAt: string;
  source: "Manual" | "Converse";
}

export interface Collaboration {
  id: string;
  title: string;
  objective: string;
  partner: string;
  partnerTeam: string;
  dueDate: string;
  status: "Active" | "Pending" | "Completed";
  taskCount: number;
  updates: number;
}

export interface DailyReport {
  id: string;
  date: string;
  shift: "Day" | "Night";
  workforce: number;
  completedWork: string;
  blockers: string;
  safetyNote: string;
  status: "Draft" | "Submitted";
}

export interface ConversationMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}
