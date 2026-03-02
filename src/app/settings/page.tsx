"use client";

import { useProgress } from "@/hooks/useProgress";
import { PageShell } from "@/components/layout/PageShell";
import { GbaPanel } from "@/components/ui/GbaPanel";
import type { Difficulty, Milestone } from "@/lib/types";
import { DIFFICULTY_LABELS } from "@/lib/constants";
import progressionData from "../../../data/progression.json";

const milestones = progressionData.milestones as Milestone[];

const CATEGORY_COLORS: Record<string, string> = {
  badge: "text-gba-yellow",
  story: "text-gba-green",
  hm: "text-gba-blue",
  "post-game": "text-gba-red",
};

const CATEGORY_HEADERS: Record<string, { label: string; color: string }> = {
  badge: { label: "BADGES", color: "bg-gba-yellow/20 text-gba-yellow" },
  story: { label: "STORY EVENTS", color: "bg-gba-green/20 text-gba-green" },
  hm: { label: "HM UNLOCKS", color: "bg-gba-blue/20 text-gba-blue" },
  "post-game": { label: "POST-GAME", color: "bg-gba-red/20 text-gba-red" },
};

export default function SettingsPage() {
  const {
    difficulty,
    setDifficulty,
    completedMilestones,
    toggleMilestone,
    currentLocation,
    setCurrentLocation,
    resetProgress,
  } = useProgress();

  const milestonesByCategory = milestones.reduce(
    (acc, m) => {
      if (!acc[m.category]) acc[m.category] = [];
      acc[m.category].push(m);
      return acc;
    },
    {} as Record<string, Milestone[]>
  );

  return (
    <PageShell>
      {/* Difficulty */}
      <GbaPanel
        title="DIFFICULTY"
        headerColor="bg-gba-red/20 text-gba-red"
      >
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => setDifficulty(key as Difficulty)}
                className={`font-pixel text-[8px] py-2 px-3 border-2 rounded-sm transition-colors
                  ${
                    difficulty === key
                      ? "border-gba-cyan bg-gba-cyan/10 text-gba-cyan"
                      : "border-gba-border text-gba-text-dim hover:border-gba-border-light"
                  }`}
              >
                {label.toUpperCase()}
              </button>
            )
          )}
        </div>
      </GbaPanel>

      {/* Current Location */}
      <GbaPanel
        title="CURRENT LOCATION"
        headerColor="bg-gba-blue/20 text-gba-blue"
      >
        <select
          value={currentLocation}
          onChange={(e) => setCurrentLocation(e.target.value)}
          className="w-full bg-gba-bg border-2 border-gba-border text-gba-text font-mono text-xs
                     px-3 py-2 rounded-sm outline-none focus:border-gba-cyan"
        >
          <option value="frozen_heights">Frozen Heights</option>
          <option value="bellin_town">Bellin Town</option>
          <option value="route_1">Route 1</option>
          <option value="dresco_town">Dresco Town</option>
          <option value="route_2">Route 2</option>
          <option value="fallshore_city">Fallshore City</option>
          <option value="route_3">Route 3</option>
          <option value="dehara_city">Dehara City</option>
          <option value="route_4">Route 4</option>
          <option value="seaport_city">Seaport City</option>
          <option value="route_5">Route 5</option>
          <option value="route_6">Route 6</option>
          <option value="vivill_town">Vivill Town</option>
          <option value="route_7">Route 7</option>
          <option value="route_8">Route 8</option>
          <option value="antisis_city">Antisis City</option>
          <option value="route_9">Route 9</option>
          <option value="serenity_isle">Serenity Isle</option>
          <option value="route_10">Route 10</option>
          <option value="crater_town">Crater Town</option>
          <option value="route_11">Route 11</option>
          <option value="route_12">Route 12</option>
          <option value="crystal_peak">Crystal Peak</option>
          <option value="victory_road">Victory Road</option>
          <option value="pokemon_league">Pokemon League</option>
        </select>
      </GbaPanel>

      {/* Milestones */}
      {(["badge", "story", "hm", "post-game"] as const).map((category) => {
        const header = CATEGORY_HEADERS[category];
        const items = milestonesByCategory[category] || [];
        if (items.length === 0) return null;

        return (
          <GbaPanel
            key={category}
            title={header.label}
            headerColor={header.color}
          >
            <div className="space-y-1">
              {items
                .sort((a, b) => a.order - b.order)
                .map((milestone) => {
                  const isCompleted = completedMilestones.includes(
                    milestone.id
                  );
                  return (
                    <button
                      key={milestone.id}
                      onClick={() => toggleMilestone(milestone.id)}
                      className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-sm transition-colors text-left
                        ${
                          isCompleted
                            ? "bg-gba-green/5"
                            : "hover:bg-white/5"
                        }`}
                    >
                      <span
                        className={`font-pixel text-[10px] w-4 text-center ${
                          isCompleted ? CATEGORY_COLORS[category] : "text-gba-text-dim"
                        }`}
                      >
                        {isCompleted ? "+" : "-"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-mono text-xs ${
                            isCompleted
                              ? "text-gba-text"
                              : "text-gba-text-dim"
                          }`}
                        >
                          {milestone.name}
                        </div>
                        <div className="font-mono text-[10px] text-gba-text-dim truncate">
                          {milestone.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </GbaPanel>
        );
      })}

      {/* Reset */}
      <div className="pt-2">
        <button
          onClick={resetProgress}
          className="w-full font-pixel text-[8px] py-2 border-2 border-gba-red/40 text-gba-red
                     rounded-sm hover:bg-gba-red/10 transition-colors"
        >
          RESET ALL PROGRESS
        </button>
      </div>
    </PageShell>
  );
}
