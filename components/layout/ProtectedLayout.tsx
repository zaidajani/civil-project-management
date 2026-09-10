"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ReactNode } from "react";

interface ProtectedLayoutProps {
  children: ReactNode;
  allowedRole: "pm" | "supervisor";
  portalName: string;
}

export function ProtectedLayout({ children, allowedRole, portalName }: ProtectedLayoutProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        const loginUrl = new URL("/login", window.location.origin);
        loginUrl.searchParams.set("redirect", pathname);
        router.push(loginUrl.toString());
        router.refresh();
      } else if (user.role !== allowedRole) {
        const redirectTo = allowedRole === "pm" ? "/supervisor" : "/pm";
        router.push(redirectTo);
        router.refresh();
      }
    }
  }, [user, isLoading, router, pathname, allowedRole]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-border rounded w-3/4 mx-auto mb-4"></div>
          <div className="h-4 bg-border rounded w-1/2 mx-auto mb-2"></div>
          <div className="h-4 bg-border rounded w-full mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user || user.role !== allowedRole) {
    return null;
  }

  return <>{children}</>;
}