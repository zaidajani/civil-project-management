export type HealthStatus = "COMPLETED" | "ON_TRACK" | "AT_RISK" | "DELAYED";

export function calculateVariance(plannedProgress: number, actualProgress: number): number {
  return actualProgress - plannedProgress;
}

export function getHealthStatus(plannedProgress: number, actualProgress: number): HealthStatus {
  const variance = calculateVariance(plannedProgress, actualProgress);
  
  if (actualProgress >= 100) return "COMPLETED";
  if (variance >= -5) return "ON_TRACK";
  if (variance >= -15) return "AT_RISK";
  return "DELAYED";
}

export function getHealthStatusColor(status: HealthStatus): string {
  switch (status) {
    case "COMPLETED":
      return "bg-status-ontrack-bg text-status-ontrack";
    case "ON_TRACK":
      return "bg-status-ontrack-bg text-status-ontrack";
    case "AT_RISK":
      return "bg-status-atrisk-bg text-status-atrisk";
    case "DELAYED":
      return "bg-status-delayed-bg text-status-delayed";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function getVarianceColor(variance: number): string {
  if (variance >= 0) return "text-status-ontrack";
  if (variance >= -5) return "text-text-secondary";
  if (variance >= -15) return "text-status-atrisk";
  return "text-status-delayed";
}

export function getVarianceLabel(variance: number): string {
  const sign = variance >= 0 ? "+" : "";
  return `${sign}${variance}%`;
}

export interface VarianceSummary {
  plannedProgress: number;
  actualProgress: number;
  variance: number;
  onTrack: number;
  atRisk: number;
  delayed: number;
  completed: number;
}

export function calculateProjectVariance(
  tasks: { id: string; level: number; plannedProgress: number; actualProgress: number }[]
): VarianceSummary {
  const l5l6 = tasks.filter(t => t.level === 5 || t.level === 6);
  
  const totalPlanned = l5l6.reduce((sum, t) => sum + t.plannedProgress, 0);
  const totalActual = l5l6.reduce((sum, t) => sum + t.actualProgress, 0);
  const count = l5l6.length;
  
  const avgPlanned = count > 0 ? Math.round(totalPlanned / count) : 0;
  const avgActual = count > 0 ? Math.round(totalActual / count) : 0;
  const variance = calculateVariance(avgPlanned, avgActual);
  
  let onTrack = 0, atRisk = 0, delayed = 0, completed = 0;
  
  l5l6.forEach(t => {
    const status = getHealthStatus(t.plannedProgress, t.actualProgress);
    switch (status) {
      case "COMPLETED": completed++; break;
      case "ON_TRACK": onTrack++; break;
      case "AT_RISK": atRisk++; break;
      case "DELAYED": delayed++; break;
    }
  });
  
  return {
    plannedProgress: avgPlanned,
    actualProgress: avgActual,
    variance,
    onTrack,
    atRisk,
    delayed,
    completed,
  };
}

export interface ActivityVariance {
  taskId: string;
  activityCode: string;
  name: string;
  discipline: string;
  level: number;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  plannedProgress: number;
  actualProgress: number;
  variance: number;
  healthStatus: HealthStatus;
  status: string;
}

export function computeActivityVariances(
  tasks: {
    id: string;
    activityCode: string;
    name: string;
    discipline: string;
    level: number;
    plannedStart: string;
    plannedEnd: string;
    actualStart?: string;
    actualEnd?: string;
    plannedProgress: number;
    actualProgress: number;
    status: string;
  }[]
): ActivityVariance[] {
  return tasks
    .filter(t => t.level === 5 || t.level === 6)
    .map(t => ({
      taskId: t.id,
      activityCode: t.activityCode,
      name: t.name,
      discipline: t.discipline,
      level: t.level,
      plannedStart: t.plannedStart,
      plannedEnd: t.plannedEnd,
      actualStart: t.actualStart,
      actualEnd: t.actualEnd,
      plannedProgress: t.plannedProgress,
      actualProgress: t.actualProgress,
      variance: calculateVariance(t.plannedProgress, t.actualProgress),
      healthStatus: getHealthStatus(t.plannedProgress, t.actualProgress),
      status: t.status,
    }))
    .sort((a, b) => a.variance - b.variance);
}

export function getDelayedActivities(
  tasks: {
    id: string;
    activityCode: string;
    name: string;
    discipline: string;
    level: number;
    plannedStart: string;
    plannedEnd: string;
    actualStart?: string;
    actualEnd?: string;
    plannedProgress: number;
    actualProgress: number;
    status: string;
  }[]
): ActivityVariance[] {
  return computeActivityVariances(tasks)
    .filter(t => t.healthStatus === "DELAYED" || t.healthStatus === "AT_RISK");
}

export function getAttentionItems(
  tasks: {
    id: string;
    activityCode: string;
    name: string;
    discipline: string;
    level: number;
    plannedStart: string;
    plannedEnd: string;
    actualStart?: string;
    actualEnd?: string;
    plannedProgress: number;
    actualProgress: number;
    status: string;
  }[],
  risks: { id: string; title: string; severity: string; status: string; relatedActivityIds?: string[] }[]
): { type: "RISK" | "ACTIVITY"; item: any; priority: number }[] {
  const delayedActivities = getDelayedActivities(tasks);
  const attentionItems: { type: "RISK" | "ACTIVITY"; item: any; priority: number }[] = [];

  risks.forEach(risk => {
    if (risk.severity === "Critical" && (risk.status === "Open" || risk.status === "Monitoring")) {
      attentionItems.push({ type: "RISK", item: risk, priority: 1 });
    }
  });

  delayedActivities.forEach(activity => {
    if (activity.healthStatus === "DELAYED") {
      attentionItems.push({ type: "ACTIVITY", item: activity, priority: 2 });
    } else if (activity.healthStatus === "AT_RISK") {
      attentionItems.push({ type: "ACTIVITY", item: activity, priority: 3 });
    }
  });

  return attentionItems.sort((a, b) => a.priority - b.priority);
}