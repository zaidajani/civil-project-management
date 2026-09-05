"use client";

import { useState, useEffect } from "react";

interface Settings {
  profile: {
    name: string;
    email: string;
  };
  projectPreferences: {
    defaultProject: string;
    dateFormat: string;
    workingDays: string[];
  };
  notifications: {
    scheduleUpdates: boolean;
    reviewQueueAlerts: boolean;
    delayRiskAlerts: boolean;
  };
}

const DEFAULT_SETTINGS: Settings = {
  profile: {
    name: "Project Manager",
    email: "pm@civilmanager.com",
  },
  projectPreferences: {
    defaultProject: "proj-001",
    dateFormat: "DD MMM YYYY",
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  },
  notifications: {
    scheduleUpdates: true,
    reviewQueueAlerts: true,
    delayRiskAlerts: true,
  },
};

const STORAGE_KEY = "pm_settings";

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<Settings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    return DEFAULT_SETTINGS;
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: Settings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

const ALL_WORKING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DATE_FORMATS = [
  "DD MMM YYYY",
  "YYYY-MM-DD",
  "MM/DD/YYYY",
  "DD/MM/YYYY",
];
const PROJECTS = [
  { id: "proj-001", name: "Mumbai Metro Station Construction" },
  { id: "proj-002", name: "Delhi Airport Terminal 4" },
  { id: "proj-003", name: "Bangalore Metro Phase 3" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveSettings(settings);
    }
  }, [settings, isLoaded]);

  const handleProfileChange = (field: "name" | "email", value: string) => {
    setSettings((prev) => ({
      ...prev,
      profile: { ...prev.profile, [field]: value },
    }));
    setSaved(false);
  };

  const handleProjectPreferencesChange = (
    field: keyof Settings["projectPreferences"],
    value: string | string[]
  ) => {
    setSettings((prev) => ({
      ...prev,
      projectPreferences: { ...prev.projectPreferences, [field]: value },
    }));
    setSaved(false);
  };

  const handleNotificationChange = (field: keyof Settings["notifications"]) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [field]: !prev.notifications[field] },
    }));
    setSaved(false);
  };

  const handleWorkingDayToggle = (day: string) => {
    setSettings((prev) => {
      const current = prev.projectPreferences.workingDays;
      const updated = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day];
      return {
        ...prev,
        projectPreferences: { ...prev.projectPreferences, workingDays: updated },
      };
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    saveSettings(settings);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setSaved(false);
  };

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-text-primary tracking-tight">Settings</h1>
          <p className="mt-2 text-text-secondary text-base lg:text-lg">Loading...</p>
        </div>
        <div className="card-section p-8 text-center">
          <div className="inline-flex items-center gap-3 text-text-secondary">
            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold text-text-primary tracking-tight">Settings</h1>
        <p className="mt-2 text-text-secondary text-base lg:text-lg">Manage your profile, project preferences, and notifications.</p>
      </div>

      {saved && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 bg-success-bg text-success border border-success/30 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2">
          Settings saved successfully
        </div>
      )}

      <div className="space-y-6">
        <section className="panel">
          <header className="panel-header">
            Profile
          </header>
          <div className="panel-body space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-name" className="text-label block mb-1.5">Name</label>
                <input
                  id="profile-name"
                  type="text"
                  value={settings.profile.name}
                  onChange={(e) => handleProfileChange("name", e.target.value)}
                  className="input"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label htmlFor="profile-email" className="text-label block mb-1.5">Email</label>
                <input
                  id="profile-email"
                  type="email"
                  value={settings.profile.email}
                  onChange={(e) => handleProfileChange("email", e.target.value)}
                  className="input"
                  placeholder="Enter your email"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <header className="panel-header">
            Project Preferences
          </header>
          <div className="panel-body space-y-4">
            <div>
              <label htmlFor="default-project" className="text-label block mb-1.5">Default Project</label>
              <select
                id="default-project"
                value={settings.projectPreferences.defaultProject}
                onChange={(e) => handleProjectPreferencesChange("defaultProject", e.target.value)}
                className="input select"
              >
                {PROJECTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="date-format" className="text-label block mb-1.5">Date Format</label>
              <select
                id="date-format"
                value={settings.projectPreferences.dateFormat}
                onChange={(e) => handleProjectPreferencesChange("dateFormat", e.target.value)}
                className="input select"
              >
                {DATE_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-label block mb-1.5">Working Days</label>
              <div className="flex flex-wrap gap-2">
                {ALL_WORKING_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleWorkingDayToggle(day)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                      settings.projectPreferences.workingDays.includes(day)
                        ? "bg-primary text-white border-primary"
                        : "bg-surface-elevated text-text-secondary border-border hover:bg-hover"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <header className="panel-header">
            Notification Preferences
          </header>
          <div className="panel-body space-y-4">
            <div className="space-y-3">
              {[
                { key: "scheduleUpdates", label: "Schedule Updates", description: "Notify when task dates or progress are updated" },
                { key: "reviewQueueAlerts", label: "Review Queue Alerts", description: "Notify when new items need review in the Planner Review queue" },
                { key: "delayRiskAlerts", label: "Delay & Risk Alerts", description: "Notify when activities are delayed or flagged as at-risk" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-surface-elevated border border-border rounded-md">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{item.label}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationChange(item.key as keyof Settings["notifications"])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-ring ${
                      settings.notifications[item.key as keyof Settings["notifications"]]
                        ? "bg-primary"
                        : "bg-border"
                    }`}
                    role="switch"
                    aria-checked={settings.notifications[item.key as keyof Settings["notifications"]]}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.notifications[item.key as keyof Settings["notifications"]]
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-ghost"
          >
            Reset to Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}