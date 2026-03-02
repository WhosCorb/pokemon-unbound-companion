"use client";

import { useMemo } from "react";
import type { PokemonType, Difficulty, TrainerPokemon, Trainer } from "@/lib/types";
import { TYPE_COLORS } from "@/lib/constants";
import { getEffectivenessAgainst } from "@/lib/type-calc";
import { GbaPanel } from "@/components/ui/GbaPanel";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { useProgress } from "@/hooks/useProgress";
import { useTeam } from "@/hooks/useTeam";
import trainersData from "../../../data/trainers.json";

const trainers = trainersData as Trainer[];

// Ordered gym leader IDs by badge number
const GYM_ORDER = [
  "gym_1_mel",
  "gym_2_tessy",
  "gym_3_roxanne",
  "gym_4_galavan",
  "gym_5_miriam",
  "gym_6_gail",
  "gym_7_hector",
  "gym_8_zeph",
];

export function CounterAnalysis() {
  const { badgeCount, difficulty } = useProgress();
  const { filledSlots } = useTeam();

  // Determine the next gym based on badge count
  const nextGymId = badgeCount < 8 ? GYM_ORDER[badgeCount] : null;
  const nextGym = nextGymId
    ? trainers.find((t) => t.id === nextGymId)
    : null;

  // Get the gym leader's team for the current difficulty, falling back through difficulties
  const gymTeam = useMemo(() => {
    if (!nextGym) return [];
    const difficultyOrder: Difficulty[] = [difficulty, "expert", "difficult", "normal", "easy"];
    for (const d of difficultyOrder) {
      const team = nextGym.teams[d];
      if (team && team.length > 0) return team;
    }
    return [];
  }, [nextGym, difficulty]);

  // Compute matchups: for each gym Pokemon, which team members are strong/weak
  const matchups = useMemo(() => {
    if (gymTeam.length === 0 || filledSlots.length === 0) return [];

    return gymTeam.map((gymPoke) => {
      const gymTypes = gymPoke.types as PokemonType[];
      const memberResults = filledSlots.map((member) => {
        // Check how well each team member hits the gym Pokemon (STAB)
        let bestOffense = 1;
        for (const memberType of member.types) {
          const eff = getEffectivenessAgainst(
            memberType as PokemonType,
            gymTypes
          );
          if (eff > bestOffense) bestOffense = eff;
        }

        // Check how well the gym Pokemon hits this team member
        let worstDefense = 1;
        for (const gymType of gymTypes) {
          const eff = getEffectivenessAgainst(
            gymType,
            member.types as PokemonType[]
          );
          if (eff > worstDefense) worstDefense = eff;
        }

        return {
          pokemonName: member.pokemonName,
          types: member.types,
          offensiveEff: bestOffense,
          defensiveEff: worstDefense,
        };
      });

      return {
        gymPokemon: gymPoke,
        memberResults,
      };
    });
  }, [gymTeam, filledSlots]);

  if (badgeCount >= 8) {
    return (
      <GbaPanel
        title="GYM MATCHUP"
        headerColor="bg-gba-yellow/20 text-gba-yellow"
      >
        <div className="text-center py-4">
          <p className="font-pixel text-[8px] text-gba-yellow">
            ALL BADGES OBTAINED
          </p>
          <p className="font-mono text-[10px] text-gba-text-dim mt-1">
            Head to the Pokemon League for the final challenge.
          </p>
        </div>
      </GbaPanel>
    );
  }

  if (!nextGym) {
    return null;
  }

  return (
    <GbaPanel
      title={`VS ${nextGym.name.toUpperCase()} -- GYM ${badgeCount + 1}`}
      headerColor="bg-gba-yellow/20 text-gba-yellow"
    >
      <div className="space-y-3">
        {/* Gym leader info */}
        <div className="flex items-center gap-2 pb-2 border-b border-gba-border/40">
          <div className="flex-1">
            <div className="font-pixel text-[8px] text-gba-text">
              {nextGym.title.toUpperCase()} {nextGym.name.toUpperCase()}
            </div>
            {nextGym.specialtyType && (
              <div className="mt-1">
                <TypeBadge
                  type={nextGym.specialtyType}
                  size="md"
                />
              </div>
            )}
          </div>
          <div className="font-pixel text-[7px] text-gba-text-dim text-right">
            {gymTeam.length} PKM
          </div>
        </div>

        {/* No team members */}
        {filledSlots.length === 0 ? (
          <div className="text-center py-3">
            <p className="font-pixel text-[7px] text-gba-text-dim">
              ADD POKEMON TO SEE MATCHUPS
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {matchups.map(({ gymPokemon, memberResults }) => (
              <GymPokemonMatchup
                key={gymPokemon.pokemonId}
                gymPokemon={gymPokemon}
                memberResults={memberResults}
              />
            ))}
          </div>
        )}
      </div>
    </GbaPanel>
  );
}

function GymPokemonMatchup({
  gymPokemon,
  memberResults,
}: {
  gymPokemon: TrainerPokemon;
  memberResults: {
    pokemonName: string;
    types: PokemonType[] | string[];
    offensiveEff: number;
    defensiveEff: number;
  }[];
}) {
  const gymTypes = gymPokemon.types as PokemonType[];
  const primaryColor = TYPE_COLORS[gymTypes[0]] || "#888";

  return (
    <div className="bg-gba-bg/40 rounded-sm p-2 space-y-2">
      {/* Gym Pokemon header */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-sm flex-shrink-0 flex items-center justify-center font-pixel text-[8px] text-white"
          style={{ backgroundColor: primaryColor }}
        >
          {gymPokemon.pokemonName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-xs text-gba-text">
            {gymPokemon.pokemonName}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="font-pixel text-[6px] text-gba-text-dim">
              Lv{gymPokemon.level}
            </span>
            {gymTypes.map((t) => (
              <TypeBadge key={t} type={t} abbreviated />
            ))}
          </div>
        </div>
      </div>

      {/* Team member matchups */}
      <div className="grid grid-cols-2 gap-1">
        {memberResults.map((result) => {
          const isSuperEffective = result.offensiveEff >= 2;
          const isWeak = result.defensiveEff >= 2;

          let indicatorClass: string;
          let indicatorLabel: string;
          if (isSuperEffective && !isWeak) {
            indicatorClass = "text-green-400";
            indicatorLabel = "STRONG";
          } else if (isSuperEffective && isWeak) {
            indicatorClass = "text-yellow-400";
            indicatorLabel = "TRADE";
          } else if (isWeak) {
            indicatorClass = "text-red-400";
            indicatorLabel = "WEAK";
          } else {
            indicatorClass = "text-gba-text-dim";
            indicatorLabel = "NEUTRAL";
          }

          return (
            <div
              key={result.pokemonName}
              className="flex items-center gap-1.5 px-1.5 py-1 rounded-sm bg-gba-panel/60"
            >
              <div
                className="w-4 h-4 rounded-sm flex-shrink-0 flex items-center justify-center font-pixel text-[5px] text-white"
                style={{
                  backgroundColor:
                    TYPE_COLORS[result.types[0] as PokemonType] || "#888",
                }}
              >
                {result.pokemonName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[9px] text-gba-text truncate">
                  {result.pokemonName}
                </div>
              </div>
              <span className={`font-pixel text-[5px] flex-shrink-0 ${indicatorClass}`}>
                {indicatorLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
