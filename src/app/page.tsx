"use client";

import { useProgress } from "@/hooks/useProgress";
import { useTeam } from "@/hooks/useTeam";
import { PageShell } from "@/components/layout/PageShell";
import { GbaPanel } from "@/components/ui/GbaPanel";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { HpBar } from "@/components/ui/HpBar";
import type { PokemonType } from "@/lib/types";
import { TYPE_COLORS } from "@/lib/constants";
import Link from "next/link";

export default function Dashboard() {
  const { completedMilestones, badgeCount, currentLocation } = useProgress();
  const { filledSlots } = useTeam();

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
                {/* Type color indicator */}
                <div
                  className="w-6 h-6 rounded-sm flex-shrink-0 flex items-center justify-center font-pixel text-[7px] text-white"
                  style={{
                    backgroundColor:
                      TYPE_COLORS[slot.types[0] as PokemonType] || "#888",
                  }}
                >
                  {slot.pokemonName.charAt(0)}
                </div>
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
        <StatCard label="QUESTS" value="--" color="green" />
        <StatCard label="DEX" value="--" color="blue" />
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

// Gym data for next objective preview
const GYM_SEQUENCE = [
  { badge: 0, name: "Mel", type: "fire" as PokemonType, location: "Dehara City", level: "18-19" },
  { badge: 1, name: "Tessy", type: "water" as PokemonType, location: "Seaport City", level: "28-29" },
  { badge: 2, name: "Roxanne", type: "rock" as PokemonType, location: "Vivill Town", level: "36-37" },
  { badge: 3, name: "Galavan", type: "electric" as PokemonType, location: "Antisis City", level: "42-43" },
  { badge: 4, name: "Miriam", type: "fairy" as PokemonType, location: "Serenity Isle", level: "48-49" },
  { badge: 5, name: "Gail", type: "flying" as PokemonType, location: "Crater Town", level: "54-55" },
  { badge: 6, name: "Hector", type: "ice" as PokemonType, location: "Frozen Heights", level: "60-61" },
  { badge: 7, name: "Zeph", type: "dragon" as PokemonType, location: "Crystal Peak", level: "66-67" },
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
