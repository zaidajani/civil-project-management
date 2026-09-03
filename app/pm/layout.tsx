import { Metadata } from "next";
import { PMLayout } from "@/components/layout/PMLayout";

export const metadata: Metadata = {
  title: "CivilManager - Project Manager Portal",
  description: "Project Manager Portal for CivilManager",
};

export default function PMRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PMLayout>
      {children}
    </PMLayout>
  );
}