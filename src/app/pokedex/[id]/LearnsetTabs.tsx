"use client";

import { useState } from "react";
import { GbaPanel } from "@/components/ui/GbaPanel";
import { TypeBadge } from "@/components/ui/TypeBadge";
import type { PokemonType, LearnsetMove } from "@/lib/types";

interface LearnsetTabsProps {
  learnsetBySource: Record<string, LearnsetMove[]>;
}

const TABS = [
  { key: "level-up", label: "LEVEL-UP" },
  { key: "tm", label: "TM" },
  { key: "tutor", label: "TUTOR" },
  { key: "egg", label: "EGG" },
] as const;

const CATEGORY_LABELS: Record<string, { abbr: string; color: string }> = {
  physical: { abbr: "PHY", color: "text-gba-red" },
  special: { abbr: "SPC", color: "text-gba-blue" },
  status: { abbr: "STA", color: "text-gba-text-dim" },
};

export function LearnsetTabs({ learnsetBySource }: LearnsetTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("level-up");
  const moves = learnsetBySource[activeTab] || [];

  return (
    <GbaPanel
      title="LEARNSET"
      headerColor="bg-gba-red/20 text-gba-red"
    >
      {/* Tab buttons */}
      <div className="flex border-b-2 border-gba-border -mx-3 -mt-3 mb-3">
        {TABS.map((tab) => {
          const count = (learnsetBySource[tab.key] || []).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 font-pixel text-[7px] py-2 transition-colors ${
                activeTab === tab.key
                  ? "text-gba-red bg-gba-red/10 border-b-2 border-gba-red -mb-[2px]"
                  : "text-gba-text-dim hover:text-gba-text"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1 text-[6px] opacity-60">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Move table */}
      {moves.length > 0 ? (
        <div className="max-h-64 overflow-y-auto">
          {/* Table header */}
          <div className="flex items-center gap-1 pb-1 mb-1 border-b border-gba-border/50">
            {activeTab === "level-up" && (
              <span className="font-pixel text-[6px] text-gba-text-dim w-6 text-right flex-shrink-0">
                LV
              </span>
            )}
            <span className="font-pixel text-[6px] text-gba-text-dim flex-1">
              MOVE
            </span>
            <span className="font-pixel text-[6px] text-gba-text-dim w-8 text-center flex-shrink-0">
              TYPE
            </span>
            <span className="font-pixel text-[6px] text-gba-text-dim w-6 text-center flex-shrink-0">
              CAT
            </span>
            <span className="font-pixel text-[6px] text-gba-text-dim w-7 text-right flex-shrink-0">
              PWR
            </span>
            <span className="font-pixel text-[6px] text-gba-text-dim w-7 text-right flex-shrink-0">
              ACC
            </span>
          </div>

          {/* Move rows */}
          {moves.map((move, i) => {
            const cat = CATEGORY_LABELS[move.category] || CATEGORY_LABELS.status;
            return (
              <div
                key={`${move.name}-${i}`}
                className="flex items-center gap-1 py-1 border-b border-gba-border/20 last:border-0"
              >
                {activeTab === "level-up" && (
                  <span className="font-mono text-[9px] text-gba-text-dim w-6 text-right flex-shrink-0">
                    {move.level ?? "--"}
                  </span>
                )}
                <span className="font-mono text-[9px] text-gba-text flex-1 truncate">
                  {move.name}
                </span>
                <div className="w-8 flex-shrink-0 flex justify-center">
                  <TypeBadge type={move.type as PokemonType} abbreviated />
                </div>
                <span className={`font-pixel text-[7px] w-6 text-center flex-shrink-0 ${cat.color}`}>
                  {cat.abbr}
                </span>
                <span className="font-mono text-[9px] text-gba-text w-7 text-right flex-shrink-0">
                  {move.power ?? "--"}
                </span>
                <span className="font-mono text-[9px] text-gba-text-dim w-7 text-right flex-shrink-0">
                  {move.accuracy ?? "--"}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="font-mono text-xs text-gba-text-dim py-3 text-center">
          No moves in this category
        </div>
      )}
    </GbaPanel>
  );
}
