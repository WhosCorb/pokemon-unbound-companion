"use client";

import { useState, useMemo } from "react";
import { useTeam } from "@/hooks/useTeam";
import { useProgress } from "@/hooks/useProgress";
import { GbaPanel } from "@/components/ui/GbaPanel";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { PokemonSprite } from "@/components/ui/PokemonSprite";
import { TYPE_COLORS, ALL_TYPES } from "@/lib/constants";
import {
  getTeamOffensiveCoverage,
  getEffectivenessAgainst,
} from "@/lib/type-calc";
import type { PokemonType, Pokemon, LearnsetMove } from "@/lib/types";
import pokemonData from "../../../data/pokemon.json";

const allPokemon = pokemonData as Pokemon[];

type Tab = "upcoming" | "coverage" | "gym-prep";

export function RecommendationsPanel() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const { filledSlots, teamTypes } = useTeam();

  if (filledSlots.length === 0) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "upcoming", label: "UPCOMING" },
    { key: "coverage", label: "COVERAGE" },
    { key: "gym-prep", label: "GYM PREP" },
  ];

  return (
    <GbaPanel
      title="RECOMMENDATIONS"
      headerColor="bg-gba-yellow/20 text-gba-yellow"
    >
      {/* Tab bar */}
      <div className="flex gap-1 mb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 font-pixel text-[7px] py-1 border rounded-sm transition-colors ${
              tab === t.key
                ? "border-gba-yellow bg-gba-yellow/10 text-gba-yellow"
                : "border-gba-border text-gba-text-dim hover:border-gba-border-light"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "upcoming" && <UpcomingTab />}
      {tab === "coverage" && <CoverageTab teamTypes={teamTypes} />}
      {tab === "gym-prep" && <GymPrepTab />}
    </GbaPanel>
  );
}

// ──────────────────────────────────────────────
// UPCOMING Tab
// ──────────────────────────────────────────────

