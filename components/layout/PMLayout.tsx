"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ReactNode } from "react";

interface PMLayoutProps {
  children: ReactNode;
}

export function PMLayout({ children }: PMLayoutProps) {
  return (
    <div className="min-h-screen bg-bg flex">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-64">
        <Header />
        <main className="flex-1 p-6 lg:p-8 pt-20 lg:pt-24">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}