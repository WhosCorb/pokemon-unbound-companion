"use client";

import { createContext, useCallback, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { createDefaultProgress, getBadgeCount, isAccessible } from "@/lib/progress";
import type { Difficulty, UserProgress } from "@/lib/types";

interface ProgressContextValue {
  progress: UserProgress;
  completedMilestones: string[];
  currentLocation: string;
  difficulty: Difficulty;
  badgeCount: number;
  toggleMilestone: (milestoneId: string) => void;
  setCurrentLocation: (locationId: string) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  isUnlocked: (milestoneRequired: string) => boolean;
  resetProgress: () => void;
}

export const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useLocalStorage<UserProgress>(
    "pkm-unbound-progress",
    createDefaultProgress()
  );

  const toggleMilestone = useCallback(
    (milestoneId: string) => {
      setProgress((prev) => {
        const completed = prev.completedMilestones.includes(milestoneId)
          ? prev.completedMilestones.filter((m) => m !== milestoneId)
          : [...prev.completedMilestones, milestoneId];
        return { ...prev, completedMilestones: completed };
      });
    },
    [setProgress]
  );

  const setCurrentLocation = useCallback(
    (locationId: string) => {
      setProgress((prev) => ({ ...prev, currentLocation: locationId }));
    },
    [setProgress]
  );

  const setDifficulty = useCallback(
    (difficulty: Difficulty) => {
      setProgress((prev) => ({ ...prev, difficulty }));
    },
    [setProgress]
  );

  const isUnlocked = useCallback(
    (milestoneRequired: string) => {
      return isAccessible(milestoneRequired, progress.completedMilestones);
    },
    [progress.completedMilestones]
  );

  const resetProgress = useCallback(() => {
    setProgress(createDefaultProgress());
  }, [setProgress]);

  const value = useMemo(
    (): ProgressContextValue => ({
      progress,
      completedMilestones: progress.completedMilestones,
      currentLocation: progress.currentLocation,
      difficulty: progress.difficulty,
      badgeCount: getBadgeCount(progress.completedMilestones),
      toggleMilestone,
      setCurrentLocation,
      setDifficulty,
      isUnlocked,
      resetProgress,
    }),
    [progress, toggleMilestone, setCurrentLocation, setDifficulty, isUnlocked, resetProgress]
  );

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}
