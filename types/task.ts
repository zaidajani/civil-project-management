export interface Task {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  description: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  discipline: "Civil" | "Structural" | "Electrical" | "Finishing" | "General";
  activityCode: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  plannedProgress: number;
  actualProgress: number;
  status: "Not Started" | "In Progress" | "Completed" | "Delayed";
  priority: "Low" | "Medium" | "High" | "Critical";
  assignedSupervisorId: string | null;
}