"use client";

import { useState, useMemo, useEffect } from "react";
import { tasks } from "@/data/tasks";
import { Task } from "@/types/task";

const LEVEL_LABELS: Record<number, string> = {
  1: "L1 — Project Root",
  2: "L2 — Work Package",
  3: "L3 — Work Package Group",
  4: "L4 — Trade Package",
  5: "L5 — Executable Work Package",
  6: "L6 — Executable Activity",
};

const LEVEL_BADGE_COLORS: Record<number, string> = {
  1: "bg-primary text-white",
  2: "bg-secondary text-white",
  3: "bg-accent text-white",
  4: "bg-highlight text-white",
  5: "bg-status-ontrack text-white",
  6: "bg-status-ontrack text-white",
};

const DISCIPLINE_COLORS: Record<string, string> = {
  Civil: "bg-amber-100 text-amber-700",
  Structural: "bg-slate-100 text-slate-700",
  Electrical: "bg-cyan-100 text-cyan-700",
  Finishing: "bg-purple-100 text-purple-700",
  General: "bg-gray-100 text-gray-700",
};

function buildTree(tasks: Task[]): (Task & { children: (Task & { children: any[] })[] })[] {
  const taskMap = new Map<string, Task & { children: (Task & { children: any[] })[] }>();
  
  tasks.forEach(task => {
    taskMap.set(task.id, { ...task, children: [] });
  });
  
  const roots: (Task & { children: any[] })[] = [];
  
  taskMap.forEach(task => {
    if (task.parentId) {
      const parent = taskMap.get(task.parentId);
      if (parent) {
        parent.children.push(task);
      }
    } else {
      roots.push(task);
    }
  });
  
  return roots;
}

function getHierarchyPath(task: Task, allTasks: Task[]): (Task & { children?: any[] })[] {
  const path: (Task & { children?: any[] })[] = [];
  let current: Task | undefined = task;
  
  while (current) {
    path.unshift(current);
    if (!current.parentId) break;
    current = allTasks.find(t => t.id === current!.parentId);
  }
  
  return path;
}

