"use client";

import { useState, useMemo } from "react";
import { useMissions } from "@/hooks/useMissions";
import { PageShell } from "@/components/layout/PageShell";
import { GbaPanel } from "@/components/ui/GbaPanel";
import { HpBar } from "@/components/ui/HpBar";
import type { Mission, MissionStatus } from "@/lib/types";

// -- Status filter definitions --

type StatusFilter = "ALL" | "AVAILABLE" | "IN PROGRESS" | "COMPLETED";

const STATUS_TABS: StatusFilter[] = ["ALL", "AVAILABLE", "IN PROGRESS", "COMPLETED"];

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
  const {
    missions,
    getStatus,
    cycleStatus,
    getObjectiveStatus,
    toggleObjective,
    isLocked,
    completedCount,
    totalCount,
  } = useMissions();
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("ALL");

  // -- Filtered missions --

  const filteredMissions = useMemo(() => {
    return missions.filter((mission) => {
      if (activeFilter === "ALL") return true;

      const locked = isLocked(mission);
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
  }, [activeFilter, missions, getStatus, isLocked]);

  // -- Progress stats --

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
          const locked = isLocked(mission);
          const status = getStatus(mission.id);
          const objectives = getObjectiveStatus(mission.id, mission.objectives.length);

          return (
            <MissionCard
              key={mission.id}
              mission={mission}
              status={status}
              locked={locked}
              objectiveChecks={objectives}
              onCycleStatus={() => cycleStatus(mission.id)}
              onToggleObjective={(idx) =>
                toggleObjective(mission.id, idx, mission.objectives.length)
              }
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
  objectiveChecks,
  onCycleStatus,
  onToggleObjective,
}: {
  mission: Mission;
  status: MissionStatus;
  locked: boolean;
  objectiveChecks: boolean[];
  onCycleStatus: () => void;
  onToggleObjective: (idx: number) => void;
}) {
  const headerColor = locked
    ? "bg-gba-red/10 text-gba-text-dim"
    : STATUS_HEADER_COLORS[status];

  const panelBorder = locked ? "" : STATUS_PANEL_BORDER[status];
  const canToggleObjectives = status === "in-progress";

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
                const isChecked = status === "completed" || objectiveChecks[idx];
                return (
                  <button
                    key={idx}
                    onClick={() => canToggleObjectives && onToggleObjective(idx)}
                    disabled={!canToggleObjectives}
                    className={`flex items-start gap-2 min-h-[28px] w-full text-left ${
                      canToggleObjectives ? "cursor-pointer hover:bg-white/5 rounded-sm px-1 -mx-1" : ""
                    }`}
                  >
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
                  </button>
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
