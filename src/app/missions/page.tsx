"use client";

import { useState, useMemo } from "react";
import { useProgress } from "@/hooks/useProgress";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { PageShell } from "@/components/layout/PageShell";
import { GbaPanel } from "@/components/ui/GbaPanel";
import { HpBar } from "@/components/ui/HpBar";
import type { Mission, MissionStatus } from "@/lib/types";
import missionsData from "../../../data/missions.json";

const missions = missionsData as Mission[];

// -- Status filter definitions --

type StatusFilter = "ALL" | "AVAILABLE" | "IN PROGRESS" | "COMPLETED";

const STATUS_TABS: StatusFilter[] = ["ALL", "AVAILABLE", "IN PROGRESS", "COMPLETED"];

const STATUS_CYCLE: Record<string, MissionStatus> = {
  available: "in-progress",
  "in-progress": "completed",
  completed: "available",
};

const STATUS_LABELS: Record<MissionStatus, string> = {
  available: "AVAILABLE",
  "in-progress": "IN PROGRESS",
  completed: "COMPLETED",
};

const STATUS_COLORS: Record<MissionStatus, string> = {
  available: "border-gba-border text-gba-text-dim",
  "in-progress": "border-gba-cyan text-gba-cyan",
  completed: "border-gba-green text-gba-green",
};

const STATUS_PANEL_BORDER: Record<MissionStatus, string> = {
  available: "",
  "in-progress": "border-gba-cyan/40",
  completed: "border-gba-green/40",
};

const STATUS_HEADER_COLORS: Record<MissionStatus, string> = {
  available: "bg-gba-green/20 text-gba-green",
  "in-progress": "bg-gba-cyan/20 text-gba-cyan",
  completed: "bg-gba-green/20 text-gba-green",
};