function UpcomingTab() {
  const { filledSlots } = useTeam();

  return (
    <div className="space-y-3">
      {filledSlots.map((slot) => {
        const pokemon = allPokemon.find((p) => p.id === slot.pokemonId);
        if (!pokemon) return null;

        // Find next evolution
        const evoChain = pokemon.evolutionChain;
        const currentIdx = evoChain.findIndex((e) => e.pokemonId === slot.pokemonId);
        const nextEvo = currentIdx >= 0 && currentIdx < evoChain.length - 1
          ? evoChain[currentIdx + 1]
          : null;

        // Find next learnable moves (by level, after current level)
        const upcomingMoves = pokemon.learnset
          .filter(
            (m) =>
              m.source === "level-up" &&
              m.level != null &&
              m.level > slot.level
          )
          .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
          .slice(0, 3);

        if (!nextEvo && upcomingMoves.length === 0) return null;

        return (
          <div key={slot.pokemonId} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <PokemonSprite
                dexNumber={slot.dexNumber}
                name={slot.pokemonName}
                primaryType={slot.types[0]}
                size="sm"
              />
              <span className="font-mono text-[10px] text-gba-text">
                {slot.pokemonName}
              </span>
            </div>

            {nextEvo && (
              <div className="ml-7 font-pixel text-[7px] text-gba-cyan">
                Evolves: {nextEvo.method} -&gt; {nextEvo.pokemonName}
              </div>
            )}

            {upcomingMoves.length > 0 && (
              <div className="ml-7 space-y-0.5">
                {upcomingMoves.map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center gap-1 font-mono text-[9px] text-gba-text-dim"
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: TYPE_COLORS[m.type] }}
                    />
                    <span>
                      Lv{m.level}: {m.name}
                    </span>
                    {m.power && (
                      <span className="text-gba-text-dim/60 ml-auto">
                        {m.category === "physical" ? "PHY" : m.category === "special" ? "SPC" : "STA"} {m.power}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────
// COVERAGE GAPS Tab
// ──────────────────────────────────────────────

function CoverageTab({ teamTypes }: { teamTypes: PokemonType[][] }) {
  const { isUnlocked } = useProgress();

  const coverage = useMemo(
    () => getTeamOffensiveCoverage(teamTypes),
    [teamTypes]
  );

  // Types where team has no super-effective STAB coverage
  const gaps = ALL_TYPES.filter((t) => coverage[t] <= 1);

  // For each gap, suggest a Pokemon that covers it and is available
  const suggestions = useMemo(() => {
    const result: { gap: PokemonType; pokemon: Pokemon }[] = [];

    for (const gapType of gaps.slice(0, 5)) {
      // Find Pokemon with STAB that's SE against the gap type
      const candidate = allPokemon.find((p) => {
        if (!isUnlocked(p.milestoneRequired)) return false;
        return p.types.some(
          (atkType) =>
            getEffectivenessAgainst(atkType as PokemonType, [gapType]) > 1
        );
      });
      if (candidate) {
        result.push({ gap: gapType, pokemon: candidate });
      }
    }

    return result;
  }, [gaps, isUnlocked]);

  if (gaps.length === 0) {
    return (
      <div className="text-center py-3">
        <div className="font-pixel text-[8px] text-gba-green">
          FULL STAB COVERAGE
        </div>
        <div className="font-mono text-[9px] text-gba-text-dim mt-1">
          Your team covers all 18 types with super-effective STAB.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="font-pixel text-[7px] text-gba-red">
        NO SE STAB AGAINST:
      </div>
      <div className="flex flex-wrap gap-1">
        {gaps.map((t) => (
          <TypeBadge key={t} type={t} abbreviated />
        ))}
      </div>

      {suggestions.length > 0 && (
        <>
          <div className="font-pixel text-[7px] text-gba-text-dim mt-2">
            SUGGESTIONS:
          </div>
          <div className="space-y-1">
            {suggestions.map(({ gap, pokemon }) => (
              <div
                key={gap}
                className="flex items-center gap-2 py-1"
              >
                <PokemonSprite
                  dexNumber={pokemon.dexNumber}
                  name={pokemon.name}
                  primaryType={pokemon.types[0]}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[9px] text-gba-text truncate">
                    {pokemon.name}
                  </span>
                  <div className="flex gap-0.5 mt-0.5">
                    {pokemon.types.map((t) => (
                      <TypeBadge key={t} type={t} abbreviated />
                    ))}
                  </div>
                </div>
                <span className="font-pixel text-[6px] text-gba-text-dim flex-shrink-0">
                  covers{" "}
                  <span style={{ color: TYPE_COLORS[gap] }}>
                    {gap.toUpperCase()}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// GYM PREP Tab
// ──────────────────────────────────────────────

const GYM_SEQUENCE: {
  name: string;
  type: PokemonType;
  location: string;
  badge: number;
}[] = [
  { badge: 0, name: "Mirskle", type: "grass", location: "Dresco Town" },
  { badge: 1, name: "Vega", type: "dark", location: "Crater Town" },
  { badge: 2, name: "Alice", type: "flying", location: "Blizzard City" },
  { badge: 3, name: "Mel", type: "normal", location: "Fallshore City" },
  { badge: 4, name: "Galavan", type: "electric", location: "Dehara City" },
  { badge: 5, name: "Big Mo", type: "fighting", location: "Antisis City" },
  { badge: 6, name: "Tessy", type: "water", location: "Polder Town" },
  { badge: 7, name: "Benjamin", type: "bug", location: "Redwood Village" },
];

function GymPrepTab() {
  const { filledSlots } = useTeam();
  const { badgeCount } = useProgress();

  const nextGym = GYM_SEQUENCE[badgeCount];

  if (!nextGym) {
    return (
      <div className="text-center py-3">
        <div className="font-pixel text-[8px] text-gba-green">
          ALL BADGES OBTAINED
        </div>
        <div className="font-mono text-[9px] text-gba-text-dim mt-1">
          Prepare for the Pokemon League.
        </div>
      </div>
    );
  }

  // Analyze each team member vs the gym type
  const matchups = filledSlots.map((slot) => {
    const pokemon = allPokemon.find((p) => p.id === slot.pokemonId);
    const memberTypes = slot.types as PokemonType[];

    // How does team member attack the gym type?
    let bestOffense = 1;
    for (const atkType of memberTypes) {
      const eff = getEffectivenessAgainst(atkType, [nextGym.type]);
      if (eff > bestOffense) bestOffense = eff;
    }

    // How does the gym type attack this member?
    const defEff = getEffectivenessAgainst(nextGym.type, memberTypes);

    let verdict: "strong" | "neutral" | "risky";
    if (bestOffense >= 2 && defEff <= 1) verdict = "strong";
    else if (defEff >= 2) verdict = "risky";
    else verdict = "neutral";

    return {
      slot,
      pokemon,
      bestOffense,
      defEff,
      verdict,
    };
  });

  const strong = matchups.filter((m) => m.verdict === "strong");
  const risky = matchups.filter((m) => m.verdict === "risky");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="font-pixel text-[8px] text-gba-text">
          GYM {badgeCount + 1}: {nextGym.name.toUpperCase()}
        </div>
        <TypeBadge type={nextGym.type} />
        <span className="font-pixel text-[6px] text-gba-text-dim ml-auto">
          {nextGym.location}
        </span>
      </div>

      {/* Team matchups */}
      <div className="space-y-1">
        {matchups.map(({ slot, bestOffense, defEff, verdict }) => (
          <div
            key={slot.pokemonId}
            className="flex items-center gap-2 py-1"
          >
            <PokemonSprite
              dexNumber={slot.dexNumber}
              name={slot.pokemonName}
              primaryType={slot.types[0]}
              size="sm"
            />
            <span className="font-mono text-[9px] text-gba-text truncate flex-1">
              {slot.pokemonName}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="font-pixel text-[6px] text-gba-text-dim">
                ATK {bestOffense}x
              </span>
              <span className="font-pixel text-[6px] text-gba-text-dim">
                DEF {defEff}x
              </span>
              <span
                className={`font-pixel text-[6px] px-1 py-0.5 rounded-sm border ${
                  verdict === "strong"
                    ? "text-gba-green border-gba-green/40"
                    : verdict === "risky"
                      ? "text-gba-red border-gba-red/40"
                      : "text-gba-text-dim border-gba-border"
                }`}
              >
                {verdict === "strong"
                  ? "GOOD"
                  : verdict === "risky"
                    ? "RISKY"
                    : "OK"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {strong.length === 0 && (
        <div className="font-pixel text-[7px] text-gba-red bg-gba-red/5 border border-gba-red/20 px-2 py-1.5 rounded-sm">
          No strong counters on team. Consider adding a Pokemon with SE STAB
          against {nextGym.type.toUpperCase()} type.
        </div>
      )}
      {risky.length >= 3 && (
        <div className="font-pixel text-[7px] text-gba-yellow bg-gba-yellow/5 border border-gba-yellow/20 px-2 py-1.5 rounded-sm">
          {risky.length} team members are at risk. Watch out for
          {" "}{nextGym.type.toUpperCase()} moves.
        </div>
      )}
    </div>
  );
}
