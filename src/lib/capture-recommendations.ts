import type { Pokemon, PokemonType, Location } from "./types";
import { ALL_TYPES } from "./constants";
import { getTeamOffensiveCoverage, getTypeEffectiveness } from "./type-calc";
import { recommendNature, recommendMoveset } from "./recommendations";
import type { NatureRecommendation, MoveRecommendation } from "./recommendations";
import { computeProximityMap, normalizeLocationId } from "./proximity";
import type { ProximityEntry } from "./proximity";

export type CatchMode = "balanced" | "gym-prep" | "best";

interface ModeWeights {
  type: number;
  proximity: number;
  stats: number;
}

const MODE_WEIGHTS: Record<CatchMode, ModeWeights> = {
  balanced: { type: 0.5, proximity: 0.35, stats: 0.15 },
  "gym-prep": { type: 0.5, proximity: 0.3, stats: 0.2 },
  best: { type: 0.35, proximity: 0.25, stats: 0.4 },
};

export interface CatchLocationInfo {
  locationName: string;
  method: string;
  rate: number;
  proximity: ProximityEntry;
}

export interface CaptureRecommendation {
  pokemon: Pokemon;
  score: number;
  typeScore: number;
  proximityScore: number;
  statScore: number;
  gapsCovered: PokemonType[];
  bestLocation: CatchLocationInfo;
  nature: NatureRecommendation;
  moveset: MoveRecommendation[];
}

function computeBst(pokemon: Pokemon): number {
  const s = pokemon.baseStats;
  return s.hp + s.attack + s.defense + s.spAttack + s.spDefense + s.speed;
}

function computeStatScore(pokemon: Pokemon): number {
  return Math.min((computeBst(pokemon) / 600) * 100, 100);
}

/**
 * Compute type score for BALANCED and BEST modes.
 * Score based on how many team coverage gaps this Pokemon's STAB types cover.
 */
function computeTypeScoreForGaps(
  pokemon: Pokemon,
  gaps: PokemonType[]
): { score: number; covered: PokemonType[] } {
  if (gaps.length === 0) return { score: 0, covered: [] };

  const covered: PokemonType[] = [];
  for (const gap of gaps) {
    for (const atkType of pokemon.types) {
      if (getTypeEffectiveness(atkType, gap) > 1) {
        covered.push(gap);
        break;
      }
    }
  }

  const score = (covered.length / Math.max(gaps.length, 1)) * 100;
  return { score, covered };
}

/**
 * Compute type score for GYM PREP mode.
 * Score based on SE effectiveness against the gym type.
 */
function computeTypeScoreForGym(
  pokemon: Pokemon,
  gymType: PokemonType
): { score: number; covered: PokemonType[] } {
  let best = 0;
  for (const atkType of pokemon.types) {
    const eff = getTypeEffectiveness(atkType, gymType);
    if (eff > best) best = eff;
  }

  if (best <= 1) return { score: 0, covered: [] };

  // 2x = 100, 4x = 100 (capped)
  const score = Math.min(best * 50, 100);
  return { score, covered: [gymType] };
}

export interface CaptureRecommendationParams {
  mode: CatchMode;
  teamTypes: PokemonType[][];
  teamPokemonIds: string[];
  caughtIds: Set<string>;
  currentLocation: string;
  locations: Location[];
  allPokemon: Pokemon[];
  completedMilestones: string[];
  isUnlocked: (milestone: string) => boolean;
  gymType?: PokemonType;
  avgLevel?: number;
}

export function computeCaptureRecommendations(
  params: CaptureRecommendationParams
): CaptureRecommendation[] {
  const {
    mode,
    teamTypes,
    teamPokemonIds,
    caughtIds,
    currentLocation,
    locations,
    allPokemon,
    completedMilestones,
    isUnlocked,
    gymType,
    avgLevel = 50,
  } = params;

  const weights = MODE_WEIGHTS[mode];

  // Compute proximity map
  const proximityMap = computeProximityMap(currentLocation, locations);

  // Compute coverage gaps (for BALANCED and BEST modes)
  const coverage = getTeamOffensiveCoverage(teamTypes);
  const gaps = ALL_TYPES.filter((t) => coverage[t] <= 1);

  const teamIdSet = new Set(teamPokemonIds);

  // Filter and score candidates
  const candidates: CaptureRecommendation[] = [];

  for (const pokemon of allPokemon) {
    // Exclusions
    if (teamIdSet.has(pokemon.id)) continue;
    if (caughtIds.has(pokemon.id)) continue;
    if (!isUnlocked(pokemon.milestoneRequired)) continue;

    // Find accessible catch locations with proximity
    const accessibleLocations = pokemon.catchLocations
      .filter((loc) => isUnlocked(loc.milestoneRequired) && loc.locationId !== "unknown")
      .map((loc) => {
        const prox = proximityMap.get(normalizeLocationId(loc.locationId)) ?? {
          hops: Infinity,
          label: "ACCESSIBLE",
          score: 0,
        };
        return {
          locationName: loc.locationName,
          method: loc.method,
          rate: loc.rate,
          proximity: prox,
        };
      });

    if (accessibleLocations.length === 0) continue;

    // Pick the best location (highest proximity score, then highest catch rate)
    accessibleLocations.sort((a, b) => {
      if (a.proximity.score !== b.proximity.score)
        return b.proximity.score - a.proximity.score;
      return b.rate - a.rate;
    });
    const bestLocation = accessibleLocations[0];

    // Compute type score based on mode
    let typeResult: { score: number; covered: PokemonType[] };
    if (mode === "gym-prep" && gymType) {
      typeResult = computeTypeScoreForGym(pokemon, gymType);
    } else {
      typeResult = computeTypeScoreForGaps(pokemon, gaps);
    }

    // Skip if zero type relevance
    if (typeResult.score === 0) continue;

    const typeScore = typeResult.score;
    const proximityScore = bestLocation.proximity.score;
    const statScore = computeStatScore(pokemon);

    const finalScore =
      typeScore * weights.type +
      proximityScore * weights.proximity +
      statScore * weights.stats;

    const nature = recommendNature(pokemon);
    const moveset = recommendMoveset(
      pokemon,
      avgLevel,
      teamTypes,
      completedMilestones
    );

    candidates.push({
      pokemon,
      score: finalScore,
      typeScore,
      proximityScore,
      statScore,
      gapsCovered: typeResult.covered,
      bestLocation,
      nature,
      moveset,
    });
  }

  // Sort by score descending, take top 3
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 3);
}
