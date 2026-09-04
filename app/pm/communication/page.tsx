"use client";

import { useState, useMemo, useEffect } from "react";
import { communicationMessages, communicationThreads } from "@/data/communication";
import { CommunicationMessage, CommunicationThread } from "@/types/communication";
import { executionHierarchy, ExecutionMember } from "@/data/execution-hierarchy";

const ROLE_COLORS: Record<string, string> = {
  PROJECT_MANAGER: "bg-primary text-white",
  SUPERVISOR: "bg-secondary text-white",
  LABOUR: "bg-accent text-white",
};

const ROLE_LABELS: Record<string, string> = {
  PROJECT_MANAGER: "Project Manager",
  SUPERVISOR: "Supervisor",
  LABOUR: "Labour",
};

const DISCIPLINE_COLORS: Record<string, string> = {
  Civil: "bg-amber-100 text-amber-700",
  Structural: "bg-slate-100 text-slate-700",
  Electrical: "bg-cyan-100 text-cyan-700",
  Finishing: "bg-purple-100 text-purple-700",
  General: "bg-gray-100 text-gray-700",
};

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-accent/20 text-accent",
  read: "bg-status-ontrack-bg text-status-ontrack",
  archived: "bg-text-muted/20 text-text-muted",
};

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeAgo(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateTime(isoString);
}

export default function CommunicationPage() {
  const [messages, setMessages] = useState<CommunicationMessage[]>(communicationMessages);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedThread, setSelectedThread] = useState<CommunicationThread | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState<string>("");
  const [composeMessage, setComposeMessage] = useState("");

  const supervisors = executionHierarchy.filter(m => m.role === "SUPERVISOR");
  const labour = executionHierarchy.filter(m => m.role === "LABOUR");
  const pm = executionHierarchy.find(m => m.role === "PROJECT_MANAGER");
  const allMembers = executionHierarchy;

  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      const matchesSearch =
        searchQuery === "" ||
        msg.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.senderName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || msg.senderRole === roleFilter;
      const matchesStatus = statusFilter === "all" || msg.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [messages, searchQuery, roleFilter, statusFilter]);

  const handleSendMessage = () => {
    if (!composeRecipient || !composeMessage.trim()) return;

    const recipient = allMembers.find(m => m.id === composeRecipient);
    if (!recipient) return;

    const newMessage: CommunicationMessage = {
      id: `comm-${Date.now()}`,
      senderId: "exec-001", // Current user (PM)
      senderName: pm?.name ?? "Project Manager",
      senderRole: "PROJECT_MANAGER",
      discipline: "General",
      message: composeMessage.trim(),
      timestamp: new Date().toISOString(),
      status: "sent",
      recipients: [composeRecipient],
    };

    setMessages(prev => [newMessage, ...prev]);
    setComposeMessage("");
    setComposeRecipient("");
    setShowCompose(false);
  };

  const getMessageStatus = (msg: CommunicationMessage): string => {
    if (msg.status === "read") return "Read";
    if (msg.status === "sent") return "Sent";
    return "Archived";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold text-text-primary tracking-tight">Communication</h1>
        <p className="mt-2 text-text-secondary text-base lg:text-lg max-w-3xl">
          Project communication and coordination between project management and field teams.
        </p>
      </div>

      <div className="card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
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
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="PROJECT_MANAGER">Project Manager</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="LABOUR">Labour</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-border rounded-md bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="read">Read</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Recent Updates</h2>
              <button
                onClick={() => setShowCompose(true)}
                className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light transition-colors focus-ring"
              >
                Send Message
              </button>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-text-muted">
                  <p>No messages found matching the current filters.</p>
                </div>
              ) : (
                filteredMessages.map(msg => (
                  <div
                    key={msg.id}
                    className="p-4 bg-bg border border-border rounded-lg hover:bg-hover/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium text-text-primary">{msg.senderName}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[msg.senderRole]}`}>
                            {ROLE_LABELS[msg.senderRole]}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DISCIPLINE_COLORS[msg.discipline] || DISCIPLINE_COLORS.General}`}>
                            {msg.discipline}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[msg.status]}`}>
                            {getMessageStatus(msg)}
                          </span>
                        </div>
                        <p className="text-text-secondary text-sm">{msg.message}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-xs text-text-muted">
                        <span>{formatTimeAgo(msg.timestamp)}</span>
                        <span>{formatDateTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-5 space-y-4">
              <h3 className="text-lg font-semibold text-text-primary">Team Directory</h3>
              <div className="space-y-3">
                {pm && (
                  <div className="p-3 bg-bg border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[pm.role]}`}>
                        {ROLE_LABELS[pm.role]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary">{pm.name}</p>
                        <p className="text-xs text-text-secondary">{pm.discipline}</p>
                      </div>
                      <span className="text-xs text-text-muted">1</span>
                    </div>
                  </div>
                )}
                <div className="border-t border-border/50 pt-3 space-y-2">
                  {supervisors.map(sup => (
                    <div key={sup.id} className="p-3 bg-bg border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[sup.role]}`}>
                          {ROLE_LABELS[sup.role]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text-primary">{sup.name}</p>
                          <p className="text-xs text-text-secondary">{sup.discipline} • {sup.status}</p>
                        </div>
                        <span className="text-xs text-text-muted">
                          {executionHierarchy.filter(m => m.parentId === sup.id).length} labour
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/50 pt-3 space-y-2">
                  {labour.map(l => (
                    <div key={l.id} className="p-3 bg-bg border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[l.role]}`}>
                          {ROLE_LABELS[l.role]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text-primary">{l.name}</p>
                          <p className="text-xs text-text-secondary">{l.discipline} • {l.status}</p>
                        </div>
                        <span className="text-xs text-text-muted">
                          {(() => {
                            const sup = executionHierarchy.find(m => m.id === l.parentId);
                            return sup?.name ?? "—";
                          })()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 animate-in fade-in-0">
          <div className="bg-surface-elevated rounded-xl shadow-lg w-full max-w-md animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Send Message</h2>
              <button
                onClick={() => setShowCompose(false)}
                className="p-1 text-text-secondary hover:text-text-primary"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Recipient</label>
                <select
                  value={composeRecipient}
                  onChange={(e) => setComposeRecipient(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select recipient</option>
                  <option value="all">All Team Members</option>
                  <optgroup label="Supervisors">
                    {supervisors.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.discipline} Supervisor)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Labour">
                    {labour.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.discipline} Labour)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Message</label>
                <textarea
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface-elevated text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
                  placeholder="Type your message here..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 text-sm font-medium text-text-primary bg-hover border border-border rounded-lg hover:bg-border transition-colors focus-ring"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!composeRecipient || !composeMessage.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}