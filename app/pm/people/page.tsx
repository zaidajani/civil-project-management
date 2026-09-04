"use client";

import { useState, useMemo, useEffect } from "react";
import { executionHierarchy, ExecutionMember } from "@/data/execution-hierarchy";

const ROLE_LABELS: Record<ExecutionMember["role"], string> = {
  PROJECT_MANAGER: "Project Manager",
  SUPERVISOR: "Supervisor",
  LABOUR: "Labour",
};

const ROLE_COLORS: Record<ExecutionMember["role"], string> = {
  PROJECT_MANAGER: "bg-primary text-white",
  SUPERVISOR: "bg-secondary text-white",
  LABOUR: "bg-accent text-white",
};

const STATUS_COLORS: Record<ExecutionMember["status"], string> = {
  Active: "bg-status-ontrack-bg text-status-ontrack",
  Inactive: "bg-status-atrisk-bg text-status-atrisk",
  "On Leave": "bg-status-delayed-bg text-status-delayed",
};

const DISCIPLINE_COLORS: Record<string, string> = {
  Civil: "bg-amber-100 text-amber-700",
  Structural: "bg-slate-100 text-slate-700",
  Electrical: "bg-cyan-100 text-cyan-700",
  Finishing: "bg-purple-100 text-purple-700",
  General: "bg-gray-100 text-gray-700",
};

function buildTree(members: ExecutionMember[]): Map<string, ExecutionMember & { children: (ExecutionMember & { children: any[] })[] }> {
  const memberMap = new Map<string, ExecutionMember & { children: (ExecutionMember & { children: any[] })[] }>();
  
  members.forEach(member => {
    memberMap.set(member.id, { ...member, children: [] });
  });
  
  memberMap.forEach(member => {
    if (member.parentId) {
      const parent = memberMap.get(member.parentId);
      if (parent) {
        parent.children.push(member);
      }
    }
  });
  
  return memberMap;
}

function getHierarchyPath(member: ExecutionMember, memberMap: Map<string, ExecutionMember>): ExecutionMember[] {
  const path: ExecutionMember[] = [];
  let current: ExecutionMember | undefined = member;
  
  while (current) {
    path.unshift(current);
    if (!current.parentId) break;
    current = memberMap.get(current.parentId);
  }
  
  return path;
}

function countByRole(members: ExecutionMember[]) {
  const counts = { PROJECT_MANAGER: 0, SUPERVISOR: 0, LABOUR: 0 };
  members.forEach(m => counts[m.role]++);
  return counts;
}

