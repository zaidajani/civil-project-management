import { Metadata } from "next";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";

export const metadata: Metadata = { title: "CivilManager - Supervisor Portal", description: "Field supervisor workspace for CivilManager" };

export default function SupervisorRootLayout({ children }: { children: React.ReactNode }) {
  return <SupervisorLayout>{children}</SupervisorLayout>;
}
