"use client";

import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { ReactNode } from "react";

export default function SupervisorRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ProtectedLayout allowedRole="supervisor" portalName="Supervisor">
      <SupervisorLayout>{children}</SupervisorLayout>
    </ProtectedLayout>
  );
}
