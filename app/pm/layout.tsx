"use client";

import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { PMLayout } from "@/components/layout/PMLayout";
import { ReactNode } from "react";

export default function PMRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ProtectedLayout allowedRole="pm" portalName="PM">
      <PMLayout>{children}</PMLayout>
    </ProtectedLayout>
  );
}