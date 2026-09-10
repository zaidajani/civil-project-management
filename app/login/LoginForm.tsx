"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, isLoading } = useAuth();

  const [role, setRole] = useState<"pm" | "supervisor">("pm");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = searchParams.get("redirect") || "";

  useEffect(() => {
    if (!isLoading && user) {
      const target = redirectTo || (user.role === "pm" ? "/pm" : "/supervisor");
      router.push(target);
      router.refresh();
    }
  }, [user, isLoading, router, redirectTo]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const success = login(role, email, password);
    if (success) {
      const target = redirectTo || (role === "pm" ? "/pm" : "/supervisor");
      router.push(target);
      router.refresh();
    } else {
      setError("Invalid credentials. Please check your role, email, and password.");
    }
    setIsSubmitting(false);
  };

  const roleOptions = [
    { value: "pm" as const, label: "Project Manager" },
    { value: "supervisor" as const, label: "Supervisor" },
  ];

  if (isLoading) {
    return (
      <div className="card-elevated bg-surface-elevated border border-border rounded-xl p-8 animate-pulse">
        <div className="h-8 bg-border rounded w-3/4 mx-auto mb-4"></div>
        <div className="h-4 bg-border rounded w-1/2 mx-auto mb-2"></div>
        <div className="h-4 bg-border rounded w-full mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="card-elevated bg-surface-elevated border border-border rounded-xl p-8">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-6" aria-label="CivilManager Home">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-xl font-semibold text-text-primary tracking-tight">CivilManager</span>
        </Link>
        <h1 className="text-2xl font-semibold text-text-primary">Sign in</h1>
        <p className="mt-2 text-sm text-text-secondary">Project Management · Planning to Execution</p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-status-delayed-bg/10 border border-status-delayed/20 text-sm text-status-delayed" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-text-secondary mb-1.5">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as "pm" | "supervisor")}
            className="w-full px-3 py-2.5 border border-border rounded-lg bg-bg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            disabled={isSubmitting}
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1.5">
            Username / Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={role === "pm" ? "pm@civilmanager.com" : "supervisor@civilmanager.com"}
            className="w-full px-3 py-2.5 border border-border rounded-lg bg-bg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            disabled={isSubmitting}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={role === "pm" ? "pm123" : "sup123"}
            className="w-full px-3 py-2.5 border border-border rounded-lg bg-bg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            disabled={isSubmitting}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-xs text-text-muted text-center">
          Demo credentials:
        </p>
        <div className="mt-3 space-y-2 text-xs text-text-secondary font-mono">
          <div className="p-2 bg-bg border border-border rounded">
            <strong>Project Manager:</strong> pm@civilmanager.com / pm123
          </div>
          <div className="p-2 bg-bg border border-border rounded">
            <strong>Supervisor:</strong> supervisor@civilmanager.com / sup123
          </div>
        </div>
      </div>
    </div>
  );
}