export interface Progress {
  id: string;
  projectId: string;
  taskId: string;
  date: string;
  actualProgress: number;
  quantityCompleted: number | null;
  quantityUnit: string | null;
  notes: string;
  updatedBy: string;
}