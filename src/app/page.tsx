"use client";

import { useProgress } from "@/hooks/useProgress";
import { useTeam } from "@/hooks/useTeam";
import { useCaught } from "@/hooks/useCaught";
import { useMissions } from "@/hooks/useMissions";
import { PageShell } from "@/components/layout/PageShell";
import { GbaPanel } from "@/components/ui/GbaPanel";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { HpBar } from "@/components/ui/HpBar";
import { PokemonSprite } from "@/components/ui/PokemonSprite";
import { BattleStrategy } from "@/components/home/BattleStrategy";
import type { PokemonType } from "@/lib/types";
import Link from "next/link";
import pokemonData from "../../data/pokemon.json";

export default function Dashboard() {
  const { completedMilestones, badgeCount, currentLocation } = useProgress();
  const { filledSlots } = useTeam();
  const { caughtCount } = useCaught();
  const totalPokemon = pokemonData.length;

  const locationLabel = currentLocation
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <PageShell>
      {/* Team Overview */}
      <GbaPanel title="PARTY" headerColor="bg-gba-green/20 text-gba-green">
        {filledSlots.length === 0 ? (
          <Link
            href="/team"
            className="block text-center py-6 text-gba-text-dim font-mono text-xs hover:text-gba-cyan transition-colors"
          >
            No Pokemon in team yet.
            <br />
            <span className="font-pixel text-[8px] text-gba-cyan mt-2 block">
              TAP TO ADD
            </span>
          </Link>
        ) : (
          <div className="space-y-1.5">
            {filledSlots.map((slot, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-1 px-1"
              >
                <PokemonSprite
                  dexNumber={slot.dexNumber}
                  name={slot.pokemonName}
                  primaryType={slot.types[0]}
                  size="sm"
                />
                {/* Name + Level */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-gba-text truncate">
                    {slot.pokemonName}
                  </div>
                </div>
                <span className="font-pixel text-[7px] text-gba-text-dim">
                  Lv{slot.level}
                </span>
                {/* Type badges */}
                <div className="flex gap-1">
                  {slot.types.map((t) => (
                    <TypeBadge
                      key={t}
                      type={t as PokemonType}
                      abbreviated
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </GbaPanel>

      {/* Next Objective */}
      <GbaPanel title="NEXT OBJECTIVE" headerColor="bg-gba-red/20 text-gba-red">
        <NextObjective badgeCount={badgeCount} />
      </GbaPanel>

      {/* Battle Strategy */}
      <BattleStrategy />

      {/* Active Missions */}
      <ActiveMissions />

      {/* Current Location */}
      <GbaPanel title={`AREA: ${locationLabel.toUpperCase()}`} headerColor="bg-gba-blue/20 text-gba-blue">
        <div className="font-mono text-xs text-gba-text-dim">
          <p>Select your current location in Settings to see area details.</p>
          <Link
            href="/locations"
            className="inline-block mt-2 font-pixel text-[8px] text-gba-cyan hover:text-white transition-colors"
          >
            VIEW LOCATION GUIDE &gt;
          </Link>
        </div>
      </GbaPanel>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="BADGES" value={`${badgeCount}/8`} color="yellow" />
        <StatCard label="QUESTS" value={`${completedMilestones.length}`} color="green" />
        <StatCard label="DEX" value={`${caughtCount}/${totalPokemon}`} color="blue" />
      </div>
    </PageShell>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    yellow: "text-gba-yellow border-gba-yellow/30",
    green: "text-gba-green border-gba-green/30",
    blue: "text-gba-blue border-gba-blue/30",
    red: "text-gba-red border-gba-red/30",
    cyan: "text-gba-cyan border-gba-cyan/30",
  };

  return (
    <div className={`gba-panel p-2 text-center border ${colorMap[color]}`}>
      <div className={`font-pixel text-[10px] ${colorMap[color]?.split(" ")[0]}`}>
        {value}
      </div>
      <div className="font-pixel text-[6px] text-gba-text-dim mt-1">
        {label}
      </div>
    </div>
  );
}

// Gym data for next objective preview (correct order per unboundwiki.com)
const GYM_SEQUENCE = [
  { badge: 0, name: "Mirskle", type: "grass" as PokemonType, location: "Dresco Town", level: "14-20" },
  { badge: 1, name: "Vega", type: "dark" as PokemonType, location: "Crater Town", level: "22-26" },
  { badge: 2, name: "Alice", type: "flying" as PokemonType, location: "Blizzard City", level: "28-32" },
  { badge: 3, name: "Mel", type: "normal" as PokemonType, location: "Fallshore City", level: "33-36" },
  { badge: 4, name: "Galavan", type: "electric" as PokemonType, location: "Dehara City", level: "40-45" },
  { badge: 5, name: "Big Mo", type: "fighting" as PokemonType, location: "Antisis City", level: "48-52" },
  { badge: 6, name: "Tessy", type: "water" as PokemonType, location: "Polder Town", level: "53-57" },
  { badge: 7, name: "Benjamin", type: "bug" as PokemonType, location: "Redwood Village", level: "58-61" },
];

function NextObjective({ badgeCount }: { badgeCount: number }) {
  if (badgeCount >= 8) {
    return (
      <div className="font-mono text-xs text-gba-text-dim">
        All gym badges obtained. Head to the Pokemon League!
      </div>
    );
  }

  const nextGym = GYM_SEQUENCE[badgeCount];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-pixel text-[8px] text-gba-text">
            GYM {badgeCount + 1}: {nextGym.location.toUpperCase()}
          </div>
          <div className="font-mono text-[10px] text-gba-text-dim mt-0.5">
            Leader {nextGym.name}
          </div>
        </div>
        <TypeBadge type={nextGym.type} size="md" />
      </div>
      <div className="flex items-center gap-2">
        <span className="font-pixel text-[7px] text-gba-text-dim">
          REC LV:
        </span>
        <HpBar value={parseInt(nextGym.level)} max={70} color="cyan" />
        <span className="font-pixel text-[7px] text-gba-text-dim">
          {nextGym.level}
        </span>
      </div>
    </div>
  );
}

function ActiveMissions() {
  const {
    inProgressMissions,
    getObjectiveStatus,
    toggleObjective,
    cycleStatus,
    getStatus,
  } = useMissions();

  if (inProgressMissions.length === 0) {
    return (
      <GbaPanel title="ACTIVE MISSIONS" headerColor="bg-gba-cyan/20 text-gba-cyan">
        <div className="text-center py-3">
          <div className="font-mono text-[10px] text-gba-text-dim">
            No active missions.
          </div>
          <Link
            href="/missions"
            className="inline-block mt-2 font-pixel text-[8px] text-gba-cyan hover:text-white transition-colors"
          >
            VIEW MISSION LOG &gt;
          </Link>
        </div>
      </GbaPanel>
    );
  }

  return (
    <GbaPanel title="ACTIVE MISSIONS" headerColor="bg-gba-cyan/20 text-gba-cyan">
      <div className="space-y-3">
        {inProgressMissions.map((mission) => {
          const objectives = getObjectiveStatus(mission.id, mission.objectives.length);
          const allDone = objectives.every(Boolean);

          return (
            <div key={mission.id} className="space-y-1.5">
              <div className="font-pixel text-[8px] text-gba-text">
                {mission.name.toUpperCase()}
              </div>

              {/* Objective checklist */}
              <div className="space-y-0.5 pl-1">
                {mission.objectives.map((objective, idx) => {
                  const isChecked = objectives[idx];
                  return (
                    <button
                      key={idx}
                      onClick={() =>
                        toggleObjective(mission.id, idx, mission.objectives.length)
                      }
                      className="flex items-start gap-2 min-h-[28px] w-full text-left cursor-pointer hover:bg-white/5 rounded-sm px-1 -mx-1"
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

              {/* Complete button */}
              {allDone && (
                <button
                  onClick={() => cycleStatus(mission.id)}
                  className="w-full font-pixel text-[8px] py-2 px-3 border-2 rounded-sm transition-colors min-h-[44px] border-gba-green text-gba-green hover:bg-white/5"
                >
                  COMPLETE
                </button>
              )}
            </div>
          );
        })}

        <Link
          href="/missions"
          className="block text-center font-pixel text-[7px] text-gba-text-dim hover:text-gba-cyan transition-colors pt-1"
        >
          VIEW ALL MISSIONS &gt;
        </Link>
      </div>
    </GbaPanel>
  );
}
