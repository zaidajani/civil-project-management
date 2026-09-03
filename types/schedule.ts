export interface Schedule {
  id: string;
  projectId: string;
  taskId: string;
  plannedStartDate: string;
  plannedEndDate: string;
  plannedProgress: number;
  baselineProgress: number;
  status: "Not Started" | "In Progress" | "Completed" | "Delayed";
}