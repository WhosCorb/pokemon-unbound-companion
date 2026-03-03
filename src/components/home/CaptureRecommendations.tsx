"use client";

import { useMemo } from "react";
import { useTeam } from "@/hooks/useTeam";
import { useProgress } from "@/hooks/useProgress";
import { useCaught } from "@/hooks/useCaught";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { GbaPanel } from "@/components/ui/GbaPanel";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { PokemonSprite } from "@/components/ui/PokemonSprite";
import { TYPE_COLORS, STAT_LABELS } from "@/lib/constants";
import { computeCaptureRecommendations } from "@/lib/capture-recommendations";
import type { CatchMode } from "@/lib/capture-recommendations";
import type { PokemonType, Pokemon, Location } from "@/lib/types";
import pokemonData from "../../../data/pokemon.json";
import locationsData from "../../../data/locations.json";

const allPokemon = pokemonData as Pokemon[];
const allLocations = locationsData as Location[];

const GYM_SEQUENCE: { badge: number; type: PokemonType }[] = [
  { badge: 0, type: "grass" },
  { badge: 1, type: "dark" },
  { badge: 2, type: "flying" },
  { badge: 3, type: "normal" },
  { badge: 4, type: "electric" },
  { badge: 5, type: "fighting" },
  { badge: 6, type: "water" },
  { badge: 7, type: "bug" },
];

const MODES: { key: CatchMode; label: string }[] = [
  { key: "balanced", label: "BALANCED" },
  { key: "gym-prep", label: "GYM PREP" },
  { key: "best", label: "BEST" },
];

export function CaptureRecommendations() {
  const { filledSlots, teamTypes } = useTeam();
  const { currentLocation, completedMilestones, badgeCount, isUnlocked } =
    useProgress();
  const { caughtIds } = useCaught();
  const [mode, setMode] = useLocalStorage<CatchMode>(
    "pkm-unbound-catch-mode",
    "balanced"
  );

  const nextGym = badgeCount < 8 ? GYM_SEQUENCE[badgeCount] : null;

  const recommendations = useMemo(() => {
    const teamPokemonIds = filledSlots.map((s) => s.pokemonId);
    const avgLevel =
      filledSlots.length > 0
        ? Math.round(
            filledSlots.reduce((sum, s) => sum + s.level, 0) /
              filledSlots.length
          )
        : 50;

    return computeCaptureRecommendations({
      mode,
      teamTypes,
      teamPokemonIds,
      caughtIds,
      currentLocation,
      locations: allLocations,
      allPokemon,
      completedMilestones,
      isUnlocked,
      gymType: mode === "gym-prep" ? nextGym?.type : undefined,
      avgLevel,
    });
  }, [
    mode,
    teamTypes,
    filledSlots,
    caughtIds,
    currentLocation,
    completedMilestones,
    isUnlocked,
    nextGym,
    badgeCount,
  ]);

  if (filledSlots.length === 0) return null;

  return (
    <GbaPanel title="CATCH THESE" headerColor="bg-gba-green/20 text-gba-green">
      <div className="space-y-3">
        {/* Mode selector */}
        <div className="flex gap-1">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`flex-1 font-pixel text-[7px] py-1 border rounded-sm transition-colors ${
                mode === m.key
                  ? "border-gba-green bg-gba-green/10 text-gba-green"
                  : "border-gba-border text-gba-text-dim hover:border-gba-border-light"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Recommendations */}
        {recommendations.length === 0 ? (
          <div className="text-center py-3">
            <div className="font-pixel text-[8px] text-gba-text-dim">
              {mode === "gym-prep" && badgeCount >= 8
                ? "All badges obtained."
                : "No recommendations available."}
            </div>
            <div className="font-mono text-[9px] text-gba-text-dim/60 mt-1">
              {mode === "gym-prep"
                ? "Switch to BALANCED mode for general suggestions."
                : "Try a different location or mode."}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.pokemon.id}
                rec={rec}
                mode={mode}
                gymType={nextGym?.type}
              />
            ))}
          </div>
        )}
      </div>
    </GbaPanel>
  );
}

function RecommendationCard({
  rec,
  mode,
  gymType,
}: {
  rec: ReturnType<typeof computeCaptureRecommendations>[number];
  mode: CatchMode;
  gymType?: PokemonType;
}) {
  const { pokemon, gapsCovered, bestLocation, nature, moveset } = rec;

  const coverageLabel =
    mode === "gym-prep" && gymType
      ? `strong vs ${gymType.toUpperCase()}`
      : gapsCovered.length > 0
        ? `covers ${gapsCovered.map((t) => t.toUpperCase()).join(", ")} gap${gapsCovered.length > 1 ? "s" : ""}`
        : "";

  return (
    <div className="bg-gba-bg/40 rounded-sm p-2 space-y-1">
      {/* Pokemon header: sprite + name + type badges */}
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
        </div>
        <div className="flex gap-0.5 flex-shrink-0">
          {pokemon.types.map((t) => (
            <TypeBadge key={t} type={t} abbreviated />
          ))}
        </div>
      </div>

      {/* Gap coverage label */}
      {coverageLabel && (
        <div className="font-pixel text-[6px] text-gba-cyan ml-7">
          {coverageLabel}
        </div>
      )}

      {/* Catch location + proximity */}
      <div className="flex items-center gap-1 ml-7">
        <span className="font-mono text-[8px] text-gba-text-dim flex-1 min-w-0 truncate">
          {bestLocation.locationName} ({bestLocation.method})
          {bestLocation.rate > 0 && (
            <span className="text-gba-text-dim/60 ml-1">
              {Math.round(bestLocation.rate)}%
            </span>
          )}
        </span>
        <span
          className={`font-pixel text-[6px] flex-shrink-0 px-1 py-0.5 rounded-sm border ${
            bestLocation.proximity.hops === 0
              ? "text-gba-green border-gba-green/40"
              : bestLocation.proximity.hops <= 1
                ? "text-gba-cyan border-gba-cyan/40"
                : bestLocation.proximity.hops <= 2
                  ? "text-gba-yellow border-gba-yellow/40"
                  : "text-gba-text-dim border-gba-border"
          }`}
        >
          {bestLocation.proximity.label}
        </span>
      </div>

      {/* Nature + moves */}
      <div className="flex items-center gap-1 ml-7 flex-wrap">
        <span className="font-mono text-[7px] text-gba-text-dim">
          {nature.name}
        </span>
        <span className="font-pixel text-[5px] text-gba-text-dim/40">--</span>
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
    </div>
  );
}
