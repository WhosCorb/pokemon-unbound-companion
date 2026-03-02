"use client";

import { useMemo } from "react";
import type { PokemonType } from "@/lib/types";
import { ALL_TYPES, TYPE_ABBREVIATIONS, TYPE_COLORS } from "@/lib/constants";
import {
  getTeamOffensiveCoverage,
  getTeamDefensiveSummary,
} from "@/lib/type-calc";
import { GbaPanel } from "@/components/ui/GbaPanel";

interface TypeCoverageGridProps {
  teamTypes: PokemonType[][];
}

export function TypeCoverageGrid({ teamTypes }: TypeCoverageGridProps) {
  const offensiveCoverage = useMemo(
    () => getTeamOffensiveCoverage(teamTypes),
    [teamTypes]
  );

  const defensiveSummary = useMemo(
    () => getTeamDefensiveSummary(teamTypes),
    [teamTypes]
  );

  const hasTeam = teamTypes.length > 0;

  return (
    <GbaPanel title="TYPE COVERAGE" headerColor="bg-gba-cyan/20 text-gba-cyan">
      {!hasTeam ? (
        <div className="text-center py-4">
          <p className="font-pixel text-[7px] text-gba-text-dim">
            ADD POKEMON TO SEE COVERAGE
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Offensive Coverage */}
          <div>
            <div className="font-pixel text-[7px] text-gba-green mb-2 tracking-wider">
              OFFENSIVE (STAB)
            </div>
            <div className="grid grid-cols-9 gap-1">
              {ALL_TYPES.map((type) => {
                const multiplier = offensiveCoverage[type];
                const defData = defensiveSummary[type];

                let bgClass: string;
                let textClass: string;
                if (multiplier >= 2) {
                  // Super effective -- green
                  bgClass = "bg-green-900/60 border-green-600/40";
                  textClass = "text-green-300";
                } else if (multiplier < 1 || defData.weak > 0) {
                  // No SE coverage AND team is weak -- red
                  bgClass = "bg-red-900/60 border-red-600/40";
                  textClass = "text-red-300";
                } else {
                  // Neutral
                  bgClass = "bg-gba-bg/60 border-gba-border/40";
                  textClass = "text-gba-text-dim";
                }

                return (
                  <TypCell
                    key={type}
                    type={type}
                    bgClass={bgClass}
                    textClass={textClass}
                    label={TYPE_ABBREVIATIONS[type]}
                    sublabel={multiplier >= 2 ? "SE" : multiplier < 1 ? "NVE" : "--"}
                  />
                );
              })}
            </div>
          </div>

          {/* Defensive Weaknesses */}
          <div>
            <div className="font-pixel text-[7px] text-gba-red mb-2 tracking-wider">
              DEFENSIVE WEAK
            </div>
            <div className="grid grid-cols-9 gap-1">
              {ALL_TYPES.map((type) => {
                const { weak, immune } = defensiveSummary[type];

                let bgClass: string;
                let textClass: string;
                if (immune > 0 && weak === 0) {
                  bgClass = "bg-blue-900/60 border-blue-600/40";
                  textClass = "text-blue-300";
                } else if (weak >= 3) {
                  bgClass = "bg-red-900/60 border-red-600/40";
                  textClass = "text-red-300";
                } else if (weak === 2) {
                  bgClass = "bg-yellow-900/60 border-yellow-600/40";
                  textClass = "text-yellow-300";
                } else {
                  bgClass = "bg-green-900/60 border-green-600/40";
                  textClass = "text-green-300";
                }

                return (
                  <TypCell
                    key={type}
                    type={type}
                    bgClass={bgClass}
                    textClass={textClass}
                    label={TYPE_ABBREVIATIONS[type]}
                    sublabel={`${weak}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-gba-border/40">
            <LegendItem color="bg-green-600" label="Covered / Safe" />
            <LegendItem color="bg-yellow-600" label="Caution (2 weak)" />
            <LegendItem color="bg-red-600" label="Danger (3+ weak)" />
            <LegendItem color="bg-blue-600" label="Immunity" />
          </div>
        </div>
      )}
    </GbaPanel>
  );
}

function TypCell({
  type,
  bgClass,
  textClass,
  label,
  sublabel,
}: {
  type: PokemonType;
  bgClass: string;
  textClass: string;
  label: string;
  sublabel: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-sm border p-1 ${bgClass}`}
      title={type}
    >
      <span
        className="font-pixel text-[5px] leading-tight"
        style={{ color: TYPE_COLORS[type] }}
      >
        {label}
      </span>
      <span className={`font-mono text-[8px] leading-tight ${textClass}`}>
        {sublabel}
      </span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-sm ${color}`} />
      <span className="font-mono text-[8px] text-gba-text-dim">{label}</span>
    </div>
  );
}
