"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useProgress } from "@/hooks/useProgress";
import type { Mission, MissionStatus } from "@/lib/types";
import missionsData from "../../data/missions.json";

const missions = missionsData as Mission[];

const STATUS_CYCLE: Record<string, MissionStatus> = {
  available: "in-progress",
  "in-progress": "completed",
  completed: "available",
};

export function useMissions() {
  const { isUnlocked } = useProgress();

  const [missionStatus, setMissionStatus] = useLocalStorage<
    Record<string, MissionStatus>
  >("pkm-unbound-mission-status", {});

  const [objectiveStatus, setObjectiveStatus] = useLocalStorage<
    Record<string, boolean[]>
  >("pkm-unbound-objective-status", {});

  const getStatus = useCallback(
    (missionId: string): MissionStatus => {
      const status = missionStatus[missionId];
      if (status === "in-progress" || status === "completed") return status;
      return "available";
    },
    [missionStatus]
  );

  const cycleStatus = useCallback(
    (missionId: string) => {
      const current = getStatus(missionId);
      const next = STATUS_CYCLE[current];
      setMissionStatus((prev) => ({ ...prev, [missionId]: next }));

      // Reset objectives when cycling away from in-progress/completed
      if (next === "available") {
        setObjectiveStatus((prev) => {
          const updated = { ...prev };
          delete updated[missionId];
          return updated;
        });
      }
    },
    [getStatus, setMissionStatus, setObjectiveStatus]
  );

  const getObjectiveStatus = useCallback(
    (missionId: string, objectiveCount: number): boolean[] => {
      const stored = objectiveStatus[missionId];
      if (stored && stored.length === objectiveCount) return stored;
      return new Array(objectiveCount).fill(false);
    },
    [objectiveStatus]
  );

  const toggleObjective = useCallback(
    (missionId: string, objectiveIndex: number, objectiveCount: number) => {
      setObjectiveStatus((prev) => {
        const current = prev[missionId] ?? new Array(objectiveCount).fill(false);
        const updated = [...current];
        updated[objectiveIndex] = !updated[objectiveIndex];
        return { ...prev, [missionId]: updated };
      });

      // Auto-mark as completed if all objectives done
      const currentObjs = objectiveStatus[missionId] ?? new Array(objectiveCount).fill(false);
      const updatedObjs = [...currentObjs];
      updatedObjs[objectiveIndex] = !updatedObjs[objectiveIndex];
      const allDone = updatedObjs.every(Boolean);

      if (allDone && getStatus(missionId) === "in-progress") {
        setMissionStatus((prev) => ({ ...prev, [missionId]: "completed" }));
      }
    },
    [objectiveStatus, setObjectiveStatus, getStatus, setMissionStatus]
  );

  const isLocked = useCallback(
    (mission: Mission): boolean => !isUnlocked(mission.milestoneRequired),
    [isUnlocked]
  );

  // Computed values
  const completedCount = missions.filter(
    (m) => getStatus(m.id) === "completed"
  ).length;

  const inProgressMissions = missions.filter(
    (m) => getStatus(m.id) === "in-progress"
  );

  return {
    missions,
    missionStatus,
    objectiveStatus,
    getStatus,
    cycleStatus,
    getObjectiveStatus,
    toggleObjective,
    isLocked,
    completedCount,
    totalCount: missions.length,
    inProgressMissions,
  };
}