function countByLevel(tasks: Task[]) {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  tasks.forEach(t => { if (t.level >= 1 && t.level <= 6) counts[t.level]++; });
  return counts;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusClass(status: Task["status"]): string {
  const map: Record<Task["status"], string> = {
    "Not Started": "bg-status-atrisk-bg text-status-atrisk",
    "In Progress": "bg-active-bg text-primary",
    "Completed": "bg-status-ontrack-bg text-status-ontrack",
    "Delayed": "bg-status-delayed-bg text-status-delayed",
  };
  return map[status] || "bg-gray-100 text-gray-700";
}

export default function HierarchyPage() {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["task-001"]));
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  const tree = useMemo(() => buildTree(tasks), []);
  const counts = useMemo(() => countByLevel(tasks), []);

  useEffect(() => {
    if (searchQuery) {
      const match = tasks.find(
        t =>
          (t.level === 5 || t.level === 6) &&
          (t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.activityCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.discipline.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      if (match) {
        setHighlightedTaskId(match.id);
        const path = getHierarchyPath(match, tasks);
        path.forEach(t => {
          if (t.parentId) setExpandedNodes(prev => new Set(prev).add(t.parentId!));
        });
        setSelectedTask(match);
      }
    } else {
      setHighlightedTaskId(null);
    }
  }, [searchQuery]);

  const toggleExpand = (taskId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const renderTree = (nodes: (Task & { children: any[] })[], depth = 0) => (
    <ul className="space-y-1">
      {nodes.map(node => {
        const hasChildren = node.children.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        const isHighlighted = highlightedTaskId === node.id;
        const isSelected = selectedTask?.id === node.id;
        const isExecutable = node.level >= 5;

        return (
          <li key={node.id} className="relative">
            <div
              className={`flex items-center gap-2 py-1.5 px-3 rounded-lg transition-colors ${
                isHighlighted ? "bg-primary/10 border-l-2 border-primary" : ""
              } ${isSelected ? "bg-active-bg border-l-2 border-primary" : ""} ${depth > 0 ? "ml-6" : ""}`}
              style={{ borderLeftWidth: isSelected || isHighlighted ? "2px" : "0" }}
            >
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(node.id)}
                  className="p-1 flex-shrink-0 text-text-muted hover:text-text-primary transition-colors"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                  aria-expanded={isExpanded}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={isExpanded ? "rotate-90" : ""}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
              {!hasChildren && <span className="w-6 flex-shrink-0" />}

              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${LEVEL_BADGE_COLORS[node.level]}`}
              >
                L{node.level}
              </span>

              <span className={`font-medium ${isExecutable ? "font-semibold" : ""} ${isHighlighted ? "text-primary" : "text-text-primary"}`}>
                {node.activityCode}
              </span>
              <span className={`text-text-secondary ${isExecutable ? "font-medium" : ""} max-w-[300px] truncate`}>
                {node.name}
              </span>

              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DISCIPLINE_COLORS[node.discipline] || DISCIPLINE_COLORS.General}`}
              >
                {node.discipline}
              </span>

              <span className={`ml-auto status-badge ${node.status.toLowerCase().replace(" ", "-")}`}>
                {node.status}
              </span>
            </div>

            {hasChildren && isExpanded && (
              <div className="mt-1 border-l-2 border-border/50 pl-2">
                {renderTree(node.children, depth + 1)}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold text-text-primary tracking-tight">Schedule Hierarchy</h1>
        <p className="mt-2 text-text-secondary text-base lg:text-lg max-w-3xl">
          Explore the project baseline from major milestones to executable L5/L6 activities.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="relative max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search L5/L6 activity by name, code, or discipline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map(level => (
            <div
              key={level}
              className={`p-4 rounded-lg text-center ${LEVEL_BADGE_COLORS[level]}`}
            >
              <p className="text-2xl font-semibold">{counts[level]}</p>
              <p className="text-xs opacity-90 mt-0.5">{LEVEL_LABELS[level]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh] p-4">
          <div className="font-mono text-sm">
            {renderTree(tree)}
          </div>
        </div>
      </div>

      {selectedTask && (
        <div className="card p-6 lg:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Activity Details</h2>
            <button
              onClick={() => setSelectedTask(null)}
              className="btn-icon p-1.5 rounded-md focus-ring"
              aria-label="Close detail panel"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Activity Code</p>
              <p className="mt-1 font-mono text-text-primary">{selectedTask.activityCode}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Level</p>
              <p className="mt-1 text-text-primary">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${LEVEL_BADGE_COLORS[selectedTask.level]}`}>
                  {LEVEL_LABELS[selectedTask.level]}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Discipline</p>
              <p className="mt-1 text-text-primary">{selectedTask.discipline}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Priority</p>
              <p className="mt-1 text-text-primary">{selectedTask.priority}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Planned Start</p>
              <p className="mt-1 text-text-primary">{formatDate(selectedTask.plannedStart)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Planned End</p>
              <p className="mt-1 text-text-primary">{formatDate(selectedTask.plannedEnd)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Actual Start</p>
              <p className="mt-1 text-text-primary">{selectedTask.actualStart ? formatDate(selectedTask.actualStart) : "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Actual End</p>
              <p className="mt-1 text-text-primary">{selectedTask.actualEnd ? formatDate(selectedTask.actualEnd) : "—"}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Progress</p>
              <p className="mt-1 text-text-primary">{selectedTask.actualProgress}%</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Status</p>
              <p className="mt-1">
                <span className={`status-badge ${selectedTask.status.toLowerCase().replace(" ", "-")}`}>
                  {selectedTask.status}
                </span>
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Hierarchy Path</p>
            <div className="space-y-2 text-sm">
              {(() => {
                const path = getHierarchyPath(selectedTask, tasks);
                return path.length === 0 ? (
                  <p className="text-text-muted">Root level activity</p>
                ) : (
                  path.map((p, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 ${i === path.length - 1 ? "text-text-primary font-medium" : "text-text-secondary"}`}
                    >
                      {i > 0 && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted" aria-hidden="true">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      )}
                      <span className="font-medium">{p.activityCode}</span>
                      <span className="text-text-muted">—</span>
                      <span>{p.name}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${LEVEL_BADGE_COLORS[p.level]}`}>
                        L{p.level}
                      </span>
                    </div>
                  ))
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}