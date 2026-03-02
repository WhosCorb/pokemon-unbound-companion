"use client";

import { ProgressProvider } from "@/contexts/ProgressContext";
import { TeamProvider } from "@/contexts/TeamContext";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProgressProvider>
      <TeamProvider>
        <Header />
        {children}
        <BottomNav />
      </TeamProvider>
    </ProgressProvider>
  );
}
