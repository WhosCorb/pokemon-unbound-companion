"use client";

import { useState, useMemo } from "react";
import { useTeam } from "@/hooks/useTeam";
import { useProgress } from "@/hooks/useProgress";
import { GbaPanel } from "@/components/ui/GbaPanel";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { PokemonSprite } from "@/components/ui/PokemonSprite";
import { TYPE_COLORS, ALL_TYPES, STAT_LABELS } from "@/lib/constants";
import {
  getTeamOffensiveCoverage,
  getEffectivenessAgainst,
} from "@/lib/type-calc";
import {
  recommendNature,
  recommendMoveset,
  scoreMoveForPokemon,
  findWeakestLink,
  computeBattleStrategy,
  getNextEncounter,
} from "@/lib/recommendations";
import type { PokemonType, Pokemon, Trainer, Difficulty, TeamSlot } from "@/lib/types";
import pokemonData from "../../../data/pokemon.json";
import trainersData from "../../../data/trainers.json";

const allPokemon = pokemonData as Pokemon[];
const trainers = trainersData as Trainer[];

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

// Build lookup for pokemonId -> dexNumber
const pokemonDexLookup = new Map<string, number>();
for (const p of allPokemon) {
  if (p.dexNumber > 0) {
    pokemonDexLookup.set(p.id, p.dexNumber);
  }
}

type Tab = "upcoming" | "coverage" | "gym-prep" | "strategy";

export function RecommendationsPanel() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const { filledSlots, teamTypes } = useTeam();

  if (filledSlots.length === 0) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "upcoming", label: "UPCOMING" },
    { key: "coverage", label: "COVERAGE" },
    { key: "gym-prep", label: "GYM PREP" },
    { key: "strategy", label: "STRATEGY" },
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
      {tab === "strategy" && <StrategyTab />}
    </GbaPanel>
  );
}

// ──────────────────────────────────────────────
// UPCOMING Tab (Phase 6)
// ──────────────────────────────────────────────

