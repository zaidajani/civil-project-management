export interface Project {
  id: string;
  name: string;
  location: string;
  client: string;
  startDate: string;
  plannedEndDate: string;
  overallPlannedProgress: number;
  overallActualProgress: number;
  status: "Planning" | "In Progress" | "Completed" | "On Hold";
  health: "On Track" | "At Risk" | "Delayed";
}