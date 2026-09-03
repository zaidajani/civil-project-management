"use client";

import { useState, useRef, useEffect } from "react";

export function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="header fixed top-0 left-64 right-0 z-30 h-16 flex items-center justify-between px-5 lg:px-6 border-b">
      <div className="flex items-center gap-4 min-w-0">
        <div className="hidden lg:block truncate">
          <h1 className="text-base font-semibold text-text-primary truncate">Mumbai Metro Station</h1>
        </div>
        <div className="hidden md:flex items-center">
          <span className="status-badge status-in-progress">In Progress</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={notificationsRef}>
          <button
            className="btn-icon p-2 rounded-md focus-ring"
            onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
            aria-label="Notifications"
            aria-expanded={showNotifications}
            aria-haspopup="true"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-status-delayed rounded-full" aria-hidden="true" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 card-elevated py-2 animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b font-medium text-sm text-text-primary">Notifications</div>
              <div className="px-4 py-4 text-text-secondary text-sm">No new notifications</div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            className="btn-icon flex items-center gap-2.5 p-1.5 rounded-md pr-3 focus-ring"
            onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
            aria-label="Profile menu"
            aria-expanded={showProfileMenu}
            aria-haspopup="true"
          >
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold">PM</span>
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium text-text-primary truncate max-w-[160px]">Project Manager</p>
              <p className="text-xs text-text-secondary truncate max-w-[160px]">pm@civilmanager.com</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary lg:hidden" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 card-elevated py-2 animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="px-4 py-3 border-b">
                <p className="text-sm font-medium text-text-primary truncate">Project Manager</p>
                <p className="text-xs text-text-secondary truncate">pm@civilmanager.com</p>
              </div>
              <a href="/pm/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-hover focus-ring rounded-md mx-2 my-1" style={{ borderRadius: 'var(--radius-sm)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </a>
              <a href="/pm/settings" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-hover focus-ring rounded-md mx-2 my-1" style={{ borderRadius: 'var(--radius-sm)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Settings
              </a>
              <hr className="my-2 border-border" />
              <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-status-delayed hover:bg-hover focus-ring rounded-md mx-2 my-1" style={{ borderRadius: 'var(--radius-sm)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}