function UpcomingTab() {
  const { filledSlots, teamTypes } = useTeam();

  return (
    <div className="space-y-3">
      {filledSlots.map((slot) => {
        const pokemon = allPokemon.find((p) => p.id === slot.pokemonId);
        if (!pokemon) return null;

        // Find next evolution(s)
        const evoChain = pokemon.evolutionChain;
        const currentIdx = evoChain.findIndex((e) => e.pokemonId === slot.pokemonId);

        // Get the immediate next evolution (index currentIdx + 1)
        const nextEvo = currentIdx >= 0 && currentIdx < evoChain.length - 1
          ? evoChain[currentIdx + 1]
          : null;

        // Detect branching: check if any evolution method mentions gender
        // (gender-based branching like Kirlia -> Gardevoir/Gallade)
        const genderEvos = currentIdx >= 0
          ? evoChain.filter((e, i) => {
              if (i <= currentIdx) return false;
              const m = e.method.toLowerCase();
              return m.includes("male") || m.includes("female");
            })
          : [];
        const hasBranch = genderEvos.length >= 2;
        const nextEvos = hasBranch ? genderEvos : nextEvo ? [nextEvo] : [];

        // Find next learnable moves (by level, after current level)
        const upcomingMoves = pokemon.learnset
          .filter(
            (m) =>
              m.source === "level-up" &&
              m.level != null &&
              m.level > slot.level
          )
          .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
          .slice(0, 5);

        if (nextEvos.length === 0 && upcomingMoves.length === 0) return null;

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

            {/* Evolution info */}
            {hasBranch ? (
              <div className="ml-7 bg-gba-yellow/5 border border-gba-yellow/20 px-2 py-1 rounded-sm">
                <div className="font-pixel text-[7px] text-gba-yellow mb-0.5">
                  DECISION:
                </div>
                {nextEvos.map((evo) => {
                  const isGenderRelevant =
                    slot.gender &&
                    evo.method.toLowerCase().includes(slot.gender);
                  return (
                    <div
                      key={evo.pokemonId}
                      className={`font-mono text-[9px] ${
                        isGenderRelevant
                          ? "text-gba-cyan"
                          : "text-gba-text-dim"
                      }`}
                    >
                      {evo.pokemonName} ({evo.method})
                      {isGenderRelevant && (
                        <span className="font-pixel text-[6px] text-gba-cyan ml-1">
                          YOUR PATH
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : nextEvos.length === 1 ? (
              <div className="ml-7 font-pixel text-[7px] text-gba-cyan">
                Evolves: {nextEvos[0].method} -&gt; {nextEvos[0].pokemonName}
              </div>
            ) : null}

            {/* Upcoming moves with LEARN/SKIP tags */}
            {upcomingMoves.length > 0 && (
              <div className="ml-7 space-y-0.5">
                {upcomingMoves.map((m) => {
                  const isStab = pokemon.types.includes(m.type);
                  const moveScore = scoreMoveForPokemon(m, pokemon, teamTypes);

                  // Compare against current moveset
                  const currentMoves = (slot.moveData ?? []).map((cm) => {
                    const fullMove = pokemon.learnset.find(
                      (lm) => lm.name === cm.name
                    );
                    return fullMove
                      ? scoreMoveForPokemon(fullMove, pokemon, teamTypes)
                      : 0;
                  });
                  const worstCurrentScore =
                    currentMoves.length > 0
                      ? Math.min(...currentMoves)
                      : 0;
                  const shouldLearn =
                    currentMoves.length < 4 || moveScore > worstCurrentScore;
                  const worstMoveName =
                    shouldLearn && slot.moveData && slot.moveData.length >= 4
                      ? slot.moveData[
                          currentMoves.indexOf(
                            Math.min(...currentMoves)
                          )
                        ]?.name
                      : null;

                  return (
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
                      {isStab && (
                        <span className="font-pixel text-[5px] text-gba-green">
                          STAB
                        </span>
                      )}
                      {m.power && (
                        <span className="text-gba-text-dim/60">
                          {m.category === "physical"
                            ? "PHY"
                            : m.category === "special"
                              ? "SPC"
                              : "STA"}{" "}
                          {m.power}
                        </span>
                      )}
                      <span
                        className={`font-pixel text-[5px] ml-auto flex-shrink-0 ${
                          shouldLearn
                            ? "text-gba-green"
                            : "text-gba-text-dim/40"
                        }`}
                      >
                        {shouldLearn
                          ? worstMoveName
                            ? `LEARN -- replace ${worstMoveName}`
                            : "LEARN"
                          : "SKIP"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────
// COVERAGE GAPS Tab (Phases 3-5)
// ──────────────────────────────────────────────

interface CoverageSuggestion {
  gap: PokemonType;
  pokemon: Pokemon;
  replaceSlotName?: string;
  bestLocation?: { name: string; method: string; rate: number };
}

function CoverageTab({ teamTypes }: { teamTypes: PokemonType[][] }) {
  const { isUnlocked, completedMilestones } = useProgress();
  const { filledSlots } = useTeam();

  const coverage = useMemo(
    () => getTeamOffensiveCoverage(teamTypes),
    [teamTypes]
  );

  // Types where team has no super-effective STAB coverage
  const gaps = ALL_TYPES.filter((t) => coverage[t] <= 1);

  // Compute the "weakest link" team member
  const weakestIdx = useMemo(
    () => (filledSlots.length >= 6 ? findWeakestLink(teamTypes, ALL_TYPES) : -1),
    [teamTypes, filledSlots.length]
  );
  const weakestName = weakestIdx >= 0 ? filledSlots[weakestIdx]?.pokemonName : undefined;

  // For each gap, suggest a Pokemon that covers it
  const suggestions = useMemo(() => {
    const result: CoverageSuggestion[] = [];
    const alreadySuggested = new Set(filledSlots.map((s) => s.pokemonId));

    for (const gapType of gaps.slice(0, 5)) {
      const candidates = allPokemon.filter((p) => {
        if (alreadySuggested.has(p.id)) return false;
        if (!isUnlocked(p.milestoneRequired)) return false;
        return p.types.some(
          (atkType) =>
            getEffectivenessAgainst(atkType as PokemonType, [gapType]) > 1
        );
      });

      if (candidates.length === 0) continue;

      candidates.sort((a, b) => {
        const aLocations = a.catchLocations.filter((loc) =>
          isUnlocked(loc.milestoneRequired)
        ).length;
        const bLocations = b.catchLocations.filter((loc) =>
          isUnlocked(loc.milestoneRequired)
        ).length;

        if (aLocations > 0 && bLocations === 0) return -1;
        if (bLocations > 0 && aLocations === 0) return 1;
        if (aLocations !== bLocations) return bLocations - aLocations;

        const aBst =
          a.baseStats.hp + a.baseStats.attack + a.baseStats.defense +
          a.baseStats.spAttack + a.baseStats.spDefense + a.baseStats.speed;
        const bBst =
          b.baseStats.hp + b.baseStats.attack + b.baseStats.defense +
          b.baseStats.spAttack + b.baseStats.spDefense + b.baseStats.speed;
        return bBst - aBst;
      });

      const best = candidates[0];

      // Find best accessible catch location
      const accessibleLocations = best.catchLocations
        .filter((loc) => isUnlocked(loc.milestoneRequired))
        .sort((a, b) => b.rate - a.rate);
      const bestLocation = accessibleLocations[0]
        ? {
            name: accessibleLocations[0].locationName,
            method: accessibleLocations[0].method,
            rate: accessibleLocations[0].rate,
          }
        : undefined;

      result.push({
        gap: gapType,
        pokemon: best,
        replaceSlotName: weakestName,
        bestLocation,
      });
      alreadySuggested.add(best.id);
    }

    return result;
  }, [gaps, isUnlocked, filledSlots, weakestName]);

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
          <div className="space-y-2">
            {suggestions.map(({ gap, pokemon, replaceSlotName, bestLocation }) => {
              const nature = recommendNature(pokemon);
              const avgLevel = filledSlots.length > 0
                ? Math.round(filledSlots.reduce((sum, s) => sum + s.level, 0) / filledSlots.length)
                : 50;
              const moveset = recommendMoveset(
                pokemon,
                avgLevel,
                teamTypes,
                completedMilestones
              );

              return (
                <div
                  key={gap}
                  className="bg-gba-bg/40 rounded-sm p-2 space-y-1"
                >
                  {/* Pokemon header row */}
                  <div className="flex items-center gap-2">
                    <PokemonSprite
                      dexNumber={pokemon.dexNumber}
                      name={pokemon.name}
                      primaryType={pokemon.types[0]}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-[9px] text-gba-text truncate block">
                        {pokemon.name}
                      </span>
                      <div className="flex gap-0.5 mt-0.5">
                        {pokemon.types.map((t) => (
                          <TypeBadge key={t} type={t} abbreviated />
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-pixel text-[6px] text-gba-text-dim">
                        covers{" "}
                        <span style={{ color: TYPE_COLORS[gap] }}>
                          {gap.toUpperCase()}
                        </span>
                      </span>
                      {replaceSlotName && filledSlots.length >= 6 && (
                        <div className="font-pixel text-[5px] text-gba-yellow">
                          swap {replaceSlotName.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Catch location */}
                  <div className="font-mono text-[8px] text-gba-text-dim">
                    {bestLocation ? (
                      <>
                        {bestLocation.name} ({bestLocation.method})
                        {bestLocation.rate > 0 && (
                          <span className="ml-1 text-gba-text-dim/60">
                            {bestLocation.rate}%
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gba-text-dim/40">
                        Not catchable yet
                      </span>
                    )}
                  </div>

                  {/* Nature recommendation */}
                  <div className="font-mono text-[8px] text-gba-cyan">
                    Nature: {nature.name}
                    {nature.increased && nature.decreased && (
                      <span className="text-gba-text-dim ml-1">
                        (+{STAT_LABELS[nature.increased as keyof typeof STAT_LABELS]}, -{STAT_LABELS[nature.decreased as keyof typeof STAT_LABELS]})
                      </span>
                    )}
                  </div>

                  {/* Recommended moves */}
                  {moveset.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {moveset.slice(0, 4).map((m) => (
                        <span
                          key={m.name}
                          className="inline-flex items-center gap-0.5 font-mono text-[7px] text-gba-text-dim"
                        >
                          <span
                            className="inline-block w-1 h-1 rounded-full flex-shrink-0"
                            style={{ backgroundColor: TYPE_COLORS[m.type] }}
                          />
                          {m.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// GYM PREP Tab (Phase 8b: type quick reference)
// ──────────────────────────────────────────────

const GYM_SEQUENCE: {
  name: string;
  type: PokemonType;
  location: string;
  badge: number;
  gymId: string;
}[] = [
  { badge: 0, name: "Mirskle", type: "grass", location: "Dresco Town", gymId: "gym_1_mirskle" },
  { badge: 1, name: "Vega", type: "dark", location: "Crater Town", gymId: "gym_2_vega" },
  { badge: 2, name: "Alice", type: "flying", location: "Blizzard City", gymId: "gym_3_alice" },
  { badge: 3, name: "Mel", type: "normal", location: "Fallshore City", gymId: "gym_4_mel" },
  { badge: 4, name: "Galavan", type: "electric", location: "Dehara City", gymId: "gym_5_galavan" },
  { badge: 5, name: "Big Mo", type: "fighting", location: "Antisis City", gymId: "gym_6_big_mo" },
  { badge: 6, name: "Tessy", type: "water", location: "Polder Town", gymId: "gym_7_tessy" },
  { badge: 7, name: "Benjamin", type: "bug", location: "Redwood Village", gymId: "gym_8_benjamin" },
];

function GymPrepTab() {
  const { filledSlots } = useTeam();
  const { badgeCount, difficulty } = useProgress();

  const nextGym = GYM_SEQUENCE[badgeCount];

  // Resolve gym leader's actual Pokemon team from trainers.json
  const gymTrainer = nextGym
    ? trainers.find((t) => t.id === nextGym.gymId)
    : null;
  const gymTeam = useMemo(() => {
    if (!gymTrainer) return [];
    const difficultyOrder: Difficulty[] = [difficulty, "insane", "expert", "difficult", "vanilla"];
    for (const d of difficultyOrder) {
      const team = gymTrainer.teams[d];
      if (team && team.length > 0) return team;
    }
    return [];
  }, [gymTrainer, difficulty]);

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

  // Type quick reference: which types are SE against gym type and vice versa
  const seAgainstGym = ALL_TYPES.filter(
    (t) => getEffectivenessAgainst(t, [nextGym.type]) > 1
  );
  const gymSeAgainst = ALL_TYPES.filter(
    (t) => getEffectivenessAgainst(nextGym.type, [t]) > 1
  );

  // Analyze each team member vs the gym type
  const matchups = filledSlots.map((slot) => {
    const memberTypes = slot.types as PokemonType[];

    let bestOffense = 1;
    for (const atkType of memberTypes) {
      const eff = getEffectivenessAgainst(atkType, [nextGym.type]);
      if (eff > bestOffense) bestOffense = eff;
    }

    const defEff = getEffectivenessAgainst(nextGym.type, memberTypes);

    let verdict: "strong" | "neutral" | "risky";
    if (bestOffense >= 2 && defEff <= 1) verdict = "strong";
    else if (defEff >= 2) verdict = "risky";
    else verdict = "neutral";

    return { slot, bestOffense, defEff, verdict };
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

      {/* Type quick reference (Phase 8b) */}
      <div className="bg-gba-bg/40 rounded-sm p-2 space-y-1">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-pixel text-[6px] text-gba-green flex-shrink-0">
            SE vs {nextGym.type.toUpperCase()}:
          </span>
          {seAgainstGym.map((t) => (
            <TypeBadge key={t} type={t} abbreviated />
          ))}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-pixel text-[6px] text-gba-red flex-shrink-0">
            {nextGym.type.toUpperCase()} SE vs:
          </span>
          {gymSeAgainst.length > 0 ? (
            gymSeAgainst.map((t) => (
              <TypeBadge key={t} type={t} abbreviated />
            ))
          ) : (
            <span className="font-pixel text-[6px] text-gba-text-dim">
              None
            </span>
          )}
        </div>
      </div>

      {/* Gym leader's actual Pokemon team */}
      {gymTeam.length > 0 && (
        <div className="space-y-1">
          <div className="font-pixel text-[7px] text-gba-text-dim">
            {nextGym.name.toUpperCase()}&apos;S TEAM:
          </div>
          <div className="grid grid-cols-2 gap-1">
            {gymTeam.map((gp) => (
              <div
                key={gp.pokemonId}
                className="flex items-center gap-1.5 px-1.5 py-1 rounded-sm bg-gba-panel/60"
              >
                <PokemonSprite
                  dexNumber={pokemonDexLookup.get(gp.pokemonId)}
                  name={gp.pokemonName}
                  primaryType={(gp.types as PokemonType[])[0]}
                  size="sm"
                  className="w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[8px] text-gba-text truncate">
                    {gp.pokemonName}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className="font-pixel text-[5px] text-gba-text-dim">
                      Lv{gp.level}
                    </span>
                    {(gp.types as PokemonType[]).map((t) => (
                      <TypeBadge key={t} type={t} abbreviated />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

// ──────────────────────────────────────────────
// STRATEGY Tab
// ──────────────────────────────────────────────

function StrategyTab() {
  const { filledSlots } = useTeam();
  const { completedMilestones, badgeCount, difficulty } = useProgress();

  const encounter = useMemo(
    () => getNextEncounter(trainers, completedMilestones, badgeCount, difficulty),
    [completedMilestones, badgeCount, difficulty]
  );

  const strategy = useMemo(() => {
    if (!encounter) return null;
    return computeBattleStrategy(
      encounter.trainer,
      encounter.team,
      filledSlots,
      allPokemon
    );
  }, [encounter, filledSlots]);

  if (!encounter || !strategy) {
    return (
      <div className="text-center py-3">
        <div className="font-pixel text-[8px] text-gba-text-dim">
          No upcoming battles found.
        </div>
        <div className="font-mono text-[9px] text-gba-text-dim/60 mt-1">
          Mark progress milestones to see battle strategies.
        </div>
      </div>
    );
  }

  const { trainer, assignments, leadPokemon, notes } = strategy;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="font-pixel text-[8px] text-gba-text">
          NEXT: {trainer.title.toUpperCase()} -- {trainer.name.toUpperCase()}
        </div>
        {trainer.specialtyType && (
          <TypeBadge type={trainer.specialtyType} />
        )}
      </div>

      {/* Lead recommendation */}
      <div className="flex items-center gap-1.5 bg-gba-cyan/5 border border-gba-cyan/20 px-2 py-1 rounded-sm">
        <span className="font-pixel text-[7px] text-gba-cyan flex-shrink-0">LEAD:</span>
        <PokemonSprite
          dexNumber={leadPokemon.dexNumber}
          name={leadPokemon.pokemonName}
          primaryType={leadPokemon.types[0]}
          size="sm"
        />
        <span className="font-mono text-[9px] text-gba-cyan">
          {leadPokemon.pokemonName}
        </span>
      </div>

      {/* Per-opponent assignments */}
      <div className="space-y-1.5">
        {assignments.map((a, i) => {
          const opponentDex = pokemonDexLookup.get(a.opponentPokemon.pokemonId);
          const counterDex = a.counterSlot.dexNumber;

          const effLabel =
            a.offenseMultiplier >= 2 ? "2x" :
            a.offenseMultiplier >= 1.5 ? "1.5x" :
            a.offenseMultiplier <= 0.5 ? "0.5x" :
            a.offenseMultiplier === 1 ? "1x" :
            `${a.offenseMultiplier}x`;

          const speedLabel =
            a.speedComparison === "faster" ? "FASTER" :
            a.speedComparison === "slower" ? "SLOWER" : "??";

          const speedColor =
            a.speedComparison === "faster" ? "text-gba-green" :
            a.speedComparison === "slower" ? "text-gba-red" :
            "text-gba-text-dim";

          return (
            <div
              key={`${a.opponentPokemon.pokemonId}-${i}`}
              className="bg-gba-bg/40 rounded-sm p-2 space-y-1"
            >
              {/* VS line: opponent -> counter */}
              <div className="flex items-center gap-1.5">
                <span className="font-pixel text-[6px] text-gba-red flex-shrink-0">VS</span>
                <PokemonSprite
                  dexNumber={opponentDex}
                  name={a.opponentPokemon.pokemonName}
                  primaryType={(a.opponentPokemon.types as PokemonType[])[0]}
                  size="sm"
                  className="w-4 h-4"
                />
                <div className="flex-shrink-0">
                  <span className="font-mono text-[8px] text-gba-text">
                    {a.opponentPokemon.pokemonName}
                  </span>
                  <span className="font-pixel text-[5px] text-gba-text-dim ml-1">
                    Lv{a.opponentPokemon.level}
                  </span>
                </div>
                <span className="font-pixel text-[6px] text-gba-text-dim mx-0.5">
                  &gt;
                </span>
                <PokemonSprite
                  dexNumber={counterDex}
                  name={a.counterSlot.pokemonName}
                  primaryType={a.counterSlot.types[0]}
                  size="sm"
                  className="w-4 h-4"
                />
                <span className="font-mono text-[8px] text-gba-cyan">
                  {a.counterSlot.pokemonName}
                </span>
              </div>

              {/* Move + effectiveness + speed */}
              <div className="flex items-center gap-1 ml-5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: TYPE_COLORS[a.moveType] }}
                />
                <span className="font-mono text-[8px] text-gba-text-dim">
                  {a.recommendedMove}
                </span>
                <span className={`font-pixel text-[6px] ${
                  a.offenseMultiplier >= 2 ? "text-gba-green" :
                  a.offenseMultiplier <= 0.5 ? "text-gba-red" :
                  "text-gba-text-dim"
                }`}>
                  {effLabel}
                </span>
                <span className={`font-pixel text-[5px] ml-auto ${speedColor}`}>
                  {speedLabel}
                </span>
              </div>

              {/* Dangerous moves warning */}
              {a.dangerousMoves.length > 0 && (
                <div className="flex items-center gap-1 ml-5">
                  <span className="font-pixel text-[6px] text-gba-yellow flex-shrink-0">
                    WATCH:
                  </span>
                  <span className="font-mono text-[7px] text-gba-yellow/80">
                    {a.dangerousMoves.join(", ")}
                  </span>
                </div>
              )}

              {/* Backup */}
              {a.backupSlot && (
                <div className="flex items-center gap-1 ml-5">
                  <span className="font-pixel text-[5px] text-gba-text-dim/60 flex-shrink-0">
                    BACKUP:
                  </span>
                  <span className="font-mono text-[7px] text-gba-text-dim/60">
                    {a.backupSlot.pokemonName}
                    {a.backupMove && ` (${a.backupMove})`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Notes */}
      {notes.length > 0 && (
        <div className="bg-gba-yellow/5 border border-gba-yellow/20 px-2 py-1.5 rounded-sm space-y-0.5">
          <div className="font-pixel text-[6px] text-gba-yellow">NOTES:</div>
          {notes.map((note, i) => (
            <div key={i} className="font-mono text-[8px] text-gba-yellow/80">
              {note}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
