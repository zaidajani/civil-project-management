export interface Risk {
  id: string;
  projectId: string;
  taskId: string;
  title: string;
  description: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "Monitoring" | "Resolved";
  identifiedDate: string;
  expectedImpact: string;
}