"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "pm" | "supervisor" | null;

export interface AuthUser {
  role: "pm" | "supervisor";
  email: string;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (role: "pm" | "supervisor", email: string, password: string) => boolean;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DUMMY_CREDENTIALS: Record<string, { role: "pm" | "supervisor"; email: string; password: string; name: string }> = {
  "pm@civilmanager.com": { role: "pm", email: "pm@civilmanager.com", password: "pm123", name: "Project Manager" },
  "supervisor@civilmanager.com": { role: "supervisor", email: "supervisor@civilmanager.com", password: "sup123", name: "Rahul Sharma" },
};

function setAuthCookie(user: AuthUser) {
  if (typeof window !== "undefined") {
    document.cookie = `civilmanager_auth=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Lax`;
  }
}

function clearAuthCookie() {
  if (typeof window !== "undefined") {
    document.cookie = "civilmanager_auth=; path=/; max-age=0; SameSite=Lax";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("civilmanager_auth");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          setAuthCookie(parsed);
        } catch {
          window.localStorage.removeItem("civilmanager_auth");
          clearAuthCookie();
        }
      }
      setIsLoading(false);
    }
  }, []);

  const login = (role: "pm" | "supervisor", email: string, password: string): boolean => {
    const creds = DUMMY_CREDENTIALS[email];
    if (creds && creds.role === role && creds.password === password) {
      const authUser = { role: creds.role, email: creds.email, name: creds.name };
      setUser(authUser);
      window.localStorage.setItem("civilmanager_auth", JSON.stringify(authUser));
      setAuthCookie(authUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    window.localStorage.removeItem("civilmanager_auth");
    clearAuthCookie();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}