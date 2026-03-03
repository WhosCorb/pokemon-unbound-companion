"use client";

import { useMemo } from "react";
import type { PokemonType, Difficulty, TrainerPokemon, Trainer } from "@/lib/types";
import { TYPE_COLORS } from "@/lib/constants";
import { getEffectivenessAgainst } from "@/lib/type-calc";
import { GbaPanel } from "@/components/ui/GbaPanel";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { PokemonSprite } from "@/components/ui/PokemonSprite";
import { useProgress } from "@/hooks/useProgress";
import { useTeam } from "@/hooks/useTeam";
import trainersData from "../../../data/trainers.json";
import pokemonData from "../../../data/pokemon.json";
import type { Pokemon } from "@/lib/types";

const trainers = trainersData as Trainer[];
const allPokemon = pokemonData as Pokemon[];

// Build lookup map for pokemonId -> dexNumber
const pokemonDexLookup = new Map<string, number>();
for (const p of allPokemon) {
  if (p.dexNumber > 0) {
    pokemonDexLookup.set(p.id, p.dexNumber);
  }
}

// Ordered gym leader IDs by badge number (correct order per unboundwiki.com)
const GYM_ORDER = [
  "gym_1_mirskle",
  "gym_2_vega",
  "gym_3_alice",
  "gym_4_mel",
  "gym_5_galavan",
  "gym_6_big_mo",
  "gym_7_tessy",
  "gym_8_benjamin",
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
    const difficultyOrder: Difficulty[] = [difficulty, "insane", "expert", "difficult", "vanilla"];
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
          dexNumber: member.dexNumber,
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
    dexNumber?: number;
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
        <PokemonSprite
          dexNumber={pokemonDexLookup.get(gymPokemon.pokemonId)}
          name={gymPokemon.pokemonName}
          primaryType={gymTypes[0]}
          size="md"
        />
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
              <PokemonSprite
                dexNumber={result.dexNumber}
                name={result.pokemonName}
                primaryType={result.types[0] as PokemonType}
                size="sm"
                className="w-4 h-4"
              />
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