export default function MissionsPage() {
  const { isUnlocked } = useProgress();
  const [missionStatus, setMissionStatus] = useLocalStorage<
    Record<string, string>
  >("pkm-unbound-mission-status", {});
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("ALL");

  // -- Helpers --

  function getStatus(missionId: string): MissionStatus {
    const status = missionStatus[missionId];
    if (status === "in-progress" || status === "completed") return status;
    return "available";
  }

  function cycleStatus(missionId: string) {
    const current = getStatus(missionId);
    const next = STATUS_CYCLE[current];
    setMissionStatus((prev) => ({
      ...prev,
      [missionId]: next,
    }));
  }

  // -- Filtered missions --

  const filteredMissions = useMemo(() => {
    return missions.filter((mission) => {
      if (activeFilter === "ALL") return true;

      const locked = !isUnlocked(mission.milestoneRequired);
      const status = getStatus(mission.id);

      if (activeFilter === "AVAILABLE") {
        return !locked && status === "available";
      }
      if (activeFilter === "IN PROGRESS") {
        return status === "in-progress";
      }
      if (activeFilter === "COMPLETED") {
        return status === "completed";
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, missionStatus, isUnlocked]);

  // -- Progress stats --

  const completedCount = missions.filter(
    (m) => getStatus(m.id) === "completed"
  ).length;
  const totalCount = missions.length;
  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <PageShell>
      {/* Progress Summary */}
      <GbaPanel
        title="MISSION LOG"
        headerColor="bg-gba-green/20 text-gba-green"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-pixel text-[9px] text-gba-text">
              {completedCount}/{totalCount} COMPLETED
            </span>
            <span className="font-pixel text-[7px] text-gba-text-dim">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <HpBar value={completedCount} max={totalCount} color="auto" />
        </div>
      </GbaPanel>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`font-pixel text-[7px] py-2 px-3 border-2 rounded-sm transition-colors min-h-[44px]
              ${
                activeFilter === tab
                  ? "border-gba-cyan bg-gba-cyan/10 text-gba-cyan"
                  : "border-gba-border text-gba-text-dim hover:border-gba-border-light"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Mission List */}
      {filteredMissions.length === 0 ? (
        <div className="gba-panel p-4 text-center font-mono text-xs text-gba-text-dim">
          No missions match the current filter.
        </div>
      ) : (
        filteredMissions.map((mission) => {
          const locked = !isUnlocked(mission.milestoneRequired);
          const status = getStatus(mission.id);

          return (
            <MissionCard
              key={mission.id}
              mission={mission}
              status={status}
              locked={locked}
              onCycleStatus={() => cycleStatus(mission.id)}
            />
          );
        })
      )}
    </PageShell>
  );
}

// -- Mission Card Component --

function MissionCard({
  mission,
  status,
  locked,
  onCycleStatus,
}: {
  mission: Mission;
  status: MissionStatus;
  locked: boolean;
  onCycleStatus: () => void;
}) {
  const headerColor = locked
    ? "bg-gba-red/10 text-gba-text-dim"
    : STATUS_HEADER_COLORS[status];

  const panelBorder = locked ? "" : STATUS_PANEL_BORDER[status];

  return (
    <GbaPanel
      title={mission.name.toUpperCase()}
      headerColor={headerColor}
      className={`${locked ? "opacity-50" : ""} ${panelBorder}`}
    >
      <div className="space-y-2.5">
        {/* Locked label */}
        {locked && (
          <span className="inline-block font-pixel text-[7px] px-2 py-1 border rounded-sm text-gba-red border-gba-red/40 bg-gba-red/10">
            LOCKED
          </span>
        )}

        {/* Description */}
        <p className="font-mono text-[11px] text-gba-text-dim leading-relaxed">
          {mission.description}
        </p>

        {/* Requirements */}
        {mission.requirements && (
          <div className="space-y-1">
            <div className="font-pixel text-[7px] text-gba-yellow tracking-wide">
              REQUIREMENTS
            </div>
            <div className="font-mono text-[10px] text-gba-text-dim pl-2 border-l-2 border-gba-yellow/30">
              {mission.requirements}
            </div>
          </div>
        )}

        {/* Objectives */}
        {mission.objectives.length > 0 && (
          <div className="space-y-1">
            <div className="font-pixel text-[7px] text-gba-blue tracking-wide">
              OBJECTIVES
            </div>
            <div className="space-y-0.5 pl-1">
              {mission.objectives.map((objective, idx) => {
                const isChecked = status === "completed";
                return (
                  <div key={idx} className="flex items-start gap-2 min-h-[28px]">
                    <span
                      className={`font-pixel text-[8px] w-4 text-center flex-shrink-0 mt-0.5 ${
                        isChecked ? "text-gba-green" : "text-gba-text-dim"
                      }`}
                    >
                      {isChecked ? "+" : `${idx + 1}.`}
                    </span>
                    <span
                      className={`font-mono text-[10px] leading-relaxed ${
                        isChecked
                          ? "text-gba-green/80 line-through"
                          : "text-gba-text-dim"
                      }`}
                    >
                      {objective}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rewards */}
        {mission.rewards.length > 0 && (
          <div className="space-y-1">
            <div className="font-pixel text-[7px] text-gba-cyan tracking-wide">
              REWARDS
            </div>
            <div className="space-y-0.5 pl-1">
              {mission.rewards.map((reward, idx) => (
                <div key={idx} className="flex items-center gap-2 min-h-[24px]">
                  <span className="font-pixel text-[8px] text-gba-cyan flex-shrink-0">
                    &gt;
                  </span>
                  <span className="font-mono text-[10px] text-gba-text-dim">
                    {reward}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Toggle Button */}
        {!locked && (
          <button
            onClick={onCycleStatus}
            className={`w-full font-pixel text-[8px] py-2.5 px-3 border-2 rounded-sm transition-colors min-h-[44px]
              ${STATUS_COLORS[status]}
              hover:bg-white/5`}
          >
            {STATUS_LABELS[status]}
          </button>
        )}
      </div>
    </GbaPanel>
  );
}
