"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { ProgressProvider } from "@/contexts/ProgressContext";
import { TeamProvider } from "@/contexts/TeamContext";
import { PcProvider } from "@/contexts/PcContext";
import { CaughtProvider } from "@/contexts/CaughtContext";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { useMigration } from "@/hooks/useMigration";

function MigrationRunner({ children }: { children: React.ReactNode }) {
  useMigration();
  return <>{children}</>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MigrationRunner>
        <ProgressProvider>
          <TeamProvider>
            <PcProvider>
              <CaughtProvider>
                <Header />
                {children}
                <BottomNav />
              </CaughtProvider>
            </PcProvider>
          </TeamProvider>
        </ProgressProvider>
      </MigrationRunner>
    </AuthProvider>
  );
}