export default function PeoplePage() {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedMember, setSelectedMember] = useState<ExecutionMember | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedMemberId, setHighlightedMemberId] = useState<string | null>(null);

  const memberMap = useMemo(() => buildTree(executionHierarchy), []);
  const rootMembers = useMemo(() => 
    executionHierarchy.filter(m => m.role === "PROJECT_MANAGER"), 
  []);
  const counts = useMemo(() => countByRole(executionHierarchy), []);

  useEffect(() => {
    if (searchQuery) {
      const match = executionHierarchy.find(
        m =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.discipline.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (match) {
        setHighlightedMemberId(match.id);
        const path = getHierarchyPath(match, memberMap);
        path.forEach(m => {
          if (m.parentId) setExpandedNodes(prev => new Set(prev).add(m.parentId!));
        });
        setSelectedMember(match);
      }
    } else {
      setHighlightedMemberId(null);
    }
  }, [searchQuery, memberMap]);

  const toggleExpand = (memberId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const renderTree = (members: (ExecutionMember & { children: any[] })[], depth = 0) => (
    <ul className="space-y-2">
      {members.map(member => {
        const hasChildren = member.children.length > 0;
        const isExpanded = expandedNodes.has(member.id);
        const isHighlighted = highlightedMemberId === member.id;
        const isSelected = selectedMember?.id === member.id;
        const isPM = member.role === "PROJECT_MANAGER";

        return (
          <li key={member.id} className="relative">
            <div
              className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-colors ${
                isHighlighted ? "bg-primary/10 border-l-2 border-primary" : ""
              } ${isSelected ? "bg-active-bg border-l-2 border-primary" : ""} ${depth > 0 ? "ml-8" : ""}`}
              style={{ borderLeftWidth: isSelected || isHighlighted ? "2px" : "0" }}
            >
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(member.id)}
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
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[member.role]}`}
              >
                {ROLE_LABELS[member.role]}
              </span>

              <span className={`font-medium ${isHighlighted ? "text-primary" : "text-text-primary"}`}>
                {member.name}
              </span>

              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DISCIPLINE_COLORS[member.discipline] || DISCIPLINE_COLORS.General}`}
              >
                {member.discipline}
              </span>

              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[member.status]}`}>
                {member.status}
              </span>
            </div>

            {hasChildren && isExpanded && (
              <div className="mt-1 border-l-2 border-border/50 pl-2">
                {renderTree(member.children, depth + 1)}
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
        <h1 className="text-2xl lg:text-3xl font-semibold text-text-primary tracking-tight">Execution Hierarchy</h1>
        <p className="mt-2 text-text-secondary text-base lg:text-lg max-w-3xl">
          View project responsibility from the Project Manager to supervisors and field workforce.
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
            placeholder="Search by name, role, or discipline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-lg text-center bg-primary text-white">
            <p className="text-2xl font-semibold">{counts.PROJECT_MANAGER}</p>
            <p className="text-xs opacity-90 mt-0.5">Project Manager</p>
          </div>
          <div className="p-4 rounded-lg text-center bg-secondary text-white">
            <p className="text-2xl font-semibold">{counts.SUPERVISOR}</p>
            <p className="text-xs opacity-90 mt-0.5">Supervisors</p>
          </div>
          <div className="p-4 rounded-lg text-center bg-accent text-white">
            <p className="text-2xl font-semibold">{counts.LABOUR}</p>
            <p className="text-xs opacity-90 mt-0.5">Total Labour</p>
          </div>
          <div className="p-4 rounded-lg text-center bg-status-ontrack-bg text-status-ontrack">
            <p className="text-2xl font-semibold">
              {executionHierarchy.filter(m => m.role === "SUPERVISOR" && m.status === "Active").length}
            </p>
            <p className="text-xs opacity-90 mt-0.5">Active Supervisors</p>
          </div>
          <div className="p-4 rounded-lg text-center bg-status-ontrack-bg text-status-ontrack">
            <p className="text-2xl font-semibold">
              {executionHierarchy.filter(m => m.role === "LABOUR" && m.status === "Active").length}
            </p>
            <p className="text-xs opacity-90 mt-0.5">Active Labour</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh] p-4">
          <div className="font-mono text-sm">
            {renderTree(Array.from(memberMap.values()).filter(m => m.role === "PROJECT_MANAGER"))}
          </div>
        </div>
      </div>

      {selectedMember && (
        <div className="card p-6 lg:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Member Details</h2>
            <button
              onClick={() => setSelectedMember(null)}
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
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Name</p>
              <p className="mt-1 text-text-primary">{selectedMember.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Role</p>
              <p className="mt-1 text-text-primary">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[selectedMember.role]}`}>
                  {ROLE_LABELS[selectedMember.role]}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Discipline</p>
              <p className="mt-1 text-text-primary">{selectedMember.discipline}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Status</p>
              <p className="mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[selectedMember.status]}`}>
                  {selectedMember.status}
                </span>
              </p>
            </div>
            {selectedMember.role === "PROJECT_MANAGER" && (
              <div className="sm:col-span-2 lg:col-span-1">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Supervisors</p>
                <p className="mt-1 text-text-primary">
                  {executionHierarchy.filter(m => m.parentId === selectedMember.id).length}
                </p>
              </div>
            )}
            {selectedMember.role === "SUPERVISOR" && (
              <>
                <div className="sm:col-span-2 lg:col-span-1">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Labour Assigned</p>
                  <p className="mt-1 text-text-primary">
                    {executionHierarchy.filter(m => m.parentId === selectedMember.id).length}
                  </p>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Active Labour</p>
                  <p className="mt-1 text-text-primary">
                    {executionHierarchy.filter(m => m.parentId === selectedMember.id && m.status === "Active").length}
                  </p>
                </div>
              </>
            )}
            {selectedMember.role === "LABOUR" && (
              <>
                <div className="sm:col-span-2 lg:col-span-1">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Assigned Supervisor</p>
                  <p className="mt-1 text-text-primary">
                    {(() => {
                      const supervisor = executionHierarchy.find(m => m.id === selectedMember.parentId);
                      return supervisor ? supervisor.name : "—";
                    })()}
                  </p>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Contact</p>
                  <p className="mt-1 text-text-secondary">
                    {selectedMember.email || "—"}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Responsibility Chain</p>
            <div className="space-y-2 text-sm">
              {(() => {
                const path = getHierarchyPath(selectedMember, memberMap);
                return path.length === 0 ? (
                  <p className="text-text-muted">Top level</p>
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
                      <span className="font-medium">{p.name}</span>
                      <span className="text-text-muted">—</span>
                      <span>{ROLE_LABELS[p.role]}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[p.role]}`}>
                        {p.discipline}
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