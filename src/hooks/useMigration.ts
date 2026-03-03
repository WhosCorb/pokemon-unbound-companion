"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { hasLocalData, hasRemoteData, migrateLocalToSupabase } from "@/lib/migration";

/**
 * Runs once on login: if user has local data but no remote data,
 * migrates localStorage data to Supabase.
 */
export function useMigration() {
  const { user } = useAuth();
  const hasMigrated = useRef(false);

  useEffect(() => {
    if (!user || hasMigrated.current) return;

    const migrate = async () => {
      hasMigrated.current = true; // Prevent repeat attempts regardless of outcome
      try {
        if (!hasLocalData()) return;
        const remote = await hasRemoteData(user.id);
        if (remote) return;
        await migrateLocalToSupabase(user.id);
      } catch {
        // Migration is best-effort; don't block the app
      }
    };

    migrate();
  }, [user]);
}
